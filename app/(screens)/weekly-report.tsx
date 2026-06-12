import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Animated, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Share2 } from 'lucide-react-native'
import { shareWeeklyReport } from '../../lib/share'
import { useTheme } from '../../hooks/useTheme'
import { focus as focusApi } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportData {
  first_name:    string
  week_start:    string
  week_end:      string
  total_minutes: number
  prev_minutes:  number
  pct_change:    number
  week_xp:       number
  streak_days:   number
  days_active:   number
  daily_goal:    number
  best_day:      string | null
  best_minutes:  number
  days: Array<{ date: string; minutes: number; goal_met: boolean }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const UZ_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

function fmtTime(minutes: number): string {
  if (minutes <= 0) return '0 daqiqa'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} soat ${m} daqiqa`
  if (h)      return `${h} soat`
  return `${m} daqiqa`
}

function fmtDate(iso: string): string {
  // Parse components directly — avoids UTC-midnight offset in negative-UTC zones
  const [, m, d] = iso.split('-').map(Number)
  const months = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
  return `${d} ${months[m - 1]}`
}

function dayLabel(iso: string): string {
  // Use local Date constructor, not ISO string, to avoid UTC-offset day shift
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()   // 0=Sun..6=Sat
  return UZ_DAYS[(dow + 6) % 7]                // remap to Mon=0..Sun=6
}

function motivational(data: ReportData): string {
  const { total_minutes, pct_change, days_active } = data
  if (total_minutes === 0) return "Bu hafta o'qish amalga oshmadi. Kelasi haftada yangi boshlang! 💪"
  if (days_active >= 6)   return "Deyarli har kuni o'qidingiz — bu juda katta yutuq! 🏆"
  if (pct_change >= 50)   return `O'tgan haftadan ${pct_change}% ko'p o'qidingiz! Bu zo'r natija! 🚀`
  if (pct_change >= 20)   return `O'tgan haftadan ${pct_change}% ko'proq vaqt ajratdingiz! 📈`
  if (pct_change > 0)     return "Izchillik — muvaffaqiyatning kaliti. Davom eting! ✨"
  if (pct_change < -20)   return "Bu hafta qiyin o'tdi, lekin siz uddalaysiz! Kelasi hafta kuchliroq! 💙"
  if (total_minutes >= 120) return `${fmtTime(total_minutes)} — kuchli natija! Shu sur'atni saqlang 🔥`
  return "Har bir daqiqa hisob! Biroz ko'proq vaqt ajratsak yana yaxshiroq bo'ladi 📚"
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

const BAR_MAX_H = 80

function WeeklyBars({ days, goalMet, accentColor, barBg, textMuted }: {
  days:        Array<{ date: string; minutes: number; goal_met: boolean }>
  goalMet:     boolean[]
  accentColor: string
  barBg:       string
  textMuted:   string
}) {
  const maxMin = Math.max(...days.map(d => d.minutes), 1)
  const anims  = useRef(days.map(() => new Animated.Value(0))).current

  useEffect(() => {
    Animated.stagger(60, days.map((d, i) =>
      Animated.spring(anims[i], {
        toValue:         d.minutes / maxMin,
        useNativeDriver: false,
        tension:         80,
        friction:        10,
      })
    )).start()
  }, [])

  return (
    <View style={bars.row}>
      {days.map((d, i) => {
        const barH = anims[i].interpolate({ inputRange: [0, 1], outputRange: [4, BAR_MAX_H] })
        const color = d.goal_met ? accentColor : d.minutes > 0 ? accentColor + 'AA' : barBg
        return (
          <View key={d.date} style={bars.col}>
            <View style={bars.barWrap}>
              <Animated.View style={[bars.bar, { height: barH, backgroundColor: color }]} />
            </View>
            <Text style={[bars.label, { color: textMuted }]}>{dayLabel(d.date)}</Text>
            {d.minutes > 0 && (
              <Text style={[bars.mins, { color: textMuted }]}>{d.minutes}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

const bars = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: 4 },
  col:     { flex: 1, alignItems: 'center', gap: 4 },
  barWrap: { height: BAR_MAX_H, justifyContent: 'flex-end', width: '100%' },
  bar:     { width: '100%', borderRadius: 6, minHeight: 4 },
  label:   { fontSize: 11, fontWeight: '600' },
  mins:    { fontSize: 9 },
})

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ emoji, value, label, c }: {
  emoji: string; value: string; label: string; c: any
}) {
  return (
    <View style={[sc.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
      <Text style={sc.emoji}>{emoji}</Text>
      <Text style={[sc.value, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {value}
      </Text>
      <Text style={[sc.label, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
    </View>
  )
}

const sc = StyleSheet.create({
  card:  {
    flex: 1, alignItems: 'center', paddingVertical: spacing.base,
    paddingHorizontal: 6, borderRadius: radius.lg, borderWidth: 1, gap: 4,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 16 },
  label: { fontSize: 11, textAlign: 'center' },
})

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, style }: { value: number; style?: any }) {
  const anim    = useRef(new Animated.Value(0)).current
  const [disp, setDisp] = useState(0)

  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1200, useNativeDriver: false }).start()
    const id = anim.addListener(({ value: v }) => setDisp(Math.round(v)))
    return () => anim.removeListener(id)
  }, [value])

  return <Text style={style}>{disp.toLocaleString()}</Text>
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WeeklyReportScreen() {
  const { c }    = useTheme()
  const router   = useRouter()
  const [data,    setData]    = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current

  const load = () => {
    setLoading(true)
    setError(null)
    focusApi.weeklyReport()
      .then(d => {
        setData(d)
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
      })
      .catch((e: any) => setError(e?.message ?? 'Serverga ulanib bo\'lmadi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleShare = async () => {
    if (!data) return
    shareWeeklyReport({
      totalMinutes: data.total_minutes,
      weekXp:       data.week_xp,
      streakDays:   data.streak_days,
    })
  }

  // ── Accent colour ─────────────────────────────────────────────────────────
  const accent = c.accentPrimary

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={s.loadingCenter}>
          <ActivityIndicator color={accent} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (!data) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={[s.navBar, { borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.navBtn}>
            <ChevronLeft size={24} color={accent} />
          </Pressable>
          <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            Haftalik hisobot
          </Text>
          <View style={s.navBtn} />
        </View>
        <View style={s.loadingCenter}>
          <Text style={[s.errIcon]}>⚠️</Text>
          <Text style={[s.errTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Ma'lumot yuklanmadi
          </Text>
          {error && (
            <Text style={[s.errDetail, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              {error}
            </Text>
          )}
          <Pressable
            onPress={load}
            style={[s.retryBtn, { backgroundColor: accent }]}
          >
            <Text style={[s.retryText, { fontFamily: typography.fontFamily.semibold }]}>
              Qayta urinish
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const isUp       = data.pct_change > 0
  const isDown     = data.pct_change < 0
  const pctDisplay = Math.abs(data.pct_change)

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Nav */}
      <View style={[s.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.navBtn}>
          <ChevronLeft size={24} color={accent} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Haftalik hisobot
        </Text>
        <Pressable onPress={handleShare} hitSlop={12} style={s.navBtn}>
          <Share2 size={20} color={accent} />
        </Pressable>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[s.scroll, { paddingBottom: 48 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Date range header ─────────────────────────────────────────── */}
        <View style={s.headerRow}>
          <View style={[s.weekBadge, { backgroundColor: accent + '18' }]}>
            <Text style={[s.weekBadgeText, { color: accent, fontFamily: typography.fontFamily.semibold }]}>
              {fmtDate(data.week_start)} — {fmtDate(data.week_end)}
            </Text>
          </View>
        </View>

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <View style={[s.heroCard, { backgroundColor: accent }]}>
          <Text style={[s.heroEye, { fontFamily: typography.fontFamily.regular }]}>
            Jami o'qish vaqti
          </Text>
          <Text style={[s.heroTime, { fontFamily: typography.fontFamily.bold }]}>
            {fmtTime(data.total_minutes)}
          </Text>

          {data.prev_minutes > 0 && (
            <View style={s.changePill}>
              <Text style={s.changeText}>
                {isUp ? '↑' : isDown ? '↓' : '='} {isUp || isDown ? `${pctDisplay}%` : 'o\'zgarishsiz'}{' '}
                o'tgan haftadan
              </Text>
            </View>
          )}
        </View>

        {/* ── Bar chart ─────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Kun bo'yicha faollik
          </Text>
          <WeeklyBars
            days={data.days}
            goalMet={data.days.map(d => d.goal_met)}
            accentColor={accent}
            barBg={c.bgTertiary}
            textMuted={c.textSecondary}
          />
          <View style={[s.chartLegend, { borderTopColor: c.border }]}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: accent }]} />
              <Text style={[s.legendText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Maqsadga yetildi
              </Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: accent + 'AA' }]} />
              <Text style={[s.legendText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Qisman
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard
            emoji="⚡"
            value={`+${data.week_xp.toLocaleString()}`}
            label="XP bu hafta"
            c={c}
          />
          <StatCard
            emoji="🔥"
            value={`${data.streak_days}`}
            label="Seriya kun"
            c={c}
          />
          <StatCard
            emoji="📅"
            value={`${data.days_active}/7`}
            label="Faol kun"
            c={c}
          />
        </View>

        {/* ── Best day ──────────────────────────────────────────────────── */}
        {data.best_day && data.best_minutes > 0 && (
          <View style={[s.bestDay, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[s.bestDayLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Eng yaxshi kun
            </Text>
            <View style={s.bestDayRight}>
              <Text style={[s.bestDayDate, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                {fmtDate(data.best_day)}
              </Text>
              <View style={[s.bestDayBadge, { backgroundColor: accent + '22' }]}>
                <Text style={[s.bestDayMin, { color: accent, fontFamily: typography.fontFamily.bold }]}>
                  {fmtTime(data.best_minutes)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Motivational message ──────────────────────────────────────── */}
        <View style={[s.motive, { backgroundColor: c.bgSecondary, borderColor: c.border, borderLeftColor: accent }]}>
          <Text style={[s.motiveText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
            {motivational(data)}
          </Text>
        </View>

        {/* ── XP progress bar ───────────────────────────────────────────── */}
        {data.week_xp > 0 && (
          <View style={[s.xpSection, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <View style={s.xpHeader}>
              <Text style={[s.xpLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                Bu haftadagi XP
              </Text>
              <AnimatedNumber
                value={data.week_xp}
                style={[s.xpValue, { color: accent, fontFamily: typography.fontFamily.bold }]}
              />
            </View>
            <XpBar xp={data.week_xp} accent={accent} bg={c.bgTertiary} />
          </View>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <Pressable
          onPress={() => router.push('/(tabs)/study' as any)}
          style={({ pressed }) => [s.cta, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[s.ctaText, { fontFamily: typography.fontFamily.semibold }]}>
            O'qishni davom ettirish →
          </Text>
        </Pressable>

      </Animated.ScrollView>
    </SafeAreaView>
  )
}

// ── XP Bar (fills to nearest 500 milestone) ────────────────────────────────

function XpBar({ xp, accent, bg }: { xp: number; accent: string; bg: string }) {
  const milestone = Math.max(Math.ceil(xp / 500) * 500, 500)
  const pct       = Math.min(xp / milestone, 1)
  const barAnim   = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 1200, useNativeDriver: false }).start()
  }, [pct])

  return (
    <View style={[xpb.track, { backgroundColor: bg }]}>
      <Animated.View
        style={[xpb.fill, {
          backgroundColor: accent,
          width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]}
      />
      <View style={xpb.labels}>
        <Text style={[xpb.label, { color: accent }]}>0</Text>
        <Text style={[xpb.label, { color: accent }]}>{milestone.toLocaleString()}</Text>
      </View>
    </View>
  )
}

const xpb = StyleSheet.create({
  track:  { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  fill:   { height: '100%', borderRadius: 5 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label:  { fontSize: 10 },
})

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:          { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errIcon:   { fontSize: 40 },
  errTitle:  { fontSize: 16 },
  errDetail: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:  { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.full },
  retryText: { color: '#fff', fontSize: 14 },

  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.xs,
    paddingVertical:   spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15 },

  scroll: { padding: spacing.base, gap: spacing.base },

  headerRow: { alignItems: 'center' },
  weekBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full },
  weekBadgeText: { fontSize: 13 },

  // Hero
  heroCard: {
    borderRadius: radius.xl,
    padding:      spacing.xl,
    alignItems:   'center',
    gap:          spacing.sm,
  },
  heroEye:  { color: 'rgba(255,255,255,0.80)', fontSize: 13 },
  heroTime: { color: '#fff', fontSize: 36, lineHeight: 42 },
  changePill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius:    radius.full,
    paddingHorizontal: 14,
    paddingVertical:   5,
  },
  changeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Section
  section: {
    borderRadius: radius.lg,
    borderWidth:  1,
    padding:      spacing.base,
    gap:          spacing.sm,
  },
  sectionTitle: { fontSize: 14 },

  chartLegend: {
    flexDirection:  'row',
    gap:            spacing.lg,
    paddingTop:     spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop:      spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.sm },

  // Best day
  bestDay: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    borderRadius:   radius.lg,
    borderWidth:    1,
    padding:        spacing.base,
  },
  bestDayLabel: { fontSize: 13 },
  bestDayRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bestDayDate:  { fontSize: 14 },
  bestDayBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  bestDayMin:   { fontSize: 13 },

  // Motivational
  motive: {
    borderRadius:  radius.lg,
    borderWidth:   1,
    borderLeftWidth: 4,
    padding:       spacing.base,
  },
  motiveText: { fontSize: 14, lineHeight: 22 },

  // XP section
  xpSection: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.base },
  xpHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpLabel:   { fontSize: 13 },
  xpValue:   { fontSize: 18 },

  // CTA
  cta: {
    borderRadius:   radius.full,
    paddingVertical: 16,
    alignItems:     'center',
    marginTop:      spacing.sm,
  },
  ctaText: { color: '#fff', fontSize: 16 },
})
