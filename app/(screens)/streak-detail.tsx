import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Animated, Dimensions, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Snowflake, Map, Info, X, Share2 } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { streaks as streaksApi, focusStages } from '../../lib/api'
import type { StreakDetail, StreakCalendarDay, StreakStage } from '../../lib/api'
import { FreezeSheet } from '../../components/streak/FreezeSheet'
import { StreakLostModal } from '../../components/streak/StreakLostModal'
import { EvolutionModal } from '../../components/streak/EvolutionModal'
import { MagicTree } from '../../components/streak/MagicTree'
import { StreakHeroBackground } from '../../components/streak/StreakHeroBackground'
import { StagesPath } from '../../components/streak/StagesPath'
import { stageFromStreak, TREE_STAGES } from '../../lib/treeTheme'
import type { TreeState, StageNumber } from '../../lib/treeTheme'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useStreakStagesStore } from '../../stores/streakStagesStore'
import { syncWidget } from '../../lib/syncWidget'

let Haptics: any = null
try { Haptics = require('expo-haptics') } catch {}



const WEEKDAY_LABELS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya']

// General (non-stage) XP sources — the streak-stage bonuses are no longer
// listed here as static rows; they're rendered live from the server by
// <StagesPath> below (see "Bosqichlar" section), which shows each user's
// actual earned/current/future status instead of the same 4 rows for
// everyone regardless of progress.
const XP_ROWS = [
  { label: '⏱ Fokus taymer',      value: '1.66 XP/daq', sub: '≈ 100 XP / soat' },
  { label: '📝 Test topshirish',   value: '+25 XP',      sub: 'Kunlik limit: 100 XP' },
  { label: '🎓 Kurs tugatish',     value: '+200 XP',     sub: 'Bir marta, har kurs' },
]

// ── Calendar colours ─────────────────────────────────────────────────────────
const CAL = {
  studied: { connColor: '#22c55e' },
  frozen:  { connColor: '#3b82f6' },
  missed:  { connColor: null      },
  future:  { connColor: null      },
}

// ── Calendar cell ─────────────────────────────────────────────────────────────
const CalCell = React.memo(function CalCell({
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
})

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StreakDetailScreen() {
  const { c, theme } = useTheme()
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
  const [evolutionXp,    setEvolutionXp]    = useState(0)
  const [stages,         setStages]         = useState<StreakStage[]>([])
  const hasShownLostRef    = useRef(false)
  const prevStageRef       = useRef<number>(
    stageFromStreak(dashData?.focusStats.streak_days ?? user?.streak_days ?? 0)
  )
  const [localXp, setLocalXp]         = useState(user?.total_xp ?? 0)
  const [localFreeze, setLocalFreeze] = useState(
    () => dashData?.focusStats.freeze_count ?? 0
  )
  const [showTreeInfo, setShowTreeInfo] = useState(false)
  const [sharing, setSharing] = useState(false)
  const viewShotRef = useRef<ViewShot>(null)
  // step-16: dev-only preview toggle for the 4 hero background states — never
  // shown in production builds, lets the 4 variants be checked without
  // manipulating real streak data.
  const [devHeroOverride, setDevHeroOverride] = useState<{ theme: 'dark' | 'light'; health: 'healthy' | 'frozen' } | null>(null)

  async function shareCard() {
    if (!viewShotRef.current || sharing) return
    try {
      setSharing(true)
      const uri = await (viewShotRef.current as any).capture()
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Ulashish' })
    } catch {}
    finally { setSharing(false) }
  }
  const [calDays, setCalDays]   = useState<7 | 30>(7)
  const calDaysRef              = useRef<7 | 30>(7)
  const loadGenRef              = useRef(0)   // generation counter — stale responses are discarded

  const load = useCallback(async (isRefresh = false) => {
    const gen = ++loadGenRef.current
    if (!isRefresh) setLoading(true)
    setLoadError(null)
    try {
      const telegramId = useAuthStore.getState().user?.telegram_id
      const [res, stageRows] = await Promise.all([
        streaksApi.detail(telegramId, calDaysRef.current),
        focusStages.stages(),
      ])
      // A newer load() has already started — discard this stale response
      if (gen !== loadGenRef.current) return
      setLocalFreeze(res.freeze_count)
      setStages(stageRows)
      // Show streak-lost modal once per session when streak is broken.
      // Skip if the home screen already showed it (streakLostSeen in dashboardStore).
      const alreadyShown = useDashboardStore.getState().streakLostSeen
      if (!isRefresh && !hasShownLostRef.current && !alreadyShown && !res.is_active && res.streak_days > 0) {
        hasShownLostRef.current = true
        useDashboardStore.getState().markStreakLostSeen()
        setPrevStreakDays(res.streak_days)
        // Display 0 in the hero — the streak is gone; keep the raw value in prevStreakDays for the modal
        setData({ ...res, streak_days: 0 })
        setTimeout(() => setShowLostModal(true), 500)
      } else {
        setData(res)
        syncWidget(res.streak_days)
        const newStage = stageFromStreak(res.streak_days)
        if (newStage > prevStageRef.current) {
          prevStageRef.current = newStage
          setEvolutionStage(newStage as StageNumber)
          setEvolutionXp(stageRows.find(s => s.stage_number === newStage)?.bonus_xp ?? 0)
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
      if (gen !== loadGenRef.current) return
      const msg = e?.message ?? "Serverdan ma'lumot olishda xatolik"
      console.error('[StreakDetail] load error:', e)
      setLoadError(msg)
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
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
  const longestStreak = data?.longest_streak ?? dashData?.focusStats.longest_streak ?? 0
  const weekDays      = data?.week_days      ?? 0
  const freezeCount   = data?.freeze_count   ?? localFreeze

  const stage      = stageFromStreak(streakDays)
  // Match the dashboard: show frozen when past 20:00 and daily goal not yet met
  const todayM    = dashData?.focusStats?.today_minutes ?? 0
  const goalM     = dashData?.focusStats?.daily_goal ?? 20
  const isAtRisk  = !!(data?.is_active) && todayM < goalM && new Date().getHours() >= 20
  const treeState: TreeState = data
    ? (!data.is_active ? 'frozen' : isAtRisk ? 'frozen' : 'alive')
    : 'alive'

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

  // step-16: hero health — reuses the same treeState the tree itself uses, so
  // the background and the tree's frost coloring always transition together.
  const heroHealth: 'healthy' | 'frozen' = treeState === 'frozen' ? 'frozen' : 'healthy'
  const heroTheme  = devHeroOverride?.theme  ?? theme
  const heroHealthResolved = devHeroOverride?.health ?? heroHealth
  const nextTrackBg = 'rgba(255,255,255,0.10)'

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bgPrimary }]}>
      {/* API error banner — partial data from local stores is still shown.
          No separate top bar anymore (step-16) — give it its own inset padding. */}
      {loadError && (
        <View style={[styles.errorBanner, { backgroundColor: '#ff453a22', borderColor: '#ff453a44', paddingTop: insets.top + spacing.xs }]}>
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
        <View>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <StreakHeroBackground theme={heroTheme} health={heroHealthResolved} topInset={insets.top}>
            {(hc) => (
              <>
                {/* Floating header — replaces the old separate top bar so the
                    background can extend edge-to-edge under the status bar. */}
                <View style={styles.heroTopRow}>
                  <Pressable
                    style={styles.backBtn}
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
                    hitSlop={10}
                  >
                    <ChevronLeft size={22} color={hc.primary} />
                  </Pressable>
                  <Text style={[styles.topTitle, { color: hc.primary, fontFamily: typography.fontFamily.bold }]}>
                    Seriya
                  </Text>
                  <View style={styles.topRight}>
                    <Pressable
                      style={[styles.topIconBtn, { backgroundColor: hc.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(22,50,31,0.08)', borderColor: 'transparent' }]}
                      onPress={() => setShowTreeInfo(true)}
                      hitSlop={8}
                    >
                      <Info size={15} color={hc.secondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.topIconBtn, { backgroundColor: hc.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(22,50,31,0.08)', borderColor: 'transparent' }]}
                      onPress={() => router.push('/(screens)/tree-stages' as any)}
                      hitSlop={8}
                    >
                      <Map size={15} color={hc.secondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.topIconBtn, { backgroundColor: hc.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(22,50,31,0.08)', borderColor: 'transparent', opacity: sharing ? 0.5 : 1 }]}
                      onPress={shareCard}
                      disabled={sharing}
                      hitSlop={8}
                    >
                      <Share2 size={15} color={hc.secondary} />
                    </Pressable>
                  </View>
                </View>

                {__DEV__ && (
                  <View style={styles.devToggleRow}>
                    {([
                      { label: 'Aurora',  theme: 'dark' as const,  health: 'healthy' as const },
                      { label: 'A-Frost', theme: 'dark' as const,  health: 'frozen' as const  },
                      { label: 'Meadow',  theme: 'light' as const, health: 'healthy' as const },
                      { label: 'M-Frost', theme: 'light' as const, health: 'frozen' as const  },
                    ]).map(opt => (
                      <Pressable
                        key={opt.label}
                        onPress={() => setDevHeroOverride(
                          devHeroOverride?.theme === opt.theme && devHeroOverride?.health === opt.health
                            ? null
                            : { theme: opt.theme, health: opt.health }
                        )}
                        style={[
                          styles.devToggleBtn,
                          devHeroOverride?.theme === opt.theme && devHeroOverride?.health === opt.health && styles.devToggleBtnActive,
                        ]}
                      >
                        <Text style={styles.devToggleText}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.heroContent}>
                  {/* Stage chip */}
                  <View style={[styles.stageChip, { backgroundColor: hc.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(22,50,31,0.08)' }]}>
                    <Text style={[styles.stageChipText, { color: hc.isDark ? '#6fd6a8' : '#1f7a4d', fontFamily: typography.fontFamily.bold }]}>
                      {stageMeta.name.toUpperCase()} · BOSQICH {stage}
                    </Text>
                  </View>

                  <MagicTree stage={stage} state={treeState} size="auto" uid="sd_hero" />

                  {/* Big streak number */}
                  <View style={styles.heroTextRow}>
                    <Text style={styles.heroFlame}>🔥</Text>
                    <Text style={[styles.heroNum, { color: hc.primary, fontFamily: typography.fontFamily.bold }]}>
                      {streakDays}
                    </Text>
                  </View>
                  <Text style={[styles.heroLabel, { color: hc.secondary, fontFamily: typography.fontFamily.regular }]}>
                    kunlik seriya
                  </Text>

                  {/* Next-stage progress */}
                  {nextStageMeta && (
                    <View style={styles.nextStageWrap}>
                      <View style={styles.nextStageMeta}>
                        <Text style={[styles.nextStageLabel, { color: hc.secondary, fontFamily: typography.fontFamily.regular }]}>
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

                  <Text style={[styles.heroWatermark, { color: hc.faint, fontFamily: typography.fontFamily.medium }]}>
                    🌱 sahifalab.uz
                  </Text>
                </View>
              </>
            )}
          </StreakHeroBackground>
          </ViewShot>
        </View>

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

        {/* ── Bosqichlar (stage path) ──────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            🌳 Bosqichlar
          </Text>
          <StagesPath stages={stages} />
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
        onBuyFreeze={data?.can_freeze_if_purchased && !data?.can_freeze
          ? () => { setShowLostModal(false); setShowFreeze(true) }
          : undefined}
      />

      <EvolutionModal
        visible={showEvolution}
        toStage={evolutionStage}
        bonusXp={evolutionXp}
        onClose={() => setShowEvolution(false)}
      />

      <TreeInfoModal visible={showTreeInfo} onClose={() => setShowTreeInfo(false)} c={c} goalMinutes={goalM} />
    </View>
  )
}

// ── Tree info modal ───────────────────────────────────────────────────────────

function TreeInfoModal({ visible, onClose, c, goalMinutes }: {
  visible: boolean
  onClose: () => void
  c: ReturnType<typeof useTheme>['c']
  goalMinutes: number
}) {
  const insets       = useSafeAreaInsets()
  const [rendered, setRendered] = useState(visible)
  const backdropAnim = useRef(new Animated.Value(0)).current
  const slideAnim    = useRef(new Animated.Value(500)).current

  useEffect(() => {
    if (visible) {
      setRendered(true)
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim,    { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start(() => { setRendered(false); slideAnim.setValue(500) })
    }
  }, [visible])

  if (!rendered) return null

  return (
    <Modal visible={rendered} transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {/* Backdrop fades in independently */}
        <Animated.View style={[ti.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* Sheet slides up via spring */}
        <Animated.View style={[ti.sheetWrap, { transform: [{ translateY: slideAnim }] }]}>
          <View style={[ti.sheet, { backgroundColor: c.bgElevated }]}>
          {/* Handle */}
          <View style={[ti.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={ti.header}>
            <Text style={[ti.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              🌳 Jonli Daraxt nima?
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={[ti.scroll, { maxHeight: Dimensions.get('window').height * 0.6 }]} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
            {/* What is it */}
            <Text style={[ti.body, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Jonli Daraxt — sizning o'qish seriyangizni aks ettiruvchi tirik daraxt. Har kuni o'qisangiz daraxt o'sadi va yangi bosqichlarga o'tadi.
            </Text>

            {/* Rules */}
            <View style={[ti.card, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <InfoRow emoji="✅" title="O'stirish" desc="Kundalik maqsadingizni bajaring — daraxt o'sadi." c={c} />
              <InfoRow emoji="❄️" title="Muzlagan holat" desc="Bir kun o'tkazib yuborsangiz daraxt muzlaydi. 'Freeze' ishlatib ertasi kuni tiklang." c={c} />
              <InfoRow emoji="🥀" title="So'ligan holat" desc="Seriya uzilib dars qoldirsangiz daraxt so'liydi. Yangidan boshlash kerak." c={c} />
              <InfoRow emoji="🎯" title="Kunlik maqsad" desc={`Fokus taymer orqali ${goalMinutes} daqiqa o'qing — seriya saqlanadi. Taymer faqat faol o'qish vaqtini hisoblaydi.`} c={c} last />
            </View>

            {/* Stages */}
            <Text style={[ti.sectionTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
              10 ta bosqich
            </Text>
            {TREE_STAGES.map((s, i) => (
              <View
                key={s.id}
                style={[ti.stageRow, { borderBottomColor: c.border, borderBottomWidth: i < 9 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <Text style={[ti.stageNum, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
                  {s.id}
                </Text>
                <View style={ti.stageInfo}>
                  <Text style={[ti.stageName, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                    {s.name}
                  </Text>
                  <Text style={[ti.stageBlurb, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {s.blurb}
                  </Text>
                </View>
                <Text style={[ti.stageDays, { color: c.brand, fontFamily: typography.fontFamily.bold }]}>
                  {s.streakDays === 0 ? 'Boshlang\'ich' : `${s.streakDays}+ kun`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

function InfoRow({ emoji, title, desc, c, last }: {
  emoji: string; title: string; desc: string
  c: ReturnType<typeof useTheme>['c']
  last?: boolean
}) {
  return (
    <View style={[ti.infoRow, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={ti.infoEmoji}>{emoji}</Text>
      <View style={ti.infoText}>
        <Text style={[ti.infoTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          {title}
        </Text>
        <Text style={[ti.infoDesc, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {desc}
        </Text>
      </View>
    </View>
  )
}

const ti = StyleSheet.create({
  backdrop: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  sheet: {
    borderTopLeftRadius:  radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  title:   { fontSize: 17 },
  scroll:  { paddingHorizontal: spacing.lg },
  body:    { fontSize: 14, lineHeight: 22, marginBottom: spacing.base },

  card: {
    borderRadius: radius.lg,
    borderWidth:  1,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.sm, gap: spacing.sm },
  infoEmoji: { fontSize: 18, width: 26, textAlign: 'center', marginTop: 1 },
  infoText:  { flex: 1, gap: 2 },
  infoTitle: { fontSize: 13 },
  infoDesc:  { fontSize: 12, lineHeight: 18 },

  sectionTitle: { fontSize: 14, marginBottom: spacing.sm },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  stageNum:   { width: 20, fontSize: 12, textAlign: 'center' },
  stageInfo:  { flex: 1, gap: 2 },
  stageName:  { fontSize: 13 },
  stageBlurb: { fontSize: 11, lineHeight: 16 },
  stageDays:  { fontSize: 11, minWidth: 70, textAlign: 'right' },
})

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // step-16: floating header — replaces the old non-scrolling topBar so the
  // hero background can extend edge-to-edge under the status bar.
  heroTopRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  topTitle: { fontSize: typography.size.base, flex: 1 },

  scroll: {
    paddingBottom: spacing['2xl'],
    gap:           spacing.md,
  },

  // Hero content — fills ~40% of screen height, sits inside StreakHeroBackground
  heroContent: {
    alignItems:    'center',
    paddingTop:    spacing.sm,
    paddingBottom: spacing.lg,
    gap:           spacing.xs,
  },
  // step-16 dev-only preview row (__DEV__ gated, never shown in production)
  devToggleRow: {
    flexDirection:     'row',
    gap:               6,
    paddingHorizontal: spacing.base,
    marginTop:         6,
  },
  // Fixed dark chip regardless of the hero's current background — a debug
  // tool needs to stay visible across all 4 variants, not blend in with them.
  devToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.full,
    backgroundColor:   'rgba(0,0,0,0.55)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.25)',
  },
  devToggleBtnActive: { backgroundColor: 'rgba(245,166,35,0.9)', borderColor: 'rgba(245,166,35,0.9)' },
  devToggleText: { fontSize: 9, color: '#fff', fontWeight: '700' },
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
    // Android elevation forces a per-view rasterized shadow layer, recomposited
    // every scroll frame — up to 7 of these on screen at once (7-day view) makes
    // scrolling noticeably heavy. iOS shadows are cheap by comparison, so only
    // Android drops it.
    elevation:     Platform.OS === 'android' ? 0 : 5,
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
    // Up to 30 of these render at once in the 30-day grid — Android elevation
    // rasterizes a shadow layer per view and recomposites it every scroll
    // frame, which is the main source of scroll jank on this screen. iOS
    // shadows don't have that per-frame cost, so only Android drops it.
    elevation:      Platform.OS === 'android' ? 0 : 5,
  },
  todayGlowRing: {
    shadowOpacity: 0.9,
    shadowRadius:  10,
    elevation:     Platform.OS === 'android' ? 0 : 8,
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

  heroWatermark: {
    fontSize:      11,
    color:         'rgba(255,255,255,0.35)',
    textAlign:     'center',
    marginTop:     6,
    letterSpacing: 0.4,
  },
})
