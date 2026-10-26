/**
 * Mavzu — pick the app theme (Claude Design "Mavzu tizimi" §5). A 2-column
 * grid of cards, each a mini Bugun in that theme with its decoration;
 * sections Asosiy (Standart, Tun, Zumrad, Sakura) and Mavsumiy (Ramazon,
 * Navro'z). Tapping an unlocked theme applies it at once (the server checks
 * and saves it first: PUT /api/profile/me/look); a locked one opens a sheet
 * with a larger preview and how it opens — it is never applied. Pro themes
 * need Pro; seasonal themes are free for everyone in their season.
 */
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Check, Home, Layers, Lock, Timer, Trophy, GraduationCap } from 'lucide-react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { profile as profileApi, type MyLook } from '../../lib/api'
import { MagicTree } from '../../components/streak/MagicTree'
import { useThemeStore } from '../../stores/themeStore'
import { ThemeProvider, useTheme } from '../../src/design/ThemeProvider'
import { THEMES, type ThemeId } from '../../src/design/themes'
import { layout, radius, space } from '../../src/design/spacing'
import { fonts, type as typeScale } from '../../src/design/typography'
import { AccentFill, Button, Pressable, ScreenHeader, Sheet, ToastHost, showToast } from '../../src/components/ui'
import { ThemeDecor } from '../../src/features/themes/ThemeDecor'
import { THEME_ITEMS } from '../../src/features/profile/cosmetics/cosmetics'
import { PRO_UPGRADE_ENABLED } from '../../src/features/pro/flags'

const MAIN: ThemeId[] = ['standart', 'tun', 'zumrad', 'sakura']
const SEASONAL: ThemeId[] = ['ramazon', 'navroz']
const SEASON_OPENS: Partial<Record<ThemeId, string>> = {
  ramazon: 'Ramazon oyida hamma uchun ochiladi',
  navroz: '1–31 mart kunlari hamma uchun ochiladi',
}

function subtitle(id: ThemeId) {
  if (id === 'standart') return 'Asosiy mavzu'
  if (id === 'ramazon') return 'Ramazon oyida ochiq'
  if (id === 'navroz') return 'Mart oyida ochiq'
  return 'Pro bilan ochiladi'
}

/** A mini Bugun in the surrounding ThemeProvider's theme. */
function MiniBugun({ width }: { width: number }) {
  const { colors, treeTile, progressFill, scheme } = useTheme()
  const tile = width * 0.28
  const gid = `mini${Math.round(width)}`
  return (
    <View style={[styles.mini, { width, backgroundColor: colors.bg }]}>
      <View style={[styles.miniCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ThemeDecor variant="border" radius={12} />
        <View style={styles.miniRow}>
          <View style={[styles.miniTile, { width: tile, height: tile }]}>
            {treeTile && (
              <Svg width={tile} height={tile} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id={gid} cx="50%" cy="45%" r="70%">
                    <Stop offset="0" stopColor={treeTile[0]} />
                    <Stop offset="1" stopColor={treeTile[1]} />
                  </RadialGradient>
                </Defs>
                <Rect width={tile} height={tile} rx={10} fill={`url(#${gid})`} />
              </Svg>
            )}
            <ThemeDecor variant="tile" radius={10} />
            <MagicTree stage={6} size="badge" animate={false} simplified uid={`${gid}${scheme}`} />
          </View>
          <View style={styles.miniText}>
            <Text style={[styles.miniNum, { color: colors.text }]}>73</Text>
            <View style={[styles.miniLine, { backgroundColor: colors.textMuted, width: '70%' }]} />
          </View>
        </View>
        <View style={[styles.miniTrack, { backgroundColor: colors.track }]}>
          <Svg width="70%" height={5}>
            <Rect width="100%" height={5} rx={2.5} fill={progressFill[1]} />
          </Svg>
        </View>
      </View>
      <View style={styles.miniTiles}>
        <View style={[styles.miniAccent, { overflow: 'hidden' }]}>
          <AccentFill radius={10} />
          <Layers size={12} color={colors.onAccent} />
        </View>
        <View style={[styles.miniAccent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Timer size={12} color={colors.textMuted} />
        </View>
      </View>
      <View style={[styles.miniTab, { backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
        <View style={[styles.miniPill, { backgroundColor: colors.accentSoft }]}>
          <Home size={11} color={colors.accentText} />
        </View>
        <Timer size={11} color={colors.textMuted} />
        <GraduationCap size={11} color={colors.textMuted} />
        <Trophy size={11} color={colors.textMuted} />
      </View>
    </View>
  )
}

export default function ThemesScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const themeId = useThemeStore(s => s.themeId)
  const setThemeId = useThemeStore(s => s.setThemeId)
  const [look, setLook] = useState<MyLook | null>(null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState<ThemeId | null>(null)
  const [locked, setLocked] = useState<ThemeId | null>(null)

  useEffect(() => {
    profileApi.getMyLook().then(setLook).catch(() => setOffline(true))
  }, [])

  const unlocked = (id: ThemeId) => id === 'standart' || !!look?.unlocked.theme?.[id]
  const cardW = (width - layout.gutter * 2 - space.sm) / 2

  const choose = async (id: ThemeId) => {
    if (id === themeId) return
    if (!unlocked(id)) { setLocked(id); return }
    setBusy(id)
    try {
      if (!offline) await profileApi.updateMyLook({ theme: id })
      setThemeId(id)
    } catch (e: any) {
      showToast('error', e?.message ?? 'Mavzu saqlanmadi')
    }
    setBusy(null)
  }

  const card = (id: ThemeId) => {
    const on = id === themeId
    const open = unlocked(id)
    const pro = THEME_ITEMS[id].unlock.kind === 'pro'
    return (
      <Pressable
        key={id}
        onPress={() => choose(id)}
        disabled={busy != null}
        accessibilityLabel={`${THEMES[id].name}, ${subtitle(id)}${open ? '' : ', qulflangan'}`}
        accessibilityState={{ selected: on }}
        style={[styles.card, { width: cardW, borderColor: on ? colors.accent : colors.border, borderWidth: on ? 2 : 1, backgroundColor: colors.surface }]}
      >
        <View style={styles.previewWrap}>
          <ThemeProvider themeId={id}>
            <MiniBugun width={cardW - 14} />
          </ThemeProvider>
          {on && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Check size={13} color={colors.onAccent} strokeWidth={3} />
            </View>
          )}
          {!open && (
            <View style={[styles.badge, styles.lock]}>
              <Lock size={12} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          )}
          {!open && pro && (
            <View style={styles.proChip}><Text style={styles.proText}>PRO</Text></View>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{THEMES[id].name}</Text>
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{subtitle(id)}</Text>
      </Pressable>
    )
  }

  const lockedItem = locked ? THEME_ITEMS[locked] : null
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader title="Mavzu" />
      <ScrollView contentContainerStyle={styles.body}>
        {offline && (
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>
            Boshqa mavzular tez orada ochiladi. Hozircha Standart mavzu.
          </Text>
        )}
        <View style={styles.grid}>{MAIN.map(card)}</View>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Mavsumiy</Text>
        <View style={styles.grid}>{SEASONAL.map(card)}</View>
      </ScrollView>

      <Sheet visible={!!locked} onClose={() => setLocked(null)}>
        {locked && lockedItem && (
          <View style={styles.sheet}>
            <View style={styles.sheetPreview}>
              <ThemeProvider themeId={locked}>
                <MiniBugun width={Math.min(width - layout.gutter * 2, 300)} />
              </ThemeProvider>
            </View>
            <View style={styles.titleRow}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{THEMES[locked].name}</Text>
              {lockedItem.unlock.kind === 'pro' && <View style={styles.proChipInline}><Text style={styles.proText}>PRO</Text></View>}
            </View>
            <Text style={[typeScale.body, { color: colors.textMuted }]}>{THEMES[locked].blurb}</Text>
            {lockedItem.unlock.kind === 'pro' ? (
              <>
                <Button
                  label={PRO_UPGRADE_ENABLED ? 'Pro bilan oching' : 'Tez orada'}
                  size="lg" fullWidth disabled onPress={() => {}}
                />
                <Text style={[typeScale.callout, styles.center, { color: colors.textMuted }]}>
                  1, 3 yoki 12 oy · bir martalik toʻlov, avtomatik yangilanmaydi
                </Text>
              </>
            ) : (
              <>
                <Text style={[typeScale.label, { color: colors.text }]}>{SEASON_OPENS[locked]}</Text>
                <Button label="Mavsum boshlanganda" size="lg" fullWidth disabled onPress={() => {}} />
              </>
            )}
            <Button label="Hozircha emas" variant="ghost" fullWidth onPress={() => setLocked(null)} />
          </View>
        )}
      </Sheet>
      <ToastHost />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: layout.gutter, paddingBottom: space.xxl, gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: { borderRadius: 20, padding: 6, paddingBottom: space.sm, gap: 2 },
  previewWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: space.xs },
  name: { fontFamily: fonts.bold, fontSize: 15, paddingHorizontal: 4 },
  badge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lock: { backgroundColor: 'rgba(20,20,24,0.62)' },
  proChip: { position: 'absolute', left: 6, bottom: 6, backgroundColor: '#E4BE68', borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  proChipInline: { backgroundColor: '#E4BE68', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  proText: { color: '#3A2A00', fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.8 },
  mini: { padding: 8, gap: 6 },
  miniCard: { borderRadius: 12, borderWidth: 1, padding: 8, gap: 6 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniTile: { borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  miniText: { flex: 1, gap: 4 },
  miniNum: { fontFamily: fonts.extrabold, fontSize: 20 },
  miniLine: { height: 4, borderRadius: 2, opacity: 0.5 },
  miniTrack: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  miniTiles: { flexDirection: 'row', gap: 6 },
  miniAccent: { flex: 1, height: 30, borderRadius: 10, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 8 },
  miniTab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 26, borderTopWidth: 1, marginHorizontal: -8, marginBottom: -8 },
  miniPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sheet: { gap: space.sm, paddingBottom: space.md },
  sheetPreview: { alignItems: 'center', borderRadius: 18, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 22 },
  center: { textAlign: 'center' },
})
