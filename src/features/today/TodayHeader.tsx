/**
 * Bugun header: time-of-day greeting + first name; coin pill, bell with an
 * unread dot, and the avatar that opens Profil. "oflayn" when offline.
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
import { layout, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Avatar, Badge, CoinPill, IconButton, Pressable } from '../../components/ui'
import { greeting, uzText } from './today'

export function TodayHeader({ offline, now }: { offline: boolean; now: number }) {
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
        <View style={styles.greetRow}>
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>{greeting(new Date(now).getHours())},</Text>
          {offline && <Badge kind="status" status="neutral" label="oflayn" />}
        </View>
        <Text style={[typeScale.title1, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
          {name}
        </Text>
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
          <Avatar name={user?.first_name ?? '?'} id={user?.telegram_id} uri={user?.photo_url} size="md" level={user?.level} />
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
    paddingBottom: space.sm,
    gap: space.sm,
  },
  left: { flex: 1, minWidth: 0 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  avatarTarget: { width: layout.minTouch, height: layout.minTouch, alignItems: 'flex-end', justifyContent: 'center' },
})
