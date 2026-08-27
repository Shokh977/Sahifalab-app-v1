import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { NotebookPen } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../../hooks/useTheme'
import { typography, radius } from '../../../lib/constants'
import { ai as aiApi } from '../../../lib/api'
import { GridCard } from './GridCard'

const GREEN = '#37B457'
const GREEN_MUTED = '#2B4234'
const GREEN_MUTED_LIGHT = '#CDEBD5'

// Shared with weekly-review.tsx, which writes this key the moment a review
// actually gets opened — this card only reads it.
export const WEEKLY_REVIEW_SEEN_KEY = 'sahifalab_weekly_review_seen_v1'

export function WeeklyReviewGridCard({ staggerIndex }: { staggerIndex: number }) {
  const { c, theme } = useTheme()
  const router = useRouter()
  const [days, setDays] = useState<{ minutes: number }[]>([])
  const [unread, setUnread] = useState(false)

  useEffect(() => {
    let cancelled = false
    aiApi.weeklyReview().then(async res => {
      if (cancelled) return
      const source = res.review?.stats.days ?? res.live_stats?.days ?? []
      setDays(source.slice(-5))
      if (res.review) {
        const seen = await AsyncStorage.getItem(WEEKLY_REVIEW_SEEN_KEY).catch(() => null)
        setUnread(seen !== res.review.week_start)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const maxMinutes = Math.max(...days.map(d => d.minutes), 1)
  const greenStrong = theme === 'dark' ? GREEN : '#2FA84F'
  const greenTint = theme === 'dark' ? 'rgba(55,180,87,0.18)' : '#E8F7EC'
  const greenMuted = theme === 'dark' ? GREEN_MUTED : GREEN_MUTED_LIGHT

  return (
    <GridCard
      staggerIndex={staggerIndex}
      bg={c.bgSecondary}
      borderColor={c.border}
      onPress={() => router.push('/(screens)/weekly-review' as any)}
      accessibilityLabel={`Haftalik sharh, shaxsiy AI tahlili, bepul${unread ? ', yangi' : ''}`}
      style={{ position: 'relative' }}
    >
      {unread && <View style={styles.unreadDot} />}

      <View style={styles.topRow}>
        <View style={[styles.iconTile, { backgroundColor: greenTint }]}>
          <NotebookPen size={16} color={greenStrong} />
        </View>
        <View style={[styles.badge, { backgroundColor: greenTint }]}>
          <Text style={[styles.badgeText, { color: greenStrong, fontFamily: typography.fontFamily.bold }]}>BEPUL</Text>
        </View>
      </View>

      <View>
        <Text numberOfLines={2} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Haftalik sharh
        </Text>
        <Text numberOfLines={1} style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>
          Shaxsiy AI tahlili
        </Text>
      </View>

      {days.length > 0 && (
        <View style={styles.chartRow}>
          {days.map((d, i) => {
            const isRecent = i >= days.length - 2
            const heightPct = Math.max(0.12, d.minutes / maxMinutes)
            return (
              <View key={i} style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${Math.round(heightPct * 100)}%`, backgroundColor: isRecent ? greenStrong : greenMuted },
                  ]}
                />
              </View>
            )
          })}
        </View>
      )}
    </GridCard>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconTile: { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9 },
  title: { fontSize: 14 },
  sub: { fontSize: 11, marginTop: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 },
  chartTrack: { flex: 1, height: 18, justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 2 },
  unreadDot: {
    position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#F0A32B', zIndex: 1,
  },
})
