import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Snowflake, Map } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { streaks as streaksApi } from '../../lib/api'
import type { StreakDetail, StreakCalendarDay } from '../../lib/api'
import { FreezeSheet } from '../../components/streak/FreezeSheet'
import { StreakLostModal } from '../../components/streak/StreakLostModal'
import { EvolutionModal } from '../../components/streak/EvolutionModal'
import { MagicTree } from '../../components/streak/MagicTree'
import { stageFromStreak, TREE_STAGES } from '../../lib/treeTheme'
import type { TreeState, StageNumber } from '../../lib/treeTheme'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'

let Haptics: any = null
try { Haptics = require('expo-haptics') } catch {}



const WEEKDAY_LABELS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya']

const XP_ROWS = [
  { label: '⏱ Fokus taymer',      value: '1.66 XP/daq', sub: '≈ 100 XP / soat' },
  { label: '📝 Test topshirish',   value: '+25 XP',      sub: 'Kunlik limit: 100 XP' },
  { label: '🎓 Kurs tugatish',     value: '+200 XP',     sub: 'Bir marta, har kurs' },
  { label: '🔥 7 kunlik seriya',   value: '+50 XP',      sub: 'Bonus' },
  { label: '⚡ 14 kunlik seriya',  value: '+120 XP',     sub: 'Bonus' },
  { label: '🏆 30 kunlik seriya',  value: '+300 XP',     sub: 'Bonus' },
  { label: '👑 100 kunlik seriya', value: '+1000 XP',    sub: 'Afsonaviy bonus' },
]

// ── Calendar colours ─────────────────────────────────────────────────────────
const CAL = {
  studied: { connColor: '#22c55e' },
  frozen:  { connColor: '#3b82f6' },
  missed:  { connColor: null      },
  future:  { connColor: null      },
}

// ── Calendar cell ─────────────────────────────────────────────────────────────
function CalCell({
  day, c, isToday, connectLeft, connectRight, wide,
}: {
  day:          StreakCalendarDay | null
  c:            ReturnType<typeof useTheme>['c']
  isToday:      boolean
  connectLeft:  boolean
  connectRight: boolean
  wide?:        boolean
}) {
  if (!day) return <View style={wide ? styles.wideSlot : styles.calSlot} />

  const dayNum    = new Date(day.date).getDate()
  const status    = day.status as keyof typeof CAL
  const connColor = CAL[status]?.connColor ?? 'transparent'

  // ── Wide mode (7-day view) ───────────────────────────────────────────────────
  if (wide) {
    if (status === 'future') {
      return (
        <View style={styles.wideSlot}>
          <View style={[styles.calCellWide, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', margin: 2 }]}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.13)' }} />
          </View>
        </View>
      )
    }
    if (status === 'studied') {
      return (
        <View style={styles.wideSlot}>
          {connectLeft  && <View style={[styles.connWide, { left: 0, right: '50%', backgroundColor: connColor }]} />}
          {connectRight && <View style={[styles.connWide, { left: '50%', right: 0,  backgroundColor: connColor }]} />}
          <View style={[styles.cellGlowWide, { shadowColor: '#22c55e' }, isToday && styles.todayGlowRing]}>
            <LinearGradient colors={['#86efac', '#15803d']} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.calCellWide}>
              <View style={styles.cellGloss} />
              {isToday && <View style={[styles.todayInnerRing, { borderRadius: 12 }]} />}
              <Text style={[styles.calNumWide, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>{dayNum}</Text>
              <Text style={styles.studiedCheckWide}>✓</Text>
            </LinearGradient>
          </View>
        </View>
      )
    }
    if (status === 'frozen') {
      return (
        <View style={styles.wideSlot}>
          {connectLeft  && <View style={[styles.connWide, { left: 0, right: '50%', backgroundColor: connColor }]} />}
          {connectRight && <View style={[styles.connWide, { left: '50%', right: 0,  backgroundColor: connColor }]} />}
          <View style={[styles.cellGlowWide, { shadowColor: '#60a5fa' }, isToday && styles.todayGlowRing]}>
            <LinearGradient colors={['#bae6fd', '#0c4a6e']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.calCellWide, styles.frozenBorder]}>
              <View style={styles.iceGloss} />
              {isToday && <View style={[styles.todayInnerRing, { borderRadius: 12 }]} />}
              <Snowflake size={13} color="rgba(224,242,254,0.75)" strokeWidth={2.5} style={styles.snowflakeIconWide} />
              <Text style={[styles.calNumWide, { color: '#e0f2fe', fontFamily: typography.fontFamily.bold, marginTop: 6 }]}>{dayNum}</Text>
            </LinearGradient>
          </View>
        </View>
      )
    }
    // missed (wide)
    if (isToday) {
      return (
        <View style={styles.wideSlot}>
          <View style={[styles.calCellWide, { margin: 2, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#f97316' }]}>
            <Text style={[styles.calNumWide, { color: '#f97316', fontFamily: typography.fontFamily.bold }]}>{dayNum}</Text>
          </View>
        </View>
      )
    }
    return (
      <View style={styles.wideSlot}>
        <View style={[styles.calCellWide, styles.missedCell, { margin: 2 }]}>
          <Text style={[styles.calNumWide, { color: '#7f1d1d', fontFamily: typography.fontFamily.bold }]}>{dayNum}</Text>
          <Text style={styles.missedXWide}>✕</Text>
        </View>
      </View>
    )
  }

  // ── Narrow mode (30-day grid) ────────────────────────────────────────────────

  // ── future ──────────────────────────────────────────────────────────────────
  if (status === 'future') {
    return (
      <View style={styles.calSlot}>
        <View style={{ flex: 1 }} />
        <View style={[styles.calCell, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }]}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.13)' }} />
        </View>
        <View style={{ flex: 1 }} />
      </View>
    )
  }

  // ── studied ──────────────────────────────────────────────────────────────────
  if (status === 'studied') {
    return (
      <View style={styles.calSlot}>
        <View style={[styles.connHalf, { backgroundColor: connectLeft ? connColor : 'transparent' }]} />
        <View style={[styles.cellGlow, { shadowColor: '#22c55e' }, isToday && styles.todayGlowRing]}>
          <LinearGradient
            colors={['#86efac', '#15803d']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.calCell}
          >
            {/* gloss highlight */}
            <View style={styles.cellGloss} />
            {isToday && <View style={styles.todayInnerRing} />}
            <Text style={[styles.calNum, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>{dayNum}</Text>
            <Text style={styles.studiedCheck}>✓</Text>
          </LinearGradient>
        </View>
        <View style={[styles.connHalf, { backgroundColor: connectRight ? connColor : 'transparent' }]} />
      </View>
    )
  }

  // ── frozen ───────────────────────────────────────────────────────────────────
  if (status === 'frozen') {
    return (
      <View style={styles.calSlot}>
        <View style={[styles.connHalf, { backgroundColor: connectLeft ? connColor : 'transparent' }]} />
        <View style={[styles.cellGlow, { shadowColor: '#60a5fa' }, isToday && styles.todayGlowRing]}>
          <LinearGradient
            colors={['#bae6fd', '#0c4a6e']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.calCell, styles.frozenBorder]}
          >
            {/* ice corner reflection */}
            <View style={styles.iceGloss} />
            {isToday && <View style={styles.todayInnerRing} />}
            <Snowflake
              size={11}
              color="rgba(224,242,254,0.75)"
              strokeWidth={2.5}
              style={styles.snowflakeIcon}
            />
            <Text style={[styles.calNum, { color: '#e0f2fe', fontFamily: typography.fontFamily.bold, marginTop: 5 }]}>{dayNum}</Text>
          </LinearGradient>
        </View>
        <View style={[styles.connHalf, { backgroundColor: connectRight ? connColor : 'transparent' }]} />
      </View>
    )
  }

  // ── missed (narrow) ──────────────────────────────────────────────────────────
  if (isToday) {
    return (
      <View style={styles.calSlot}>
        <View style={{ flex: 1 }} />
        <View style={[styles.calCell, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#f97316' }]}>
          <Text style={[styles.calNum, { color: '#f97316', fontFamily: typography.fontFamily.bold }]}>{dayNum}</Text>
        </View>
        <View style={{ flex: 1 }} />
      </View>
    )
  }
  return (
    <View style={styles.calSlot}>
      <View style={{ flex: 1 }} />
      <View style={[styles.calCell, styles.missedCell]}>
        <Text style={[styles.calNum, { color: '#7f1d1d', fontFamily: typography.fontFamily.bold }]}>{dayNum}</Text>
        <Text style={styles.missedX}>✕</Text>
      </View>
      <View style={{ flex: 1 }} />
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StreakDetailScreen() {
  const { c } = useTheme()
  const router  = useRouter()
  const insets  = useSafeAreaInsets()
  const user    = useAuthStore(s => s.user)
  const dashData = useDashboardStore(s => s.data)

  const [data, setData]               = useState<StreakDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [showFreeze,    setShowFreeze]    = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [prevStreakDays, setPrevStreakDays] = useState(0)
  const [showEvolution,  setShowEvolution]  = useState(false)
  const [evolutionStage, setEvolutionStage] = useState<StageNumber>(1)
  const hasShownLostRef    = useRef(false)
  const prevStageRef       = useRef<number>(
    stageFromStreak(dashData?.focusStats.streak_days ?? user?.streak_days ?? 0)
  )
  const [localXp, setLocalXp]         = useState(user?.total_xp ?? 0)
  const [localFreeze, setLocalFreeze] = useState(
    () => dashData?.focusStats.freeze_count ?? 0
  )
  const [calDays, setCalDays]   = useState<7 | 30>(7)
  const calDaysRef              = useRef<7 | 30>(7)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setLoadError(null)
    try {
      const telegramId = useAuthStore.getState().user?.telegram_id
      const res = await streaksApi.detail(telegramId, calDaysRef.current)
      setLocalFreeze(res.freeze_count)
      // Show streak-lost modal once per session when streak is broken
      if (!isRefresh && !hasShownLostRef.current && !res.is_active && res.streak_days > 0) {
        hasShownLostRef.current = true
        setPrevStreakDays(res.streak_days)
        // Display 0 in the hero — the streak is gone; keep the raw value in prevStreakDays for the modal
        setData({ ...res, streak_days: 0 })
        setTimeout(() => setShowLostModal(true), 500)
      } else {
        setData(res)
        const newStage = stageFromStreak(res.streak_days)
        if (newStage > prevStageRef.current) {
          prevStageRef.current = newStage
          setEvolutionStage(newStage as StageNumber)
          setTimeout(() => setShowEvolution(true), 400)
        } else {
          prevStageRef.current = newStage
        }
      }
      // Sync fresh data to dashboardStore so banner/hero on the home tab stay consistent
      useDashboardStore.getState().patchFocusStats({
        streak_days:    res.is_active ? res.streak_days : 0,
        longest_streak: res.longest_streak,
        freeze_count:   res.freeze_count,
      })
    } catch (e: any) {
      const msg = e?.message ?? "Serverdan ma'lumot olishda xatolik"
      console.error('[StreakDetail] load error:', e)
      setLoadError(msg)
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setLocalXp(user?.total_xp ?? 0) }, [user?.total_xp])

  function handlePurchased(newXp: number, newFreezeCount: number) {
    setLocalXp(newXp)
    setLocalFreeze(newFreezeCount)
    if (data) setData({ ...data, freeze_count: newFreezeCount })
    useDashboardStore.getState().patchFocusStats({ freeze_count: newFreezeCount })
  }

  async function handleUseFreeze() {
    try {
      const res = await streaksApi.useFreeze()
      Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success)
      setLocalFreeze(res.freeze_count)
      if (data) setData({ ...data, streak_days: res.streak_days, freeze_count: res.freeze_count, is_active: true })
      useDashboardStore.getState().patchFocusStats({
        streak_days:  res.streak_days,
        freeze_count: res.freeze_count,
      })
      setShowLostModal(false)
      load(true)
    } catch {
      setShowLostModal(false)
    }
  }

  // Prefer API data; fall back to dashboardStore → authStore for key fields
  const streakDays    = data?.streak_days    ?? dashData?.focusStats.streak_days    ?? user?.streak_days ?? 0
  const longestStreak = data?.longest_streak ?? dashData?.focusStats.longest_streak ?? streakDays
  const weekDays      = data?.week_days      ?? 0
  const freezeCount   = data?.freeze_count   ?? localFreeze

  const stage      = stageFromStreak(streakDays)
  const treeState: TreeState = data ? (data.is_active ? 'alive' : 'frozen') : 'alive'

  // Next-stage progress
  const stageMeta     = TREE_STAGES[stage - 1]
  const nextStageMeta = TREE_STAGES[stage] ?? null   // null when stage 10
  const nextStagePct  = nextStageMeta
    ? Math.min(100, Math.round((streakDays / nextStageMeta.streakDays) * 100))
    : 100
  const daysToNext = nextStageMeta ? nextStageMeta.streakDays - streakDays : 0


  // Calendar: today in device-local time (not UTC) so "today" highlight matches sessions
  const _d = new Date()
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`

  // Calendar rows — 7-day: single flat row; 30-day: Monday-aligned grid
  const calRows: (StreakCalendarDay | null)[][] = []
  const cal7 = data?.calendar ? data.calendar.slice(-7) : []
  const calWeekLabels = calDays === 7 && cal7.length
    ? cal7.map(d => WEEKDAY_LABELS[(new Date(d.date).getDay() + 6) % 7])
    : WEEKDAY_LABELS
  if (data?.calendar.length) {
    if (calDays === 7) {
      calRows.push(cal7)
    } else {
      const firstDate = new Date(data.calendar[0].date)
      const firstDow  = (firstDate.getDay() + 6) % 7
      const padded: (StreakCalendarDay | null)[] = [
        ...Array(firstDow).fill(null),
        ...data.calendar,
      ]
      for (let i = 0; i < padded.length; i += 7) {
        const row = padded.slice(i, i + 7)
        while (row.length < 7) row.push(null)
        calRows.push(row)
      }
    }
  }

  // Hero colors — adapt to dark/light
  const heroGradient: [string, string] = ['#0f1b30', '#1b3056']
  const heroNumColor   = '#eaf3ff'
  const heroLabelColor = '#adc4e6'
  const heroChipBg     = 'rgba(255,255,255,0.10)'
  const heroChipText   = '#6fd6a8'
  const nextLabelColor = '#adc4e6'
  const nextTrackBg    = 'rgba(255,255,255,0.10)'

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.border, paddingTop: insets.top + spacing.xs }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={c.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Seriya
        </Text>
        <View style={styles.topRight}>
          <Pressable
            style={[styles.topIconBtn, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
            onPress={() => router.push('/(screens)/tree-stages' as any)}
            hitSlop={8}
          >
            <Map size={15} color={c.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.freezeChip, { backgroundColor: '#60a5fa22', borderColor: '#60a5fa55' }]}
            onPress={() => setShowFreeze(true)}
          >
            <Snowflake size={14} color="#60a5fa" />
            <Text style={[styles.freezeChipText, { color: '#60a5fa', fontFamily: typography.fontFamily.bold }]}>
              {freezeCount}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* API error banner — partial data from local stores is still shown */}
      {loadError && (
        <View style={[styles.errorBanner, { backgroundColor: '#ff453a22', borderColor: '#ff453a44' }]}>
          <Text style={[styles.errorBannerText, { color: '#ff453a', fontFamily: typography.fontFamily.regular }]}>
            ⚠️ {loadError}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={c.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <LinearGradient colors={heroGradient} style={styles.hero}>
          {/* Stage chip */}
          <View style={[styles.stageChip, { backgroundColor: heroChipBg }]}>
            <Text style={[styles.stageChipText, { color: heroChipText, fontFamily: typography.fontFamily.bold }]}>
              {stageMeta.name.toUpperCase()} · BOSQICH {stage}
            </Text>
          </View>

          <MagicTree stage={stage} state={treeState} size="card" uid="sd_hero" />

          {/* Big streak number */}
          <View style={styles.heroTextRow}>
            <Text style={styles.heroFlame}>🔥</Text>
            <Text style={[styles.heroNum, { color: heroNumColor, fontFamily: typography.fontFamily.bold }]}>
              {streakDays}
            </Text>
          </View>
          <Text style={[styles.heroLabel, { color: heroLabelColor, fontFamily: typography.fontFamily.regular }]}>
            kunlik seriya
          </Text>

          {/* Next-stage progress */}
          {nextStageMeta && (
            <View style={styles.nextStageWrap}>
              <View style={styles.nextStageMeta}>
                <Text style={[styles.nextStageLabel, { color: nextLabelColor, fontFamily: typography.fontFamily.regular }]}>
                  Keyingi: {nextStageMeta.name}
                </Text>
                <Text style={[styles.nextStageDays, { fontFamily: typography.fontFamily.medium }]}>
                  {daysToNext} kun qoldi
                </Text>
              </View>
              <View style={[styles.nextStageTrack, { backgroundColor: nextTrackBg }]}>
                <View style={[styles.nextStageFill, { width: `${nextStagePct}%` as any }]} />
              </View>
            </View>
          )}

        </LinearGradient>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.statNum, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
              {longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Eng uzun
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.statNum, { color: '#34d399', fontFamily: typography.fontFamily.bold }]}>
              {weekDays}/7
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Bu hafta
            </Text>
          </View>
          <Pressable
            style={[styles.statCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
            onPress={() => setShowFreeze(true)}
          >
            <Text style={[styles.statNum, { color: '#60a5fa', fontFamily: typography.fontFamily.bold }]}>
              {freezeCount}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              Freeze
            </Text>
          </Pressable>
        </View>

        {/* ── Calendar ──────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <View style={styles.calHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              So'nggi {calDays} kun
            </Text>
            <View style={styles.calToggle}>
              {([7, 30] as const).map(d => (
                <Pressable
                  key={d}
                  style={[
                    styles.calToggleBtn,
                    calDays === d && { backgroundColor: c.brand },
                    { borderColor: calDays === d ? c.brand : c.border },
                  ]}
                  onPress={() => {
                    if (calDays === d) return
                    setCalDays(d)
                    calDaysRef.current = d
                    load(true)
                  }}
                >
                  <Text style={[
                    styles.calToggleTxt,
                    { color: calDays === d ? '#fff' : c.textMuted, fontFamily: typography.fontFamily.medium },
                  ]}>
                    {d} kun
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <LinearGradient colors={['#86efac', '#15803d']} start={{x:0.15,y:0}} end={{x:0.85,y:1}} style={styles.legendChip}>
                <Text style={styles.legendChipIcon}>✓</Text>
              </LinearGradient>
              <Text style={[styles.legendText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>O'qildi</Text>
            </View>
            <View style={styles.legendItem}>
              <LinearGradient colors={['#bae6fd', '#0c4a6e']} start={{x:0.1,y:0}} end={{x:0.9,y:1}} style={[styles.legendChip, styles.frozenBorder]}>
                <Snowflake size={8} color="rgba(224,242,254,0.85)" strokeWidth={2.5} />
              </LinearGradient>
              <Text style={[styles.legendText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>Muzlatildi</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendChip, styles.missedCell]}>
                <Text style={[styles.legendChipIcon, { color: 'rgba(239,68,68,0.6)' }]}>✕</Text>
              </View>
              <Text style={[styles.legendText, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>O'tkazildi</Text>
            </View>
          </View>

          {/* Day-of-week header */}
          <View style={styles.calRow}>
            {calWeekLabels.map((d, i) => (
              <Text key={i} style={[styles.calDayLabel, { color: c.textMuted, fontFamily: typography.fontFamily.medium }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          {calRows.map((row, ri) => (
            <View key={ri} style={styles.calRow}>
              {row.map((day, i) => {
                const active = (d: StreakCalendarDay | null | undefined) =>
                  d?.status === 'studied' || d?.status === 'frozen'
                return (
                  <CalCell
                    key={day ? day.date : `pad-${ri}-${i}`}
                    day={day}
                    c={c}
                    isToday={day?.date === todayStr}
                    connectLeft={active(day) && i > 0 && active(row[i - 1])}
                    connectRight={active(day) && i < row.length - 1 && active(row[i + 1])}
                    wide={calDays === 7}
                  />
                )
              })}
            </View>
          ))}
        </View>

        {/* ── Freeze section ────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: '#60a5fa11', borderColor: '#60a5fa33' }]}>
          <View style={styles.freezeHeader}>
            <Text style={styles.freezeIce}>🧊</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.freezeTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                Seriya muzlatish
              </Text>
              <Text style={[styles.freezeSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                {freezeCount > 0
                  ? `Sizda ${freezeCount} ta freeze mavjud`
                  : 'Hech qanday freeze yo\'q'}
              </Text>
            </View>
          </View>

          {/* Rule hint */}
          <Text style={[styles.freezeRule, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            💡 Har kuni o'qisangiz seriya davom etadi. 1 kun o'tkazib yuborsangiz — hali xavfsiz. 2-kun o'tmasdan freeze ishlatib saqlab qoling.
          </Text>

          <View style={styles.freezeBtnRow}>
            {data?.can_freeze && (
              <Pressable
                style={[styles.freezeUseBtn, { borderColor: '#60a5fa88' }]}
                onPress={handleUseFreeze}
              >
                <Text style={[styles.freezeBtnText, { color: '#60a5fa', fontFamily: typography.fontFamily.semibold }]}>
                  🧊 Freeze ishlatish
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.freezeBtn, { backgroundColor: '#60a5fa', borderRadius: radius.lg }]}
              onPress={() => setShowFreeze(true)}
            >
              <Text style={[styles.freezeBtnText, { fontFamily: typography.fontFamily.semibold }]}>
                Sotib olish
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── XP breakdown ─────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            💡 XP qanday hisoblanadi?
          </Text>
          <View style={{ gap: 0 }}>
            {XP_ROWS.map((r, i) => (
              <View
                key={r.label}
                style={[
                  styles.xpRow,
                  { borderBottomColor: c.border },
                  i === XP_ROWS.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.xpLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                  {r.label}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.xpValue, { color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }]}>
                    {r.value}
                  </Text>
                  <Text style={[styles.xpSub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                    {r.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <FreezeSheet
        visible={showFreeze}
        currentXp={localXp}
        freezeCount={freezeCount}
        packages={data?.freeze_packages ?? []}
        onClose={() => setShowFreeze(false)}
        onPurchased={handlePurchased}
      />

      <StreakLostModal
        visible={showLostModal}
        prevStreak={prevStreakDays}
        freezeCount={freezeCount}
        onClose={() => setShowLostModal(false)}
        onUseFreeze={data?.can_freeze ? handleUseFreeze : undefined}
      />

      <EvolutionModal
        visible={showEvolution}
        toStage={evolutionStage}
        onClose={() => setShowEvolution(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  topTitle: { fontSize: typography.size.base, flex: 1 },
  freezeChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  freezeChipText: { fontSize: typography.size.sm },

  scroll: {
    paddingBottom: spacing['2xl'],
    gap:           spacing.md,
  },

  // Hero — fills ~40% of screen height
  hero: {
    alignItems:    'center',
    paddingTop:    spacing.lg,
    paddingBottom: spacing.lg,
    gap:           spacing.xs,
    minHeight:     380,
  },
  heroInfoBtn: {
    position:       'absolute',
    top:            spacing.sm,
    right:          spacing.sm,
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },
  heroTextRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           6,
    marginTop:     spacing.sm,
  },
  heroFlame: { fontSize: 32, lineHeight: 50 },
  heroNum: {
    fontSize:   52,
    lineHeight: 56,
  },
  heroLabel: {
    fontSize: typography.size.base,
  },
  inactivePill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   4,
    borderRadius:      radius.full,
    marginTop:         spacing.xs,
  },
  inactiveText: { fontSize: typography.size.xs },

  // Stats
  statsRow: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
  },
  statCard: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: spacing.md,
    borderRadius:   radius.xl,
    borderWidth:    StyleSheet.hairlineWidth,
    gap:            2,
  },
  statNum:   { fontSize: typography.size.xl },
  statLabel: { fontSize: typography.size.xs },

  // Section card
  section: {
    marginHorizontal:  spacing.base,
    borderRadius:      radius.xl,
    borderWidth:       StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.sm,
  },
  sectionTitle: { fontSize: typography.size.base },

  // ── Wide cell (7-day view) ─────────────────────────────────────────────────
  wideSlot: { flex: 1 },
  cellGlowWide: {
    margin:        2,
    borderRadius:  12,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius:  7,
    elevation:     5,
  },
  calCellWide: {
    aspectRatio:    1,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  connWide: {
    position:  'absolute',
    top:       '50%' as any,
    marginTop: -2,
    height:    4,
  },
  calNumWide: { fontSize: 13, lineHeight: 15 },
  studiedCheckWide: {
    position:   'absolute',
    bottom:     3,
    right:      6,
    fontSize:   10,
    color:      'rgba(255,255,255,0.75)',
    fontWeight: '800',
  },
  missedXWide: {
    position:   'absolute',
    bottom:     3,
    right:      6,
    fontSize:   10,
    color:      'rgba(239,68,68,0.45)',
    fontWeight: '800',
  },
  snowflakeIconWide: {
    position: 'absolute',
    top:      4,
    right:    4,
  },

  // Calendar header row (title + toggle)
  calHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  calToggle: {
    flexDirection: 'row',
    gap:           4,
  },
  calToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  calToggleTxt: { fontSize: typography.size.xs },

  // Calendar
  calDayLabel: {
    flex:      1,
    textAlign: 'center',
    fontSize:  10,
  },
  legend: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', paddingVertical: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendChip: {
    width: 18, height: 18, borderRadius: 5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  legendChipIcon: { fontSize: 9, color: '#fff', fontWeight: '700' },
  legendText: { fontSize: typography.size.xs },

  // No gap — spacing comes from the connector half-views inside each slot
  calRow: { flexDirection: 'row' },

  // Each slot: [connHalf] [cell] [connHalf]
  calSlot: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
  },
  connHalf: {
    flex:         1,
    height:       4,
    borderRadius: 2,
  },

  // Shadow/glow wrapper (not overflow:hidden so shadow bleeds out)
  cellGlow: {
    borderRadius:   10,
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.55,
    shadowRadius:   7,
    elevation:      5,
  },
  todayGlowRing: {
    shadowOpacity: 0.9,
    shadowRadius:  10,
    elevation:     8,
  },

  // Gradient cell (overflow:hidden to clip gradient corners)
  calCell: {
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  calNum: { fontSize: 11, lineHeight: 13 },

  // Gloss highlight shared by studied + frozen
  cellGloss: {
    position:        'absolute',
    top:             4,
    left:            6,
    width:           13,
    height:          6,
    borderRadius:    3,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },

  // Today inner ring (inside gradient, so always visible)
  todayInnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth:  2,
    borderColor:  'rgba(255,255,255,0.7)',
    borderRadius: 10,
  },

  // Studied badge ✓
  studiedCheck: {
    position:   'absolute',
    bottom:     2,
    right:      5,
    fontSize:   9,
    color:      'rgba(255,255,255,0.75)',
    fontWeight: '800',
  },

  // Frozen: 3-D border — light top/left, dark bottom/right
  frozenBorder: {
    borderWidth:       1.5,
    borderTopColor:    '#7dd3fc',
    borderLeftColor:   '#7dd3fc',
    borderBottomColor: '#1e40af',
    borderRightColor:  '#1e40af',
  },
  // Ice corner reflection (top-left white sheen)
  iceGloss: {
    position:        'absolute',
    top:             3,
    left:            4,
    width:           10,
    height:          5,
    borderRadius:    2.5,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  snowflakeIcon: {
    position: 'absolute',
    top:      3,
    right:    3,
  },

  // Missed: dark hollow cell with dim red border
  missedCell: {
    backgroundColor: '#1e0505',
    borderWidth:     1,
    borderColor:     'rgba(239,68,68,0.28)',
  },
  missedX: {
    position:   'absolute',
    bottom:     2,
    right:      5,
    fontSize:   9,
    color:      'rgba(239,68,68,0.45)',
    fontWeight: '800',
  },

  // Freeze
  freezeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  freezeIce:    { fontSize: 28 },
  freezeTitle:  { fontSize: typography.size.base },
  freezeSub:    { fontSize: typography.size.xs, marginTop: 2 },
  freezeRule:   { fontSize: typography.size.xs, lineHeight: 17 },
  freezeBtnRow: { flexDirection: 'row', gap: spacing.sm },
  freezeBtn: {
    flex:            1,
    paddingVertical: spacing.sm,
    alignItems:      'center',
    borderRadius:    radius.lg,
  },
  freezeUseBtn: {
    flex:            1,
    paddingVertical: spacing.sm,
    alignItems:      'center',
    borderRadius:    radius.lg,
    borderWidth:     1,
  },
  freezeBtnText: { color: '#fff', fontSize: typography.size.base },

  // XP breakdown
  xpRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  xpLabel: { fontSize: typography.size.sm, flex: 1 },
  xpValue: { fontSize: typography.size.sm },
  xpSub:   { fontSize: typography.size.xs },

  errorBanner: {
    marginHorizontal: spacing.base,
    marginTop:        spacing.xs,
    borderRadius:     radius.lg,
    borderWidth:      1,
    paddingVertical:  spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  errorBannerText: { fontSize: typography.size.xs },

  // TopBar additions
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topIconBtn: {
    width:          30,
    height:         30,
    borderRadius:   15,
    borderWidth:    StyleSheet.hairlineWidth,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Stage chip
  stageChip: {
    borderRadius:      radius.full,
    paddingHorizontal: 12,
    paddingVertical:   4,
    marginTop:         spacing.xs,
  },
  stageChipText: {
    fontSize:      10,
    letterSpacing: 0.7,
  },

  // Next-stage progress
  nextStageWrap: {
    width:     '88%',
    gap:       5,
    marginTop: spacing.sm,
  },
  nextStageMeta: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  nextStageLabel: { fontSize: 11 },
  nextStageDays:  { fontSize: 11, color: '#6fd6a8' },
  nextStageTrack: {
    height:       5,
    borderRadius: 3,
    overflow:     'hidden',
  },
  nextStageFill: {
    height:          5,
    borderRadius:    3,
    backgroundColor: '#46c08a',
  },

})
