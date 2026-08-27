import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Sparkles, Timer, Flame, Target, BookOpen, ListChecks, Zap } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { ai as aiApi } from '../../lib/api'
import type { WeeklyReview, WeeklyReviewStats } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import { WEEKLY_REVIEW_SEEN_KEY } from '../../components/dashboard/BugunGrid/WeeklyReviewGridCard'

function fmtWeekStart(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  return `${d} ${months[m - 1]}`
}

const UZ_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return UZ_DAYS[(dow + 6) % 7]
}

// ── Compact weekly bar chart — same idiom as weekly-report.tsx's WeeklyBars,
// one hue (accent), goal-met days full-strength, others dimmed. Single
// series, so no legend needed; the "XULOSA" card above already names it.
const BAR_MAX_H = 56

function WeeklyBars({ days, accent, barBg }: { days: WeeklyReviewStats['days']; accent: string; barBg: string }) {
  const maxMin = Math.max(...days.map(d => d.minutes), 1)
  const anims  = useRef(days.map(() => new Animated.Value(0))).current

  useEffect(() => {
    Animated.stagger(50, days.map((d, i) =>
      Animated.spring(anims[i], { toValue: d.minutes / maxMin, useNativeDriver: false, tension: 80, friction: 10 }),
    )).start()
  }, [])

  return (
    <View style={bars.row}>
      {days.map((d, i) => {
        const barH = anims[i].interpolate({ inputRange: [0, 1], outputRange: [3, BAR_MAX_H] })
        const color = d.goal_met ? accent : (d.minutes > 0 ? accent + 'AA' : barBg)
        return (
          <View key={d.date} style={bars.col}>
            <View style={[bars.track, { height: BAR_MAX_H, backgroundColor: barBg }]}>
              <Animated.View style={[bars.fill, { height: barH, backgroundColor: color }]} />
            </View>
            <Text style={[bars.label, { color: '#9c9ca6' }]}>{dayLabel(d.date)}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ── Stat tile — value wears the text-primary token, never the accent
// color; the icon carries identity, matching this app's existing tile
// components elsewhere (never color-as-the-only-signal).
function StatTile({ Icon, color, label, value, sub, textPrimary, textMuted, bg, border }: {
  Icon: React.ComponentType<any>; color: string; label: string; value: string; sub?: string
  textPrimary: string; textMuted: string; bg: string; border: string
}) {
  return (
    <View style={[tiles.tile, { backgroundColor: bg, borderColor: border }]}>
      <View style={[tiles.iconWrap, { backgroundColor: color + '1a' }]}>
        <Icon size={15} color={color} />
      </View>
      <Text style={[tiles.value, { color: textPrimary, fontFamily: typography.fontFamily.bold }]}>{value}</Text>
      <Text style={[tiles.label, { color: textMuted, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text style={[tiles.sub, { color: textMuted, fontFamily: typography.fontFamily.regular }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  )
}

const FEATURE_ROUTE: Record<string, string> = {
  flashcards: '/(tabs)/flashcards',
  courses:    '/(tabs)/courses',
}

// ── Chart + stat-tile grid — shared between the full narrative view (once
// this week's AI review is ready) and the in-progress view (live numbers
// while waiting for the cron-staggered batch to reach this user).
function StatsSection({ stats, accent, c }: { stats: WeeklyReviewStats; accent: string; c: any }) {
  const pctChange = stats.prev_week_minutes > 0
    ? Math.round((stats.this_week_minutes - stats.prev_week_minutes) / stats.prev_week_minutes * 100)
    : null

  return (
    <>
      <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={s.chartHeader}>
          <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            HAFTALIK FAOLLIK
          </Text>
          {pctChange !== null && (
            <Text style={[
              s.pctChange,
              { color: pctChange >= 0 ? '#22C55E' : c.textMuted, fontFamily: typography.fontFamily.semibold },
            ]}>
              {pctChange >= 0 ? '+' : ''}{pctChange}%
            </Text>
          )}
        </View>
        {stats.days.length > 0 ? (
          <WeeklyBars days={stats.days} accent={accent} barBg={c.bgTertiary} />
        ) : (
          <Text style={[s.stateBody, { color: c.textMuted, textAlign: 'left', marginTop: 4 }]}>
            Bu hafta hali faollik yo'q
          </Text>
        )}
      </View>

      <Text style={[s.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
        TO'LIQ STATISTIKA
      </Text>
      <View style={tiles.grid}>
        <StatTile
          Icon={Timer} color={accent} label="Bu hafta"
          value={`${stats.this_week_minutes} daq`}
          sub={`${stats.days_active} kun faol`}
          textPrimary={c.textPrimary} textMuted={c.textMuted} bg={c.bgSecondary} border={c.border}
        />
        <StatTile
          Icon={Zap} color="#F59E0B" label="XP"
          value={`+${stats.week_xp}`}
          sub="shu hafta"
          textPrimary={c.textPrimary} textMuted={c.textMuted} bg={c.bgSecondary} border={c.border}
        />
        <StatTile
          Icon={Flame} color="#FF4500" label="Seriya"
          value={`${stats.streak_days} kun`}
          textPrimary={c.textPrimary} textMuted={c.textMuted} bg={c.bgSecondary} border={c.border}
        />
        <StatTile
          Icon={Target} color="#4DA6FF" label="Flashcard aniqlik"
          value={stats.flashcard_accuracy_pct !== null ? `${stats.flashcard_accuracy_pct}%` : '—'}
          sub={`${stats.flashcard_reviews_this_week} ta takrorlash`}
          textPrimary={c.textPrimary} textMuted={c.textMuted} bg={c.bgSecondary} border={c.border}
        />
        <StatTile
          Icon={BookOpen} color="#A855F7" label="Kurslar"
          value={String(stats.courses_enrolled_count)}
          sub={`${stats.lessons_completed_this_week} ta dars (hafta)`}
          textPrimary={c.textPrimary} textMuted={c.textMuted} bg={c.bgSecondary} border={c.border}
        />
        <StatTile
          Icon={ListChecks} color="#22C55E" label="Testlar"
          value={`${stats.quiz_attempts_this_week} ta`}
          sub="shu hafta"
          textPrimary={c.textPrimary} textMuted={c.textMuted} bg={c.bgSecondary} border={c.border}
        />
      </View>
    </>
  )
}

export default function WeeklyReviewScreen() {
  const { c } = useTheme()
  const router = useRouter()
  const accent = c.accentPrimary

  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [liveStats, setLiveStats] = useState<WeeklyReviewStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await aiApi.weeklyReview()
      setReview(res.review)
      setLiveStats(res.live_stats)
      // Marks this review as seen for the dashboard's WeeklyReviewGridCard
      // unread dot — recorded here (the actual review screen), not on the
      // dashboard card itself, so glancing at the card never counts as read.
      if (res.review) {
        AsyncStorage.setItem(WEEKLY_REVIEW_SEEN_KEY, res.review.week_start).catch(() => {})
      }
    } catch (e: any) {
      setError(e?.message ?? "Yuklab bo'lmadi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[s.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))} hitSlop={12} style={s.navBtn}>
          <ChevronLeft size={24} color={accent} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Haftalik sharh
        </Text>
        <View style={s.navBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.stateIcon}>⚠️</Text>
          <Text style={[s.stateTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Yuklab bo'lmadi
          </Text>
          <Text style={[s.stateBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {error}
          </Text>
          <Pressable onPress={load} style={[s.retryBtn, { backgroundColor: accent }]}>
            <Text style={[s.retryText, { fontFamily: typography.fontFamily.semibold }]}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : !review && !liveStats ? (
        <View style={s.center}>
          <Text style={s.stateIcon}>🌱</Text>
          <Text style={[s.stateTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Hali sharh yo'q
          </Text>
          <Text style={[s.stateBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Har hafta sizning haqiqiy natijalaringiz asosida shaxsiy sharh tayyorlanadi.{'\n'}
            Birinchi sharh shu hafta oxirigacha tayyor bo'ladi — o'qishni davom eting.
          </Text>
        </View>
      ) : liveStats ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.freeBadge, { backgroundColor: accent + '1a', borderColor: accent + '44' }]}>
            <Sparkles size={13} color={accent} />
            <Text style={[s.freeBadgeText, { color: accent, fontFamily: typography.fontFamily.semibold }]}>
              Har doim bepul
            </Text>
          </View>

          <Text style={[s.weekLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Joriy hafta
          </Text>

          <Text style={[s.headline, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            Sharh tayyorlanmoqda
          </Text>

          <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
              MA'LUMOT
            </Text>
            <Text style={[s.cardBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Sun'iy intellekt tahlili va shaxsiy tavsiya hafta oxirigacha tayyor bo'ladi.
              Hozircha shu haftadagi haqiqiy faolligingiz pastda — raqamlar real vaqtda yangilanib boradi.
            </Text>
          </View>

          <StatsSection stats={liveStats} accent={accent} c={c} />
        </ScrollView>
      ) : review ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.freeBadge, { backgroundColor: accent + '1a', borderColor: accent + '44' }]}>
            <Sparkles size={13} color={accent} />
            <Text style={[s.freeBadgeText, { color: accent, fontFamily: typography.fontFamily.semibold }]}>
              Har doim bepul
            </Text>
          </View>

          <Text style={[s.weekLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {fmtWeekStart(review.week_start)} haftasi
          </Text>

          <Text style={[s.headline, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {review.headline}
          </Text>

          <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
              XULOSA
            </Text>
            <Text style={[s.cardBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {review.summary}
            </Text>
          </View>

          {review.stats && <StatsSection stats={review.stats} accent={accent} c={c} />}

          {/* Feature spotlight — distinct treatment so it reads as a
              call-to-action, not more narrative text. */}
          {review.feature_spotlight && (
            <Pressable
              disabled={!review.feature_spotlight_key || !FEATURE_ROUTE[review.feature_spotlight_key]}
              onPress={() => {
                const route = review.feature_spotlight_key ? FEATURE_ROUTE[review.feature_spotlight_key] : undefined
                if (route) router.push(route as any)
              }}
              style={[s.spotlightCard, { backgroundColor: '#A855F70d', borderColor: '#A855F733' }]}
            >
              <Text style={s.spotlightEmoji}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.spotlightTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  {review.feature_spotlight.title}
                </Text>
                <Text style={[s.spotlightBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {review.feature_spotlight.body}
                </Text>
              </View>
              {review.feature_spotlight_key && FEATURE_ROUTE[review.feature_spotlight_key] && (
                <ChevronRight size={18} color="#A855F7" />
              )}
            </Pressable>
          )}

          <View style={[s.card, { backgroundColor: accent + '0d', borderColor: accent + '33' }]}>
            <Text style={[s.cardLabel, { color: accent, fontFamily: typography.fontFamily.semibold }]}>
              TAVSIYA
            </Text>
            <Text style={[s.cardBody, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
              {review.recommendation}
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
    paddingVertical:   spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: spacing.xl },
  stateIcon:  { fontSize: 40 },
  stateTitle: { fontSize: 16 },
  stateBody:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:   { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.full },
  retryText:  { color: '#fff', fontSize: 14 },

  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  freeBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                4,
    alignSelf:          'flex-start',
    paddingHorizontal:  10,
    paddingVertical:    5,
    borderRadius:       radius.full,
    borderWidth:         1,
  },
  freeBadgeText: { fontSize: 11 },
  weekLabel: { fontSize: 12, marginTop: spacing.xs },
  headline:  { fontSize: 22, lineHeight: 28 },
  card: {
    borderRadius:      radius.cardLg,
    borderWidth:        1,
    padding:            spacing.lg,
    gap:                6,
  },
  cardLabel: { fontSize: 11, letterSpacing: 0.5 },
  cardBody:  { fontSize: 14, lineHeight: 21 },

  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctChange:   { fontSize: 12 },

  sectionLabel: { fontSize: 11, letterSpacing: 0.5, marginTop: spacing.xs },

  spotlightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.cardLg, borderWidth: 1.5, padding: spacing.lg,
  },
  spotlightEmoji: { fontSize: 22 },
  spotlightTitle: { fontSize: 14, marginBottom: 3 },
  spotlightBody:  { fontSize: 13, lineHeight: 19 },
})

const bars = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 4 },
  col:   { alignItems: 'center', gap: 6, flex: 1 },
  track: { width: 14, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  fill:  { width: '100%', borderRadius: 7 },
  label: { fontSize: 10 },
})

const tiles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '47%', borderRadius: radius.cardLg, borderWidth: 1,
    padding: spacing.md, gap: 4,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  value: { fontSize: 17 },
  label: { fontSize: 11 },
  sub:   { fontSize: 10 },
})
