/**
 * H · a link or notification opened a section Fokus rejimi hides. Mounted
 * once at the root (app/_layout.tsx); openGuarded() fills `blocked`.
 * "Baribir ochish" opens it this once and the mode stays on.
 *
 * Also useFocusModeEnforce: turns the mode off when the free try or Pro
 * runs out while it's on, checked on launch, on return to the app and
 * every minute.
 */
import React, { useEffect } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { EyeOff } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, iconSize, iconStroke, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, Sheet } from '../../components/ui'
import { useMyLookStore } from '../../../stores/myLookStore'
import { useFocusModeStore } from './focusModeStore'
import { tabMeta } from './tabMeta'

const TAB_ROUTES: Record<string, string> = {
  index: '/(tabs)', courses: '/(tabs)/courses', flashcards: '/(tabs)/flashcards', musobaqalar: '/(tabs)/musobaqalar',
}

export function FocusBlockedSheet() {
  const { colors } = useTheme()
  const router = useRouter()
  const blocked = useFocusModeStore(s => s.blocked)
  const close = () => useFocusModeStore.getState().setBlocked(null)
  const meta = blocked ? tabMeta(blocked.section) : null

  const open = (turnOff: boolean) => {
    if (!blocked) return
    const st = useFocusModeStore.getState()
    if (turnOff) st.disable()
    // A hidden tab itself: let the tab bar keep it open this once.
    else if (Object.values(TAB_ROUTES).includes(blocked.route.replace(/\/index$/, ''))) st.setAllowOnce(blocked.section)
    const route = blocked.route
    close()
    setTimeout(() => router.push(route as any), 250)
  }

  return (
    <Sheet visible={!!blocked} onClose={close}>
      {meta && (
        <View style={styles.body}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceRaised }]}>
            <EyeOff size={iconSize.md} color={colors.textMuted} strokeWidth={iconStroke} />
          </View>
          <Text style={[typeScale.title2, { color: colors.text }]} accessibilityRole="header">Bu boʻlim Fokus rejimida yashirilgan</Text>
          <Text style={[typeScale.body, { color: colors.textMuted }]}>Bir marta ochsangiz ham, Fokus rejimi yoniq qoladi.</Text>
          <View style={[styles.target, { backgroundColor: colors.surfaceRaised }]}>
            <meta.Icon size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
            <Text style={[typeScale.headline, { color: colors.text }]}>{meta.label}</Text>
          </View>
          <View style={styles.actions}>
            <Button label="Fokusda qolish" size="lg" fullWidth onPress={close} />
            <Button label="Baribir ochish" variant="secondary" size="lg" fullWidth onPress={() => open(false)} />
            <Button label="Fokus rejimini oʻchirish" variant="ghost" fullWidth onPress={() => open(true)} />
          </View>
        </View>
      )}
    </Sheet>
  )
}

export function useFocusModeEnforce() {
  const isPro = useMyLookStore(s => s.isPro)
  const lookLoaded = useMyLookStore(s => s.loaded)
  useEffect(() => {
    // Until the server has said whether you're Pro, isPro is only a default.
    if (!lookLoaded) return
    const check = () => useFocusModeStore.getState().enforce(isPro)
    check()
    const t = setInterval(check, 60_000)
    const sub = AppState.addEventListener('change', st => { if (st === 'active') check() })
    return () => { clearInterval(t); sub.remove() }
  }, [isPro, lookLoaded])
}

const styles = StyleSheet.create({
  body: { gap: space.sm, paddingBottom: space.md },
  icon: { width: avatarSize.lg - 4, height: avatarSize.lg - 4, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  target: { minHeight: 60, borderRadius: radius.md, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.xs, marginTop: space.sm },
})
