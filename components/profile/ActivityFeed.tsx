import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { activity as activityApi } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import type { ActivityItem } from '../../lib/types'

// ── Display map ───────────────────────────────────────────────────────────────

type BgVariant = 'accent' | 'success' | 'warning' | 'blue'

interface DisplayCfg {
  emoji: string
  bg:    BgVariant
  label: (m: Record<string, any> | null) => string
  sub:   (m: Record<string, any> | null) => string | null
}

const DISPLAY: Record<string, DisplayCfg> = {
  course_completed: {
    emoji: '🎓', bg: 'accent',
    label: m => m?.course_title ? `${m.course_title} kursini yakunladi` : 'Kursni yakunladi',
    sub:   () => null,
  },
  certificate_earned: {
    emoji: '🎓', bg: 'accent',
    label: m => m?.course_title ? `${m.course_title} — sertifikat olindi` : 'Sertifikat olindi',
    sub:   () => null,
  },
  test_passed: {
    emoji: '📝', bg: 'success',
    label: m => m?.test_title ?? m?.quiz_title ?? 'Test muvaffaqiyatli topshirildi',
    sub:   m => m?.score != null ? `${m.score}% natija` : null,
  },
  quiz_passed: {
    emoji: '📝', bg: 'success',
    label: m => m?.quiz_title ?? m?.test_title ?? 'Test topshirildi',
    sub:   m => m?.score != null ? `${m.score}% natija` : null,
  },
  streak_milestone: {
    emoji: '🔥', bg: 'warning',
    label: m => m?.days != null ? `${m.days} kunlik seria!` : 'Seria yangilandi',
    sub:   () => null,
  },
  streak_achieved: {
    emoji: '🔥', bg: 'warning',
    label: m => m?.days != null ? `${m.days} kunlik seria!` : 'Seria yangilandi',
    sub:   () => null,
  },
  course_enrolled: {
    emoji: '📚', bg: 'blue',
    label: m => m?.course_title ? `${m.course_title} kursiga yozildi` : 'Kursga yozildi',
    sub:   () => null,
  },
  enrollment: {
    emoji: '📚', bg: 'blue',
    label: m => m?.course_title ? `${m.course_title} kursiga yozildi` : 'Kursga yozildi',
    sub:   () => null,
  },
  level_up: {
    emoji: '⬆️', bg: 'accent',
    label: m => m?.level != null
      ? `Daraja ${m.level}${m.level_name ? ` — ${m.level_name}` : ''}`
      : 'Daraja oshdi',
    sub: () => null,
  },
  achievement_earned: {
    emoji: '🏆', bg: 'accent',
    label: m => {
      const raw = m?.achievement_name ?? m?.name
      if (!raw) return "Yutuq qo'lga kiritildi"
      // prettify snake_case badge keys: "first_login" → "First login"
      return raw.includes('_')
        ? raw.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
        : raw
    },
    sub: () => null,
  },
  badge_earned: {
    emoji: '🏆', bg: 'accent',
    label: m => {
      const raw = m?.achievement_name ?? m?.name
      if (!raw) return "Yutuq qo'lga kiritildi"
      return raw.includes('_')
        ? raw.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
        : raw
    },
    sub: () => null,
  },
}

function resolve(type: string, meta: Record<string, any> | null) {
  const cfg = DISPLAY[type]
  if (!cfg) return { emoji: '📌', bg: 'accent' as BgVariant, label: type.replace(/_/g, ' '), sub: null }
  return { emoji: cfg.emoji, bg: cfg.bg, label: cfg.label(meta), sub: cfg.sub(meta) }
}

// ── Relative timestamp ────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)  return mins <= 1 ? 'Hozirgina' : `${mins} daqiqa oldin`
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours} soat oldin`
  const days = Math.floor(diff / 86_400_000)
  if (days === 1) return 'Kecha'
  if (days < 7)   return `${days} kun oldin`
  if (days < 30)  return `${Math.floor(days / 7)} hafta oldin`
  const d  = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

// ── Single row ────────────────────────────────────────────────────────────────

function Row({ item, c }: { item: ActivityItem; c: any }) {
  const { emoji, bg, label, sub } = resolve(item.activity_type, item.metadata)

  const circleBg =
    bg === 'success' ? c.successMuted
    : bg === 'warning' ? c.warningMuted
    : bg === 'blue'    ? 'rgba(77,166,255,0.12)'
    : c.accentPrimaryMuted

  return (
    <View style={styles.row}>
      <View style={[styles.circle, { backgroundColor: circleBg }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      <View style={styles.textCol}>
        <Text
          style={[styles.label, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {sub && (
          <Text style={[styles.sub, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {sub}
          </Text>
        )}
      </View>

      <Text style={[styles.time, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
        {relTime(item.created_at)}
      </Text>
    </View>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE = 20

interface Props {
  isOwnProfile:  boolean
  initialItems?: ActivityItem[]
}

export function ActivityFeed({ isOwnProfile, initialItems = [] }: Props) {
  const { c } = useTheme()

  const [items,   setItems]   = useState<ActivityItem[]>([])
  const [offset,  setOffset]  = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)

  const fetchPage = useCallback(async (off: number) => {
    setLoading(true)
    try {
      const res = await activityApi.list(PAGE, off)
      if (off === 0) setItems(res.items)
      else           setItems(prev => [...prev, ...res.items])
      setOffset(off + res.items.length)
      setHasMore(res.has_more)
    } catch {}
    setLoading(false)
    setReady(true)
  }, [])

  useEffect(() => {
    if (isOwnProfile) {
      fetchPage(0)
    } else {
      setItems(initialItems)
      setReady(true)
    }
  }, [isOwnProfile])

  const display = isOwnProfile ? items : initialItems

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accentPrimary} />
      </View>
    )
  }

  if (display.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.empty, { color: c.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          Hali faollik yo'q
        </Text>
      </View>
    )
  }

  return (
    <View>
      {display.map((item, idx) => (
        <React.Fragment key={item.id}>
          {idx > 0 && <View style={[styles.sep, { backgroundColor: c.border }]} />}
          <Row item={item} c={c} />
        </React.Fragment>
      ))}

      {isOwnProfile && hasMore && (
        <Pressable
          onPress={() => !loading && fetchPage(offset)}
          style={[styles.loadMore, { borderColor: c.border }]}
        >
          {loading
            ? <ActivityIndicator size="small" color={c.accentPrimary} />
            : <Text style={[styles.loadMoreText, { color: c.textSecondary, fontFamily: typography.fontFamily.medium }]}>
                Ko'proq yuklash
              </Text>
          }
        </Pressable>
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.base,
  },

  circle: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  emoji: {
    fontSize:   20,
    lineHeight: 24,
  },

  textCol: {
    flex: 1,
    gap:  2,
  },
  label: {
    fontSize:   13,
    lineHeight: 18,
  },
  sub: {
    fontSize: 11,
  },

  time: {
    fontSize:  11,
    flexShrink: 0,
    textAlign: 'right',
    maxWidth:  80,
  },

  sep: {
    height: StyleSheet.hairlineWidth,
  },

  center: {
    paddingVertical: spacing['2xl'],
    alignItems:      'center',
  },
  empty: {
    fontSize: typography.size.sm,
  },

  loadMore: {
    marginTop:         spacing.sm,
    marginHorizontal:  spacing.base,
    paddingVertical:   spacing.md,
    borderRadius:      radius['2xl'],
    borderWidth:       1,
    alignItems:        'center',
  },
  loadMoreText: {
    fontSize: typography.size.sm,
  },
})
