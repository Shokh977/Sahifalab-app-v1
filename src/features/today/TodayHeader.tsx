/**
 * Bugun header (Phase 7.5 C1): one 48 px row — the display name (28/34,
 * extra bold, one line) and, on the right, the coin pill, the bell with an
 * unread dot and the avatar (44 px, accent ring, level badge) that opens
 * Profil. No greeting. "oflayn" sits after the name when offline.
 */
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { useAuthStore } from '../../../stores/authStore'
import { useNotificationStore } from '../../../stores/notificationStore'
import { TangaInfoSheet } from '../../../components/dashboard/TangaInfoSheet'
import { useTheme } from '../../design/ThemeProvider'
import { layout, space, avatarSize } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Badge, CoinPill, IconButton, Pressable } from '../../components/ui'
import { RingedAvatar } from '../profile/cosmetics/RingedAvatar'
import { ProPill } from '../pro/ProPill'
import { useMyLookStore } from '../../../stores/myLookStore'
import { uzText } from './today'

export function TodayHeader({ offline }: { offline: boolean; now?: number }) {
  const myRing = useMyLookStore(st => st.ring)
  const isPro = useMyLookStore(st => st.isPro)
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore(s => s.user)
  const unread = useNotificationStore(s => s.unreadCount)
  const [showTanga, setShowTanga] = useState(false)
  const name = uzText(user?.first_name?.trim() || 'doʻstim')

  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.xs }]}>
      <View style={styles.left}>
        <Text style={[typeScale.screenTitle, styles.name, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1.15} accessibilityRole="header">
          {name}
        </Text>
        {isPro && <ProPill small onPress={() => router.push('/(screens)/pro' as any)} />}
        {offline && <Badge kind="status" status="neutral" label="oflayn" />}
      </View>

      <View style={styles.right}>
        {user?.tanga_balance !== undefined && (
          <CoinPill amount={user.tanga_balance} onPress={() => setShowTanga(true)} />
        )}
        <IconButton
          icon={Bell}
          dot={unread > 0}
          accessibilityLabel="Bildirishnomalar"
          onPress={() => router.push('/(tabs)/notifications' as any)}
        />
        <Pressable
          onPress={() => router.push('/(tabs)/profile' as any)}
          accessibilityLabel="Profil"
          style={styles.avatarTarget}
        >
          <RingedAvatar ring={myRing} name={user?.first_name ?? '?'} id={user?.telegram_id} uri={user?.photo_url} diameter={avatarSize.header} level={user?.level} />
        </Pressable>
      </View>

      <TangaInfoSheet visible={showTanga} tangaBalance={user?.tanga_balance ?? 0} onClose={() => setShowTanga(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: space.xs,
    gap: space.sm,
    minHeight: layout.minTouch,
  },
  left: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  name: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2 },
  avatarTarget: { width: layout.minTouch, height: layout.minTouch, alignItems: 'flex-end', justifyContent: 'center' },
})
