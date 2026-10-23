/**
 * Bugun (Home) — redesign Phase 2, rebuilt in Phase 7.5 C to the v2 board:
 * the header row, the streak hero, today's plan as a 2×2 grid whose
 * "KEYINGI" tile is the one obvious action (getPrimaryAction), the weekly
 * rival ladder and one extra slot.
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
import { isMonday, localDateKey, nextTileKey, pickCurrentCourse } from '../../src/features/today/today'
import type { PlanCard } from '../../src/features/today/planCards'
import { estMinutes } from '../../src/features/flashcards/queueMath'
import { useMinuteClock } from '../../src/features/today/useMinuteClock'
import { TodayHeader } from '../../src/features/today/TodayHeader'
import { TodayHero } from '../../src/features/today/TodayHero'
import { TodayPlan } from '../../src/features/today/TodayPlan'
import { WeeklyRivalCard } from '../../src/features/today/WeeklyRivalCard'
import { ExtraSlot } from '../../src/features/today/ExtraSlot'
import { AnnouncementCard } from '../../src/features/today/AnnouncementCard'
import { QuestionLaunchCard } from '../../src/features/questions/QuestionLaunchCard'

/** Shortest timer the Fokus preset will set from Home. */
const MIN_FOCUS_PRESET = 5

export default function HomeTab() {
  const { colors } = useTheme()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const isOnline = useOnline()
  const now = useMinuteClock()
  const {
    fetch, refresh, refreshToday, loadLastWeek, data, loading, refreshing, error,
    streakLostSeen, markStreakLostSeen,
    atRiskModalShownCount, bumpAtRiskModalShown,
  } = useDashboardStore()

  // On focus, not just mount: the tabs stay mounted under the root Stack, so
  // returning from a lesson, quiz or review must re-check. fetch() is
  // TTL-gated; refreshToday() re-reads only the quiz and decks (throttled).
  useFocusEffect(useCallback(() => { fetch(); refreshToday(); loadLastWeek() }, [fetch, refreshToday, loadLastWeek]))

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
  const currentCourse = current?.courses
    ? {
        id: current.course_id, title: current.courses.title, progress: current.progress,
        totalLessons: current.courses.total_lessons ?? 0, cover: current.courses.thumbnail_url ?? null,
      }
    : null
  const topDeck = data.topDueDeck ?? null
  // Yours while it runs; otherwise a live one to join.
  const competition = data.competition ?? data.openCompetition ?? null
  const fresh = localDateKey(new Date(data.fetchedAt)) === localDateKey(new Date(now))

  const action = getPrimaryAction({
    todayMinutes,
    goalMinutes,
    streakDays: streak,
    streakState: data.streakState,
    freezeCount: data.focusStats.freeze_count ?? 0,
    hour: new Date(now).getHours(),
    quiz: quiz ? { state: quiz.state, theme: quiz.theme || null, answered: quiz.answered_count ?? 0 } : null,
    dueCards: data.hasDecks ? data.flashcardDueCount : 0,
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
  const openRanking = () => router.push('/(screens)/leaderboard' as any)

  // Preset the timer (only when idle): what's left of the goal, or the
  // minutes the ranking footer asks for.
  const openFocus = (minutes?: number) => {
    const preset = minutes ?? (Math.max(0, goalMinutes - todayMinutes) || goalMinutes)
    useTimerStore.getState().selectMinutes(Math.max(MIN_FOCUS_PRESET, preset))
    router.push('/(tabs)/study' as any)
  }

  // Every card opens its own task — the orange "next" one included (it's
  // the same task the primary action would open).
  function onPlanTile(card: PlanCard) {
    if (card.next) track('today_primary_action_tap', { action: card.type })
    if (card.type === 'focus') openFocus()
    else if (card.type === 'quiz') openQuiz()
    else if (card.type === 'cards') openReview()
    else if (card.type === 'competition') router.push(`/(screens)/challenge/${card.ref}` as any)
    else if (card.type === 'review') router.push('/(screens)/weekly-review' as any)
    else if (card.type === 'course' && typeof card.ref === 'number') openCourse(card.ref)
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
          hint={action.target === 'focus' ? { text: action.caption, tone: action.tone } : undefined}
          onPress={() => router.push('/(screens)/streak-detail' as any)}
          fresh={fresh}
        />

        <TodayPlan
          input={{
            focus: { minutes: todayMinutes, goal: goalMinutes },
            quiz: quiz ? {
              number: quiz.quiz_number, state: quiz.state, correct: quiz.correct_count,
              secondsLeft: quizSecondsLeft, answered: quiz.answered_count ?? 0, rank: quiz.my_rank ?? null,
            } : null,
            cards: data.hasDecks ? {
              due: data.flashcardDueCount, reviewed: data.flashcardReviewedToday ?? 0,
              estMinutes: estMinutes(data.flashcardDueCount),
            } : null,
            courses: data.enrolled
              .filter(e => e.courses)
              .map(e => ({ id: e.course_id, title: e.courses!.title, progress: e.progress, totalLessons: e.courses!.total_lessons ?? 0 })),
            competitions: competition ? [{
              id: competition.id, slug: competition.slug, title: competition.title, rank: competition.rank,
              participants: competition.participant_count, startsAt: competition.starts_at, endsAt: competition.ends_at,
              joined: !!data.competition,
            }] : [],
            review: { isNew: isMonday(new Date(now)), lastWeek: data.lastWeek?.minutes ?? null },
            nowMs: now,
          }}
          next={nextTileKey(action.target)}
          onOpen={onPlanTile}
        />

        <WeeklyRivalCard
          entries={data.leaderboard}
          around={data.leaderAround}
          myRank={data.myLeaderRank}
          total={data.leaderTotal}
          todayMinutes={todayMinutes}
          now={now}
          onAll={openRanking}
          onOpen={openRanking}
          onFocus={openFocus}
        />

        <ExtraSlot
          hasEnrolment={data.enrolled.length > 0}
          recommended={data.recommended[0] ?? null}
          onCourse={openCourse}
        />

        <QuestionLaunchCard />

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
    gap: space.lg,
  },
})
