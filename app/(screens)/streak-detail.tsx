import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Animated, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Map, Info, X, Share2 } from 'lucide-react-native'
import ViewShot, { type ViewShotRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { streaks as streaksApi, focusStages } from '../../lib/api'
import type { StreakDetail } from '../../lib/api'
import { FreezeSheet } from '../../components/streak/FreezeSheet'
import { StreakLostModal } from '../../components/streak/StreakLostModal'
import { StreakAtRiskModal } from '../../components/streak/StreakAtRiskModal'
import { EvolutionModal } from '../../components/streak/EvolutionModal'
import { MyMagicTree } from '../../components/streak/MyMagicTree'
import { StreakHeroBackground } from '../../components/streak/StreakHeroBackground'
import { stageFromStreak, TREE_STAGES } from '../../lib/treeTheme'
import type { TreeState, StageNumber } from '../../lib/treeTheme'
import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useStreakStagesStore } from '../../stores/streakStagesStore'
import { syncWidget } from '../../lib/syncWidget'
import { StreakCalendar } from '../../src/features/streak/StreakCalendar'
import { GaugeDigits, MoodStatus, StreakFlame, useFlameOpacity, useMoodColors } from '../../src/features/streak/StreakGauge'
import { streakMood } from '../../src/features/streak/streakMood'
import { localDateKey } from '../../src/features/today/today'
import { fonts, type as typeScale } from '../../src/design/typography'
import { moveSpring, moveTiming } from '../../src/design/rnMotion'
import ReAnimated, { useAnimatedStyle } from 'react-native-reanimated'

let Haptics: any = null
try { Haptics = require('expo-haptics') } catch {}



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
  const [showAtRiskModal, setShowAtRiskModal] = useState(false)
  const [prevStreakDays, setPrevStreakDays] = useState(0)
  const [showEvolution,  setShowEvolution]  = useState(false)
  const [evolutionStage, setEvolutionStage] = useState<StageNumber>(1)
  const [evolutionXp,    setEvolutionXp]    = useState(0)
  const [evolutionTanga, setEvolutionTanga] = useState(0)
  const hasShownLostRef    = useRef(false)
  const hasShownAtRiskRef  = useRef(false)
  const prevStageRef       = useRef<number>(
    stageFromStreak(dashData?.focusStats.streak_days ?? user?.streak_days ?? 0)
  )
  const [localTanga, setLocalTanga]   = useState(user?.tanga_balance ?? 0)
  const [localFreeze, setLocalFreeze] = useState(
    () => dashData?.focusStats.freeze_count ?? 0
  )
  const [showTreeInfo, setShowTreeInfo] = useState(false)
  const [sharing, setSharing] = useState(false)
  const viewShotRef = useRef<ViewShotRef>(null)
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
      // The backend never resets streak_days to 0 on loss — it stays at its
      // last pre-loss value until the user studies again (see
      // dashboardStore.ts). This zero-out must be unconditional on
      // streak_state === 'lost', not tied to whether the one-time "just
      // lost" modal has already fired — a prior version only zeroed it
      // inside that modal's own branch, so every load AFTER the modal had
      // already shown once (a refresh, reopening the screen, a new day) fell
      // through to the raw un-zeroed res.streak_days, including the value
      // synced to the home-screen widget below. Found live: a user's streak
      // stayed stuck at its old count for weeks after going inactive.
      const isLost = res.streak_state === 'lost'
      const displayStreakDays = isLost ? 0 : res.streak_days
      // Show streak-lost modal once per session when the streak is genuinely
      // gone (streak_state === 'lost') — NOT for 'at_risk', which is still
      // fully recoverable (P2). Skip if the home screen already showed it.
      const alreadyShownLost = useDashboardStore.getState().streakLostSeen
      if (!isRefresh && !hasShownLostRef.current && !alreadyShownLost && isLost && res.streak_days > 0) {
        hasShownLostRef.current = true
        useDashboardStore.getState().markStreakLostSeen()
        setPrevStreakDays(res.streak_days)
        // Display 0 in the hero — the streak is gone; keep the raw value in prevStreakDays for the modal
        setData({ ...res, streak_days: 0 })
        setTimeout(() => setShowLostModal(true), 500)
      } else {
        setData({ ...res, streak_days: displayStreakDays })
        syncWidget(displayStreakDays)
        const newStage = stageFromStreak(displayStreakDays)
        if (newStage > prevStageRef.current) {
          prevStageRef.current = newStage
          setEvolutionStage(newStage as StageNumber)
          const reachedStage = stageRows.find(s => s.stage_number === newStage)
          setEvolutionXp(reachedStage?.bonus_xp ?? 0)
          setEvolutionTanga(reachedStage?.bonus_tanga ?? 0)
          setTimeout(() => setShowEvolution(true), 400)
        } else {
          prevStageRef.current = newStage
        }
        // At-risk modal may reappear once more per session while the window
        // is open — atRiskModalShownCount lives in dashboardStore so it's
        // shared with the home tab's own at-risk effect.
        const shownCount = useDashboardStore.getState().atRiskModalShownCount
        if (!isRefresh && !hasShownAtRiskRef.current && res.streak_state === 'at_risk' && shownCount < 2) {
          hasShownAtRiskRef.current = true
          useDashboardStore.getState().bumpAtRiskModalShown()
          setTimeout(() => setShowAtRiskModal(true), 500)
        }
      }
      // Sync fresh data to dashboardStore so banner/hero on the home tab stay consistent
      useDashboardStore.getState().patchFocusStats({
        streak_days:    displayStreakDays,
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
  useEffect(() => { setLocalTanga(user?.tanga_balance ?? 0) }, [user?.tanga_balance])

  function handlePurchased(newTanga: number, newFreezeCount: number) {
    setLocalTanga(newTanga)
    setLocalFreeze(newFreezeCount)
    if (data) setData({ ...data, freeze_count: newFreezeCount, tanga_balance: newTanga })
    useDashboardStore.getState().patchFocusStats({ freeze_count: newFreezeCount })
    useAuthStore.getState().patchUser({ tanga_balance: newTanga })
  }

  async function handleUseFreeze() {
    try {
      const res = await streaksApi.useFreeze()
      Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success)
      setLocalFreeze(res.freeze_count)
      if (data) setData({ ...data, streak_days: res.streak_days, freeze_count: res.freeze_count, is_active: true, streak_state: 'frozen_today' })
      useDashboardStore.getState().patchFocusStats({
        streak_days:  res.streak_days,
        freeze_count: res.freeze_count,
      })
      setShowLostModal(false)
      setShowAtRiskModal(false)
      load(true)
    } catch {
      setShowLostModal(false)
      setShowAtRiskModal(false)
    }
  }

  function handleStudyNow() {
    setShowAtRiskModal(false)
    router.push('/(tabs)/study' as any)
  }

  // Prefer API data; fall back to dashboardStore → authStore for key fields
  const streakDays    = data?.streak_days    ?? dashData?.focusStats.streak_days    ?? user?.streak_days ?? 0
  const longestStreak = data?.longest_streak ?? dashData?.focusStats.longest_streak ?? 0
  const weekDays      = data?.week_days      ?? 0
  const freezeCount   = data?.freeze_count   ?? localFreeze

  const stage  = stageFromStreak(streakDays)
  const goalM  = dashData?.focusStats?.daily_goal ?? 20
  // Today's gauge, same as the Bugun hero (StreakGauge): minutes from the
  // dashboard when it was fetched today; a studied calendar day also counts.
  const todayKey      = localDateKey(new Date())
  const dashIsToday   = dashData ? localDateKey(new Date(dashData.fetchedAt)) === todayKey : false
  const todayMinutes  = dashIsToday ? dashData?.focusStats.today_minutes ?? 0 : 0
  const todayStudied  = data?.calendar.some(d => d.date === todayKey && d.status === 'studied') ?? false
  const todayProgress = todayStudied ? 1 : Math.min(1, todayMinutes / (goalM > 0 ? goalM : 20))
  const mood          = streakMood(data?.streak_state, todayProgress >= 1, streakDays)
  const moodColors    = useMoodColors()
  const flameOpacity  = useFlameOpacity(mood, todayProgress)
  const flameStyle    = useAnimatedStyle(() => ({ opacity: flameOpacity.get() }))

  // Frost means 'frozen_today' (protected) exclusively, never "danger";
  // 'at_risk' gets its own warm wilting treatment (MagicTree.tsx / plan doc
  // P4). Meeting today's goal wins over a stale server state.
  const treeState: TreeState = mood === 'at_risk' ? 'at_risk'
    : mood === 'frozen' ? 'frozen'
    : mood === 'lost' && data?.streak_state === 'lost' ? 'dead' : 'alive'

  // Next-stage progress
  const stageMeta     = TREE_STAGES[stage - 1]
  const nextStageMeta = TREE_STAGES[stage] ?? null   // null when stage 10
  const nextStagePct  = nextStageMeta
    ? Math.min(100, Math.round((streakDays / nextStageMeta.streakDays) * 100))
    : 100
  const daysToNext = nextStageMeta ? nextStageMeta.streakDays - streakDays : 0


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
                  <Pressable accessibilityRole="button" accessibilityLabel="Orqaga"
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
                    <Pressable accessibilityRole="button" accessibilityLabel="Jonli daraxt haqida"
                      style={[styles.topIconBtn, { backgroundColor: hc.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(22,50,31,0.08)', borderColor: 'transparent' }]}
                      onPress={() => setShowTreeInfo(true)}
                      hitSlop={8}
                    >
                      <Info size={15} color={hc.secondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.topIconBtn, { backgroundColor: hc.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(22,50,31,0.08)', borderColor: 'transparent' }]}
                      onPress={() => router.push(`/(screens)/tree-stages?days=${streakDays}` as any)}
                      accessibilityRole="button"
                      accessibilityLabel="Daraxt yoʻli"
                      hitSlop={8}
                    >
                      <Map size={15} color={hc.secondary} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Ulashish"
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

                  <MyMagicTree stage={stage} state={treeState} size="auto" uid="sd_hero" />

                  {/* Big streak number */}
                  <View style={styles.heroTextRow} accessible accessibilityLabel={`${streakDays} kunlik seriya`}>
                    <ReAnimated.View style={flameStyle}>
                      <StreakFlame flat={moodColors.flameFlat(mood)} width={36} height={44} />
                    </ReAnimated.View>
                    <GaugeDigits value={streakDays} mood={mood} progress={todayProgress} textStyle={styles.heroNum} />
                  </View>
                  <MoodStatus mood={mood} textStyle={typeScale.body} size={16} />

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

          <StreakCalendar days={data?.calendar} range={calDays} todayDone={todayProgress >= 1} />
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

          {/* Rule hint — persistent banner when a freeze just saved the streak:
              the streak is safe, but today's goal still has to be met or it's
              at risk again tomorrow (previously this only existed as a code
              comment, see plan doc G.4). */}
          {data?.streak_state === 'frozen_today' ? (
            <Text style={[styles.freezeRule, { color: '#60a5fa', fontFamily: typography.fontFamily.medium }]}>
              🧊 Seriyangiz freeze bilan saqlandi — bugun o'qib davom eting, aks holda ertaga yana xavf ostida qoladi.
            </Text>
          ) : (
            <Text style={[styles.freezeRule, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
              💡 Har kuni o'qisangiz seriya davom etadi. 1 kun o'tkazib yuborsangiz — hali xavfsiz. 2-kun o'tmasdan freeze ishlatib saqlab qoling.
            </Text>
          )}

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

      </ScrollView>

      <FreezeSheet
        visible={showFreeze}
        currentTanga={localTanga}
        freezeCount={freezeCount}
        packages={data?.freeze_packages ?? []}
        onClose={() => setShowFreeze(false)}
        onPurchased={handlePurchased}
        consecutiveFreezesUsed={data?.consecutive_freezes_used ?? 0}
        maxConsecutiveFreezes={data?.max_consecutive_freezes ?? 2}
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

      <StreakAtRiskModal
        visible={showAtRiskModal}
        streakDays={streakDays}
        freezeCount={freezeCount}
        windowClosesAt={data?.window_closes_at ?? null}
        onClose={() => setShowAtRiskModal(false)}
        onUseFreeze={data?.can_freeze ? handleUseFreeze : undefined}
        onBuyFreeze={data?.can_freeze_if_purchased && !data?.can_freeze
          ? () => { setShowAtRiskModal(false); setShowFreeze(true) }
          : undefined}
        onStudyNow={handleStudyNow}
      />

      <EvolutionModal
        visible={showEvolution}
        toStage={evolutionStage}
        bonusXp={evolutionXp}
        bonusTanga={evolutionTanga}
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
        moveSpring(slideAnim,    { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        moveTiming(slideAnim,    { toValue: 500, duration: 200, useNativeDriver: true }),
      ]).start(() => { setRendered(false); slideAnim.setValue(500) })
    }
  }, [visible])

  if (!rendered) return null

  return (
    <Modal visible={rendered} transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {/* Backdrop fades in independently */}
        <Animated.View style={[ti.backdrop, { opacity: backdropAnim }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Yopish" style={{ flex: 1 }} onPress={onClose} />
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
            <Pressable accessibilityRole="button" accessibilityLabel="Yopish" onPress={onClose} hitSlop={10}>
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
              <InfoRow emoji="🍂" title="Xavf ostida" desc="1 kun o'tkazib yuborsangiz daraxt so'la boshlaydi — hali xavfsiz. Freeze bor bo'lsa, tunda avtomatik ishlatiladi." c={c} />
              <InfoRow emoji="❄️" title="Muzlagan holat" desc="Freeze seriyangizni saqlab qoldi. Bugun o'qing — aks holda ertaga yana xavf ostida qoladi." c={c} />
              <InfoRow emoji="🥀" title="So'ligan holat" desc="2 kun o'tkazib yuborsangiz seriya uziladi. Yangidan boshlash kerak." c={c} />
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
    alignItems:    'center',
    gap:           6,
    marginTop:     spacing.sm,
  },
  heroNum: {
    fontFamily:    fonts.extrabold,
    fontSize:      52,
    lineHeight:    56,
    letterSpacing: -1.5,
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
