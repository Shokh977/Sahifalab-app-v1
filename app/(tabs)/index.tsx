/**
 * Bugun (Home) — redesign Phase 2. One obvious action (getPrimaryAction),
 * today's plan, the weekly rank teaser and one extra slot.
 *
 * Loading: the persisted dashboard cache renders first and refreshes in the
 * background; skeletons only when there is no cache at all.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { WifiOff } from 'lucide-react-native'

import { useAuthStore } from '../../stores/authStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useTimerStore } from '../../stores/timerStore'
import { useOnline } from '../../hooks/useOnline'
import { streaks as streaksApi } from '../../lib/api'
import { track } from '../../lib/analytics'
import { StreakLostModal } from '../../components/streak/StreakLostModal'
import { StreakAtRiskModal } from '../../components/streak/StreakAtRiskModal'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { Card, EmptyState, SkeletonRow } from '../../src/components/ui'
import { getPrimaryAction } from '../../src/features/today/primaryAction'
import { localDateKey, pickCurrentCourse, rankGap, type PlanRowKey } from '../../src/features/today/today'
import { useMinuteClock } from '../../src/features/today/useMinuteClock'
import { TodayHeader } from '../../src/features/today/TodayHeader'
import { TodayHero } from '../../src/features/today/TodayHero'
import { TodayPlan } from '../../src/features/today/TodayPlan'
import { RankTeaser } from '../../src/features/today/RankTeaser'
import { ExtraSlot } from '../../src/features/today/ExtraSlot'
import { AnnouncementCard } from '../../src/features/today/AnnouncementCard'

/** Shortest timer the Fokus preset will set from Home. */
const MIN_FOCUS_PRESET = 5

export default function HomeTab() {
  const { colors } = useTheme()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const isOnline = useOnline()
  const now = useMinuteClock()
  const {
    fetch, refresh, refreshToday, data, loading, refreshing, error,
    streakLostSeen, markStreakLostSeen,
    atRiskModalShownCount, bumpAtRiskModalShown,
  } = useDashboardStore()

  // On focus, not just mount: the tabs stay mounted under the root Stack, so
  // returning from a lesson, quiz or review must re-check. fetch() is
  // TTL-gated; refreshToday() re-reads only the quiz and decks (throttled).
  useFocusEffect(useCallback(() => { fetch(); refreshToday() }, [fetch, refreshToday]))

  // ── Streak-lost modal ────────────────────────────────────────────────────
  const shownLostRef = useRef(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [prevStreakDays, setPrevStreakDays] = useState(0)

  useEffect(() => {
    if (!data?.streakJustLost || streakLostSeen || shownLostRef.current) return
    shownLostRef.current = true
    markStreakLostSeen()
    setPrevStreakDays(data.streakLostPrevDays ?? 0)
    const t = setTimeout(() => setShowLostModal(true), 800)
    return () => clearTimeout(t)
  }, [data?.streakJustLost, data?.streakLostPrevDays, streakLostSeen, markStreakLostSeen])

  // ── Streak-at-risk modal ─────────────────────────────────────────────────
  // May reappear once more per session while the window stays open; the
  // count resets in dashboardStore when streak_state leaves 'at_risk'.
  const [showAtRiskModal, setShowAtRiskModal] = useState(false)
  useEffect(() => {
    if (!data?.streakAtRisk || atRiskModalShownCount >= 2) return
    bumpAtRiskModalShown()
    const t = setTimeout(() => setShowAtRiskModal(true), 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.streakAtRisk])

  async function handleUseFreeze() {
    try { await streaksApi.useFreeze() } catch {}
    setShowLostModal(false)
    setShowAtRiskModal(false)
    refresh()
  }

  function handleBuyFreeze() {
    setShowLostModal(false)
    setShowAtRiskModal(false)
    router.push('/(screens)/streak-detail' as any)
  }

  function handleStudyNow() {
    setShowAtRiskModal(false)
    router.push('/(tabs)/study' as any)
  }

  // ── No data yet: skeleton, or an error with retry ────────────────────────
  if (!data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <TodayHeader offline={!isOnline} now={now} />
        {error && !loading ? (
          <EmptyState
            icon={WifiOff}
            title="Maʼlumot yuklanmadi"
            body={isOnline ? 'Birozdan soʻng qayta urinib koʻring.' : 'Internet aloqasini tekshiring.'}
            action={{ label: 'Qayta urinish', onPress: () => { refresh() } }}
          />
        ) : (
          <View style={styles.content}>
            <Card variant="hero" loading />
            <Card>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </Card>
          </View>
        )}
      </View>
    )
  }

  // ── Derived state ────────────────────────────────────────────────────────
  // focusStats.streak_days may be a stale 0 while authStore has the real
  // value; a 'lost' streak is deliberately zeroed and must win outright.
  const streak = data.streakState === 'lost'
    ? 0
    : data.focusStats.streak_days > 0 ? data.focusStats.streak_days : (user?.streak_days ?? 0)
  const goalMinutes = data.focusStats.daily_goal > 0 ? data.focusStats.daily_goal : (user?.daily_goal_minutes ?? 20)
  const todayMinutes = data.focusStats.today_minutes ?? 0
  const quiz = data.quiz ?? null
  const quizSecondsLeft = quiz
    ? Math.max(0, quiz.seconds_remaining - Math.floor((now - (data.quizFetchedAt ?? now)) / 1000))
    : 0
  const current = pickCurrentCourse(data.enrolled)
  const currentCourse = current?.courses ? { id: current.course_id, title: current.courses.title, progress: current.progress } : null
  const topDeck = data.topDueDeck ?? null
  const fresh = localDateKey(new Date(data.fetchedAt)) === localDateKey(new Date(now))

  const action = getPrimaryAction({
    todayMinutes,
    goalMinutes,
    streakDays: streak,
    streakState: data.streakState,
    freezeCount: data.focusStats.freeze_count ?? 0,
    hour: new Date(now).getHours(),
    quiz: quiz ? { state: quiz.state, theme: quiz.theme || null } : null,
    dueCards: topDeck?.due ?? 0,
    course: currentCourse,
  })

  // ── Navigation ───────────────────────────────────────────────────────────
  const openQuiz = () => {
    if (quiz) router.push({ pathname: '/(screens)/daily-quiz', params: { quizId: String(quiz.id) } } as any)
  }
  const openReview = () => {
    if (topDeck) router.push(`/(screens)/flashcard-study/${topDeck.id}` as any)
    else router.push('/(tabs)/flashcards' as any)
  }
  const openCourse = (id: number) => router.push(`/(screens)/course/${id}` as any)

  function onPrimary() {
    track('today_primary_action_tap', { action: action.target })
    switch (action.target) {
      case 'focus': {
        // Preset the timer to what's left of the goal (only when idle).
        useTimerStore.getState().selectMinutes(Math.max(MIN_FOCUS_PRESET, action.minutesLeft ?? goalMinutes))
        router.push('/(tabs)/study' as any)
        break
      }
      case 'quiz': openQuiz(); break
      case 'review': openReview(); break
      case 'course': if (currentCourse) openCourse(currentCourse.id); break
      default: break
    }
  }

  function onPlanRow(key: PlanRowKey) {
    if (key === 'quiz') openQuiz()
    else if (key === 'cards') openReview()
    else if (currentCourse) openCourse(currentCourse.id)
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <TodayHeader offline={!isOnline} now={now} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { refresh() }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <TodayHero
          streak={streak}
          streakState={data.streakState}
          todayMinutes={todayMinutes}
          goalMinutes={goalMinutes}
          weekCalendar={data.weekCalendar}
          action={action}
          onAction={onPrimary}
          onTreePress={() => router.push('/(screens)/streak-detail' as any)}
          fresh={fresh}
        />

        <TodayPlan
          input={{
            quiz: quiz ? { number: quiz.quiz_number, state: quiz.state, correct: quiz.correct_count, secondsLeft: quizSecondsLeft } : null,
            dueCards: data.hasDecks === undefined ? null : data.hasDecks ? data.flashcardDueCount : null,
            course: currentCourse,
          }}
          onOpen={onPlanRow}
        />

        <RankTeaser
          gap={rankGap(data.leaderboard, data.myLeaderRank)}
          onPress={() => router.push('/(tabs)/musobaqalar' as any)}
        />

        <ExtraSlot
          now={now}
          hasEnrolment={data.enrolled.length > 0}
          recommended={data.recommended[0] ?? null}
          onWeeklyReview={() => router.push('/(screens)/weekly-review' as any)}
          onCourse={openCourse}
        />

        <AnnouncementCard />
      </ScrollView>

      <StreakLostModal
        visible={showLostModal}
        prevStreak={prevStreakDays}
        freezeCount={data.focusStats.freeze_count ?? 0}
        onClose={() => setShowLostModal(false)}
        onUseFreeze={data.streakLostCanFreeze ? handleUseFreeze : undefined}
        onBuyFreeze={data.streakLostCanBuyFreeze ? handleBuyFreeze : undefined}
      />

      <StreakAtRiskModal
        visible={showAtRiskModal}
        streakDays={data.focusStats.streak_days ?? 0}
        freezeCount={data.focusStats.freeze_count ?? 0}
        windowClosesAt={data.windowClosesAt ?? null}
        onClose={() => setShowAtRiskModal(false)}
        onUseFreeze={data.streakCanFreeze ? handleUseFreeze : undefined}
        onBuyFreeze={data.streakCanBuyFreeze ? handleBuyFreeze : undefined}
        onStudyNow={handleStudyNow}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: space.xs,
    paddingBottom: space.xxl,
    gap: layout.sectionGap,
  },
})
