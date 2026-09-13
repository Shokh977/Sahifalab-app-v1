import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Animated, LayoutChangeEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Sparkles, Timer, Flame, Target, BookOpen, ListChecks, Zap, Trophy } from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { ai as aiApi } from '../../lib/api'
import type { WeeklyReview, WeeklyReviewStats, CurrentWeekProgress } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import { WEEKLY_REVIEW_SEEN_KEY } from '../../components/dashboard/BugunGrid/WeeklyReviewGridCard'

function fmtWeekStart(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  return `${d} ${months[m - 1]}`
}

const UZ_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const UZ_DAYS_FULL = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba']

function dowIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return (dow + 6) % 7
}
function dayLabel(iso: string): string { return UZ_DAYS[dowIndex(iso)] }
function dayFullName(iso: string): string { return UZ_DAYS_FULL[dowIndex(iso)] }

function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}s ${m}d` : `${m}d`
}

// ── Compact weekly bar chart — same idiom as weekly-report.tsx's WeeklyBars,
// one hue (accent), goal-met days full-strength, others dimmed. Single
// series, so no legend needed; the "XULOSA" card above already names it.
// Upgraded with: tap-a-day for exact hours, a best-day/streak callout, and
// a trend line + end-of-week projection (5-savol-quality-fixes-style
// "advanced Haftalik faollik" request).
const BAR_MAX_H = 56

function WeeklyBars({
  days, accent, barBg, textPrimary, textMuted, projectedMinutes,
}: {
  days: WeeklyReviewStats['days']; accent: string; barBg: string
  textPrimary: string; textMuted: string; projectedMinutes: number
}) {
  const maxMin = Math.max(...days.map(d => d.minutes), 1)
  const anims  = useRef(days.map(() => new Animated.Value(0))).current
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [rowWidth, setRowWidth] = useState(0)

  useEffect(() => {
    Animated.stagger(50, days.map((d, i) =>
      Animated.spring(anims[i], { toValue: d.minutes / maxMin, useNativeDriver: false, tension: 80, friction: 10 }),
    )).start()
  }, [])

  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width)

  // Trend line points — based on FINAL target heights (not the animated
  // value) so the line doesn't fight the bar-fill spring animation; drawn
  // once layout width is known via onLayout above.
  const trendPath = useMemo(() => {
    if (rowWidth === 0 || days.length < 2) return null
    const colW = rowWidth / days.length
    const points = days.map((d, i) => {
      const x = colW * (i + 0.5)
      const frac = d.minutes / maxMin
      const y = BAR_MAX_H - Math.max(3, frac * BAR_MAX_H)
      return `${x},${y}`
    })
    return `M ${points.join(' L ')}`
  }, [rowWidth, days, maxMin])

  // Best day + within-week streak — pure client-side display logic, no
  // backend change needed (the raw per-day minutes are already there).
  const bestDay = useMemo(() => {
    const withData = days.filter(d => d.minutes > 0)
    if (withData.length === 0) return null
    return withData.reduce((best, d) => (d.minutes > best.minutes ? d : best))
  }, [days])

  const streakWithinWeek = useMemo(() => {
    let streak = 0
    for (const d of [...days].reverse()) {
      if (d.minutes === 0) { if (streak > 0) break; else continue }
      if (!d.goal_met) break
      streak++
    }
    return streak
  }, [days])

  const selected = selectedIdx !== null ? days[selectedIdx] : null

  return (
    <View>
      <View style={bars.row} onLayout={onRowLayout}>
        {rowWidth > 0 && trendPath && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path d={trendPath} stroke={accent} strokeWidth={1.5} strokeDasharray="3,3" fill="none" opacity={0.6} />
          </Svg>
        )}
        {days.map((d, i) => {
          const barH = anims[i].interpolate({ inputRange: [0, 1], outputRange: [3, BAR_MAX_H] })
          const color = d.goal_met ? accent : (d.minutes > 0 ? accent + 'AA' : barBg)
          const isSelected = selectedIdx === i
          return (
            <Pressable
              key={d.date} style={bars.col}
              onPress={() => setSelectedIdx(isSelected ? null : i)}
              hitSlop={4}
            >
              <View style={[
                bars.track,
                { height: BAR_MAX_H, backgroundColor: barBg, borderWidth: isSelected ? 1.5 : 0, borderColor: accent },
              ]}>
                <Animated.View style={[bars.fill, { height: barH, backgroundColor: color }]} />
              </View>
              <Text style={[bars.label, { color: isSelected ? accent : '#9c9ca6' }]}>{dayLabel(d.date)}</Text>
            </Pressable>
          )
        })}
      </View>

      {selected && (
        <Text style={[bars.caption, { color: textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {dayFullName(selected.date)}: {fmtHM(selected.minutes)}
          {selected.minutes > 0 ? (selected.goal_met ? ' — maqsad bajarildi ✓' : ' — maqsad bajarilmadi') : ''}
        </Text>
      )}

      {(bestDay || streakWithinWeek >= 2 || projectedMinutes > 0) && (
        <View style={bars.insights}>
          {bestDay && bestDay.minutes > 0 && (
            <View style={bars.insightRow}>
              <Trophy size={12} color="#F59E0B" />
              <Text style={[bars.insightText, { color: textMuted }]}>
                Eng samarali kun: <Text style={{ color: textPrimary, fontFamily: typography.fontFamily.semibold }}>
                  {dayFullName(bestDay.date)} ({fmtHM(bestDay.minutes)})
                </Text>
              </Text>
            </View>
          )}
          {streakWithinWeek >= 2 && (
            <View style={bars.insightRow}>
              <Flame size={12} color="#FF4500" />
              <Text style={[bars.insightText, { color: textMuted }]}>
                <Text style={{ color: textPrimary, fontFamily: typography.fontFamily.semibold }}>{streakWithinWeek} kun</Text> ketma-ket maqsad bajarildi
              </Text>
            </View>
          )}
          {projectedMinutes > 0 && (
            <View style={bars.insightRow}>
              <Text style={[bars.insightText, { color: textMuted }]}>
                📈 Shu sur'atda hafta oxirigacha taxminan{' '}
                <Text style={{ color: textPrimary, fontFamily: typography.fontFamily.semibold }}>{fmtHM(projectedMinutes)}</Text>
              </Text>
            </View>
          )}
        </View>
      )}
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

// ── Chart + stat-tile grid — the PRIMARY content, always sourced from the
// true ongoing week (current_week_progress), never the last-completed week.
function StatsSection({ stats, accent, c }: { stats: WeeklyReviewStats; accent: string; c: any }) {
  const pctChange = stats.prev_week_minutes_same_point > 0
    ? Math.round((stats.this_week_minutes - stats.prev_week_minutes_same_point) / stats.prev_week_minutes_same_point * 100)
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
              {pctChange >= 0 ? '+' : ''}{pctChange}% o'tgan haftaning shu kunigacha
            </Text>
          )}
        </View>
        {stats.days.length > 0 ? (
          <WeeklyBars
            days={stats.days} accent={accent} barBg={c.bgTertiary}
            textPrimary={c.textPrimary} textMuted={c.textMuted}
            projectedMinutes={stats.projected_week_minutes}
          />
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
  const [currentWeek, setCurrentWeek] = useState<CurrentWeekProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await aiApi.weeklyReview()
      setReview(res.review)
      setCurrentWeek(res.current_week_progress)
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

  const hasAnyContent = !!currentWeek && (
    !!currentWeek.summary || currentWeek.stats.this_week_minutes > 0 || !!review
  )

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
      ) : !currentWeek || !hasAnyContent ? (
        <View style={s.center}>
          <Text style={s.stateIcon}>🌱</Text>
          <Text style={[s.stateTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Hali sharh yo'q
          </Text>
          <Text style={[s.stateBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Har kuni sizning haqiqiy natijalaringiz asosida shaxsiy sharh yangilanadi.{'\n'}
            O'qishni boshlang — shu yerda kuzatib borasiz.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.freeBadge, { backgroundColor: accent + '1a', borderColor: accent + '44' }]}>
            <Sparkles size={13} color={accent} />
            <Text style={[s.freeBadgeText, { color: accent, fontFamily: typography.fontFamily.semibold }]}>
              Har doim bepul
            </Text>
          </View>

          <Text style={[s.weekLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {fmtWeekStart(currentWeek.week_start)} haftasi — davom etmoqda
          </Text>

          <Text style={[s.headline, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            {currentWeek.headline ?? (
              currentWeek.stats.this_week_minutes === 0
                ? 'Bu hafta hali boshlanmadi'
                : 'Yaxshi ketyapsiz!'
            )}
          </Text>

          <View style={[s.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[s.cardLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
              XULOSA
            </Text>
            <Text style={[s.cardBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {currentWeek.summary ??
                "Bu haftaning statistikasi hozircha bo'sh. O'qishni boshlang — sun'iy intellekt tahlili keyingi safar tayyor bo'ladi."}
            </Text>
          </View>

          <StatsSection stats={currentWeek.stats} accent={accent} c={c} />

          {currentWeek.feature_spotlight && (
            <Pressable
              disabled={!currentWeek.feature_spotlight_key || !FEATURE_ROUTE[currentWeek.feature_spotlight_key]}
              onPress={() => {
                const route = currentWeek.feature_spotlight_key ? FEATURE_ROUTE[currentWeek.feature_spotlight_key] : undefined
                if (route) router.push(route as any)
              }}
              style={[s.spotlightCard, { backgroundColor: '#A855F70d', borderColor: '#A855F733' }]}
            >
              <Text style={s.spotlightEmoji}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.spotlightTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                  {currentWeek.feature_spotlight.title}
                </Text>
                <Text style={[s.spotlightBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {currentWeek.feature_spotlight.body}
                </Text>
              </View>
              {currentWeek.feature_spotlight_key && FEATURE_ROUTE[currentWeek.feature_spotlight_key] && (
                <ChevronRight size={18} color="#A855F7" />
              )}
            </Pressable>
          )}

          {currentWeek.recommendation && (
            <View style={[s.card, { backgroundColor: accent + '0d', borderColor: accent + '33' }]}>
              <Text style={[s.cardLabel, { color: accent, fontFamily: typography.fontFamily.semibold }]}>
                TAVSIYA
              </Text>
              <Text style={[s.cardBody, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
                {currentWeek.recommendation}
              </Text>
            </View>
          )}

          {review && (
            <>
              <Text style={[s.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold, marginTop: spacing.md }]}>
                O'TGAN HAFTA YAKUNI — {fmtWeekStart(review.week_start)}
              </Text>
              <View style={[s.card, s.cardCompact, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <Text style={[s.cardBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {review.summary}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
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
  cardCompact: { padding: spacing.md },
  cardLabel: { fontSize: 11, letterSpacing: 0.5 },
  cardBody:  { fontSize: 14, lineHeight: 21 },

  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  pctChange:   { fontSize: 11 },

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
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 4 },
  col:     { alignItems: 'center', gap: 6, flex: 1 },
  track:   { width: 14, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  fill:    { width: '100%', borderRadius: 7 },
  label:   { fontSize: 10 },
  caption: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  insights:    { marginTop: 10, gap: 5 },
  insightRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  insightText: { fontSize: 11, flexShrink: 1 },
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
