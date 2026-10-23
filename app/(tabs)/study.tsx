import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
} from 'react-native-reanimated'

import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { profile, focusStats } from '../../lib/api'
import type { FocusStats } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'

import { MonthlyHeatmap } from '../../components/study/MonthlyHeatmap'
import type { HeatmapDay } from '../../lib/api'
import { ProfileAvatarButton } from '../../components/layout/ProfileAvatarButton'
import { Sparkles, ChevronRight } from 'lucide-react-native'
import { useTheme as useDesignTheme } from '../../src/design/ThemeProvider'
import { tabular, type as typeScale } from '../../src/design/typography'
import { layout, space } from '../../src/design/spacing'
import { durations } from '../../src/design/motion'
import { SegmentedControl, Sheet } from '../../src/components/ui'
import { FocusTimer } from '../../src/features/focus/FocusTimer'
import { displayXp } from '../../src/features/focus/timerMath'

// ── Stats screen ──────────────────────────────────────────────────────────────


function StatsScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const user   = useAuthStore(s => s.user)

  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([])
  const [heatmapDays, setHeatmapDays] = useState<7 | 30 | 90>(90)
  const [stats,       setStats]       = useState<FocusStats | null>(null)
  const [loading,     setLoading]     = useState(true)

  const heatmapOpacity = useSharedValue(1)
  const heatmapAnimStyle = useAnimatedStyle(() => ({ opacity: heatmapOpacity.value }))

  useEffect(() => {
    ;(async () => {
      const [h, s] = await Promise.allSettled([
        user?.telegram_id ? profile.getHeatmap(user.telegram_id, 90) : Promise.resolve([]),
        focusStats.get(),
      ])
      if (h.status === 'fulfilled') setHeatmapData(h.value ?? [])
      if (s.status === 'fulfilled') setStats(s.value)
      setLoading(false)
    })()
  }, [])

  const handleHeatmapFilter = useCallback((days: 7 | 30 | 90) => {
    if (!user?.telegram_id || days === heatmapDays) return
    const fetchAndSwap = async () => {
      try {
        const data = await profile.getHeatmap(user.telegram_id!, days)
        setHeatmapData(data ?? [])
      } catch {}
      setHeatmapDays(days)
      heatmapOpacity.value = withTiming(1, { duration: durations.fade })
    }
    heatmapOpacity.value = withTiming(0, { duration: durations.fast }, () => runOnJS(fetchAndSwap)())
  }, [user?.telegram_id, heatmapDays])

  if (loading) {
    return (
      <View style={styles.statsLoader}>
        <ActivityIndicator color={c.accentPrimary} size="large" />
      </View>
    )
  }

  const totalHours    = ((stats?.total_focus_minutes ?? 0) / 60).toFixed(1)
  const sessionsCount = stats?.sessions_count ?? 0
  const longestStreak = stats?.longest_streak ?? 0
  const currentStreak = stats?.streak_days ?? 0

  return (
    <ScrollView
      contentContainerStyle={styles.statsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Overview stats grid ────────────────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {totalHours}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Jami soatlar
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {sessionsCount}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Jami sessiyalar
          </Text>
        </View>

        <Pressable
          style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
          onPress={() => router.push('/(screens)/streak-detail' as any)}
        >
          <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {longestStreak}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Eng uzun seriya
          </Text>
        </Pressable>

        <Pressable
          style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
          onPress={() => router.push('/(screens)/streak-detail' as any)}
        >
          <View style={styles.streakRow}>
            <Text style={[styles.statNum, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
              {currentStreak}
            </Text>
            <Text style={styles.flameEmoji}>🔥</Text>
          </View>
          <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Hozirgi seriya
          </Text>
        </Pressable>
      </View>

      {/* ── Heatmap ────────────────────────────────────────────────────────── */}
      <View style={[styles.sectionCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        {/* Header row: title + filter pills */}
        <View style={styles.heatmapHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Faollik
          </Text>
          <View style={styles.heatmapFilters}>
            {([7, 30, 90] as const).map(d => {
              const active = heatmapDays === d
              const label  = d === 7 ? '1 hafta' : d === 30 ? '1 oy' : '90 kun'
              return (
                <Pressable
                  key={d}
                  onPress={() => handleHeatmapFilter(d)}
                  style={[
                    styles.heatmapFilterPill,
                    { backgroundColor: active ? c.accentPrimary : c.bgTertiary },
                  ]}
                >
                  <Text style={[
                    styles.heatmapFilterText,
                    { color: active ? c.textInverse : c.textSecondary, fontFamily: typography.fontFamily.medium },
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <Animated.View style={heatmapAnimStyle}>
          <MonthlyHeatmap data={heatmapData} days={heatmapDays} />
        </Animated.View>
      </View>

      {/* ── Weekly AI review link — this week's chart + full stat grid + AI
          narrative all live on that one screen now, not duplicated here. ── */}
      <Pressable
        onPress={() => router.push('/(screens)/weekly-review' as any)}
        style={({ pressed }) => [
          styles.sectionCard,
          styles.reportRow,
          { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.reportLeft}>
          <Sparkles size={18} color={c.textSecondary} strokeWidth={1.8} />
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Haftalik sharh
          </Text>
        </View>
        <ChevronRight size={16} color={c.textMuted} strokeWidth={1.8} />
      </Pressable>

    </ScrollView>
  )
}

// ── Root tab screen ───────────────────────────────────────────────────────────

export default function StudyTab() {
  const { c }    = useTheme()
  const { colors } = useDesignTheme()
  const insets   = useSafeAreaInsets()

  const [activeIndex,   setActiveIndex]   = useState(0)
  const [showTimerInfo, setShowTimerInfo] = useState(false)
  // Header counter: today's XP (the focus-complete XP flies here).
  const todayMinutes = useDashboardStore(s => s.data?.focusStats.today_minutes ?? 0)

  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: c.borderSubtle }]}>
        <View style={styles.topBarAvatarSlot}>
          <ProfileAvatarButton size={28} />
        </View>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          Fokus
        </Text>
        <View style={styles.topBarRight}>
          <Text
            style={[typeScale.callout, tabular, { color: colors.accentText }]}
            accessibilityLabel={`Bugun ${displayXp(todayMinutes)} XP`}
          >
            +{displayXp(todayMinutes)} XP
          </Text>
          {activeIndex === 0 && (
            <Pressable
              onPress={() => setShowTimerInfo(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Fokus taymer haqida"
              style={({ pressed }) => [
                styles.infoCircleBtn,
                { borderColor: c.border, backgroundColor: pressed ? c.bgTertiary : 'transparent' },
              ]}
            >
              <Text style={[typeScale.callout, { color: c.textSecondary, fontFamily: typography.fontFamily.bold }]}>
                i
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <SegmentedControl
        size="md"
        segments={['Taymer', 'Statistika']}
        index={activeIndex}
        onChange={setActiveIndex}
        style={styles.segments}
      />

      {/* Both pages stay mounted: the timer keeps its state while Statistika is shown. */}
      <View style={[styles.page, activeIndex !== 0 && styles.hidden]}><FocusTimer /></View>
      <View style={[styles.page, activeIndex !== 1 && styles.hidden]}><StatsScreen /></View>

      {/* ── Timer info modal ───────────────────────────────────────────────── */}
      <Sheet visible={showTimerInfo} onClose={() => setShowTimerInfo(false)} scroll>
          <View style={styles.fcInfoContent}>

            <Text style={[styles.fcInfoTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Fokus taymer nima?
            </Text>
            <Text style={[styles.fcInfoBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Fokus taymer — chalg'itmasdan chuqur o'qishga yordam beradigan vaqt boshqaruv usuli. Belgilangan vaqt ichida faqat bir ishga diqqat jamlaysiz, keyin qisqa dam olasiz.
            </Text>

            <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Nima uchun foydali?
            </Text>
            {[
              { icon: '🎯', title: 'Chuqur diqqat', desc: 'Vaqt chegarasi borligi sababli miyangiz faqat bir ishga to\'liq yopishadi va chalg\'ish kamayadi.' },
              { icon: '🔥', title: 'Seriya va odatlar', desc: 'Har kuni o\'qish odatini shakllantiradi. Uzilmagan kunlar seriyasi motivatsiyani oshiradi.' },
              { icon: '⭐', title: 'XP va daraja', desc: 'Har bir tugatilgan sessiya uchun tajriba ballari (XP) olasiz va darajangiz o\'sadi.' },
              { icon: '📊', title: 'Taraqqiyotni ko\'rish', desc: 'Haftalik grafik va issiqlik xaritasida o\'qish odatingizning rivojlanishini kuzatasiz.' },
            ].map(item => (
              <View key={item.title} style={styles.fcInfoBenefit}>
                <Text style={typeScale.title2}>{item.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }]}>
                    {item.title}
                  </Text>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: 18 }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}

            <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Qanday ishlatish kerak?
            </Text>
            {[
              { n: '1', text: 'Vaqtni tanlang — 15, 25, 45 yoki 60 daqiqa. Yoki "Boshqa" tugmasidan o\'zingiz kiriting (5–180 daqiqa).' },
              { n: '2', text: 'Sessiyalar sonini belgilang (1×, 2×, 3× yoki 4×) — bir o\'tirishda necha marta fokuslanmoqchi ekanligingizga qarab.' },
              { n: '3', text: 'Play tugmasini bosing va faqat o\'qishga e\'tibor bering.' },
              { n: '4', text: 'Sessiya tugagach avtomatik tanaffus boshlanadi. Dam olish vaqtida haqiqatan dam oling.' },
              { n: '5', text: 'Barcha sessiyalar tugagach natijalar ko\'rsatiladi: vaqt, XP va bugungi statistika yangilanadi.' },
            ].map(step => (
              <View key={step.n} style={styles.fcInfoStep}>
                <View style={[styles.fcInfoStepBadge, { backgroundColor: c.accentPrimary }]}>
                  <Text style={[typeScale.callout, { color: c.textInverse, fontFamily: typography.fontFamily.bold }]}>{step.n}</Text>
                </View>
                <Text style={[{ flex: 1, color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, lineHeight: 20 }]}>
                  {step.text}
                </Text>
              </View>
            ))}

            <View style={[styles.fcInfoDivider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[styles.fcInfoSection, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              Qo'shimcha imkoniyatlar
            </Text>
            {[
              { icon: '🎵', title: "Muhit tovushlari", desc: "Yomg'ir, qahvaxona, tabiat va boshqa ambient tovushlar diqqatni jamlashga yordam beradi." },
              { icon: '👥', title: "Birga o'qish", desc: "Hozir nechi kishi o'qiyotganligi ko'rinadi — bu umumiy motivatsiya hissini beradi." },
            ].map(item => (
              <View key={item.title} style={styles.fcInfoBenefit}>
                <Text style={typeScale.title2}>{item.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ color: c.textPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm }]}>
                    {item.title}
                  </Text>
                  <Text style={[{ color: c.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, lineHeight: 18 }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}

          </View>

          <Pressable
            onPress={() => setShowTimerInfo(false)}
            style={({ pressed }) => [styles.fcInfoClose, { backgroundColor: c.accentPrimary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[{ color: c.textInverse, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }]}>
              Tushunarli
            </Text>
          </Pressable>
      </Sheet>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1 },

  topBar: {
    height:            52,
    alignItems:        'center',
    justifyContent:    'center',
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: typography.size.lg },
  topBarAvatarSlot: {
    position: 'absolute',
    left:     spacing.screenMargin,
  },

  topBarRight: {
    position:      'absolute',
    right:         spacing.screenMargin,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space.sm,
  },
  segments: { marginHorizontal: layout.gutter, marginTop: space.sm },
  page:     { flex: 1 },
  hidden:   { display: 'none' },

  statsLoader:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsContent: { padding: spacing.screenMargin, gap: spacing.base, paddingBottom: 80 },
  reportRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportLeft:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  sectionCard: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  sectionTitle: { fontSize: typography.size.base },

  heatmapHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.xs,
  },
  heatmapFilters: {
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  heatmapFilterPill: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      radius.full,
  },
  heatmapFilterText: { fontSize: typography.size.xs },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flexBasis: '47%', flexGrow: 1,
    borderRadius: radius.cardLg, borderWidth: 1,
    padding: spacing.base, alignItems: 'center', gap: 4,
  },
  statNum:     { fontSize: typography.size.xl },
  statLabel:   { fontSize: typography.size.xs, textAlign: 'center' },
  streakRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flameEmoji:  { ...typeScale.callout },

  // Info button + modal (shared by timer/stats info sheets)
  infoCircleBtn: {
    width:          26,
    height:         26,
    borderRadius:   13,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  fcInfoContent: { gap: 18, paddingBottom: 8 },
  fcInfoTitle: {
    fontSize: typography.size.xl,
  },
  fcInfoBody: {
    fontSize:   typography.size.sm,
    lineHeight: 22,
  },
  fcInfoSection: {
    fontSize: typography.size.base,
  },
  fcInfoDivider: {
    height: 1,
  },
  fcInfoBenefit: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           12,
  },
  fcInfoStep: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
  },
  fcInfoStepBadge: {
    width:          22,
    height:         22,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      1,
  },
  fcInfoClose: {
    height:         52,
    borderRadius:   radius.button,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      spacing.base,
  },
})
