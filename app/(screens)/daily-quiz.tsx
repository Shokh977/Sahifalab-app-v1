/**
 * 5 Savol play screen — redesign Phase 3a.
 *
 * Each tap locks the answer on the server (POST /api/quiz/answer) and
 * reveals it: the correct/wrong moment, then an explanation card and the
 * next button. Locked answers come back from GET /today, so leaving (or
 * killing the app) resumes at the next question. Against a backend without
 * /answer the screen falls back to the old flow: no per-answer reveal,
 * one submit at the end.
 */
import React, { useEffect, useRef, useState } from 'react'
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useReducedMotion } from 'react-native-reanimated'
import { CalendarClock, WifiOff, X } from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import { useRewardStore } from '../../stores/rewardStore'
import { useDashboardStore } from '../../stores/dashboardStore'
import { dailyQuiz, type DailyQuizAnswerResult, type DailyQuizToday } from '../../lib/api'
import { QuizResultView, type QuizFriend } from '../../components/daily-quiz/QuizResultView'
import { track } from '../../lib/analytics'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { haptics } from '../../src/lib/haptics'
import { EmptyState, IconButton, SkeletonBlock, SkeletonLine, ToastHost, showToast } from '../../src/components/ui'
import { AnswerOption, type AnswerState } from '../../src/features/quiz/AnswerOption'
import { ExplanationCard } from '../../src/features/quiz/ExplanationCard'
import { QuizProgress } from '../../src/features/quiz/QuizProgress'
import {
  feedbackTitle, isAnswerUnsupported, nextLabel, questionCounter, quizOverline, resumeIndex, segmentStates,
} from '../../src/features/quiz/quizPlay'

// Foreground-only play time per round, persisted so leaving the screen and
// coming back keeps what was already played. Its presence also marks a round
// this device already started (→ quiz_resume rather than quiz_start).
const activeKey = (quizId: number) => `sahifalab_quiz_active_ms_${quizId}`

/** Old flow (no /answer): how long the tapped option shows before moving on. */
const LEGACY_ADVANCE_MS = 250

type Phase = 'choose' | 'pending' | 'revealed'
type SubmitResult = {
  correct_count: number; tanga_awarded: number
  per_question_correct: boolean[]; elapsed_ms?: number; quiz_streak_days: number
}

export default function DailyQuizScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<DailyQuizToday | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('choose')
  const [picked, setPicked] = useState<number | null>(null)
  const [reveals, setReveals] = useState<Map<number, DailyQuizAnswerResult>>(new Map())
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [friends, setFriends] = useState<QuizFriend[]>([])
  const [fresh, setFresh] = useState(false)   // submitted in this visit → reveal moment
  const legacyRef = useRef(false)

  // ── Foreground-only timing (redesign Phase 0) ─────────────────────────────
  // The server's elapsed_ms runs from delivery to submit, background included;
  // this counts only time with the quiz on screen and the app in the
  // foreground. Refs + timestamps only: nothing re-renders while it runs.
  const activeMsRef = useRef(0)
  const activeSinceRef = useRef<number | null>(null)
  const timingQuizRef = useRef<number | null>(null)

  function pauseTiming() {
    if (activeSinceRef.current != null) {
      activeMsRef.current += Date.now() - activeSinceRef.current
      activeSinceRef.current = null
    }
    const qid = timingQuizRef.current
    if (qid != null) AsyncStorage.setItem(activeKey(qid), String(Math.round(activeMsRef.current))).catch(() => {})
  }

  function resumeTiming() {
    if (timingQuizRef.current != null && activeSinceRef.current == null && AppState.currentState === 'active') {
      activeSinceRef.current = Date.now()
    }
  }

  async function beginTiming(q: DailyQuizToday) {
    const stored = await AsyncStorage.getItem(activeKey(q.id)).catch(() => null)
    activeMsRef.current = stored ? Number(stored) || 0 : 0
    timingQuizRef.current = q.id
    track(stored != null ? 'quiz_resume' : 'quiz_start', { quiz_id: q.id, quiz_number: q.quiz_number }, q.id)
    if (stored == null) AsyncStorage.setItem(activeKey(q.id), '0').catch(() => {})
    resumeTiming()
  }

  /** Freezes the count for submit. The stored value stays until the submit
   *  succeeds, so a failed submit + retry still resumes from it. */
  function stopTiming(): number {
    pauseTiming()
    timingQuizRef.current = null
    return activeMsRef.current
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') resumeTiming()
      else pauseTiming()
    })
    return () => { sub.remove(); pauseTiming() }
  }, [])

  // The result ticket's "REYTING" is the caller's rank among today's solvers.
  // Results are only fetchable once this user has submitted.
  async function fetchRank(quizId: number) {
    try {
      const res = await dailyQuiz.results(quizId)
      setRank(res.caller?.rank ?? null)
      setFriends(res.friends ?? [])
    } catch {
      setRank(null)
    }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dailyQuiz.today()
      const q = res.quiz
      setQuiz(q)
      if (q?.state === 'submitted') {
        setResult({
          correct_count: q.correct_count ?? 0,
          tanga_awarded: q.tanga_awarded ?? 0,
          per_question_correct: q.per_question_correct ?? [],
          quiz_streak_days: q.quiz_streak_days ?? 0,
        })
        fetchRank(q.id)
      } else if (q) {
        // Resume: answers locked earlier (this or another device).
        const answered = q.answered ?? []
        setReveals(new Map(answered.map(a => [a.question_id, a])))
        setAnswers(Object.fromEntries(answered.map(a => [a.question_id, a.selected_index])))
        const ids = q.questions.map(x => x.question_id)
        const at = resumeIndex(ids, answered)
        if (at >= ids.length && ids.length > 0) {
          // Everything locked, not submitted yet: show the last reveal + "Natijani koʻrish".
          setIndex(ids.length - 1)
          setPhase('revealed')
        } else {
          setIndex(at)
          setPhase('choose')
        }
        beginTiming(q)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Yuklab boʻlmadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitAll(finalAnswers: Record<number, number>) {
    if (!quiz) return
    setSubmitting(true)
    try {
      const payload = quiz.questions.map(q => ({ question_id: q.question_id, selected_index: finalAnswers[q.question_id] }))
      const activeMs = stopTiming()
      const res = await dailyQuiz.submit(quiz.id, payload, activeMs)
      // Answers revealed one by one were already tracked at tap time; the
      // old flow (no /answer) still sends them here, in order.
      res.per_question_correct.forEach((correct, i) => {
        if (!reveals.has(quiz.questions[i]?.question_id)) track('quiz_answer', { quiz_id: quiz.id, index: i, correct }, quiz.id)
      })
      track('quiz_complete', { quiz_id: quiz.id, score: res.correct_count, active_ms: Math.round(activeMs) }, quiz.id)
      AsyncStorage.removeItem(activeKey(quiz.id)).catch(() => {})
      useDashboardStore.getState().patchQuiz({ state: 'submitted', correct_count: res.correct_count, answered_count: 0 })
      setFresh(true)
      setResult({
        correct_count: res.correct_count, tanga_awarded: res.tanga_awarded,
        per_question_correct: res.per_question_correct, elapsed_ms: res.elapsed_ms,
        quiz_streak_days: res.quiz_streak_days,
      })
      useAuthStore.getState().refreshUser()
      fetchRank(quiz.id)
      // tanga-economy-rework (092) Part 5 trigger point: after submission,
      // deferred so it doesn't fight the result reveal.
      setTimeout(() => useRewardStore.getState().check(), 600)
    } catch (e: any) {
      showToast('error', e?.message ?? 'Yuborib boʻlmadi')
    } finally {
      setSubmitting(false)
    }
  }

  function legacyAdvance(next: Record<number, number>) {
    if (!quiz) return
    setTimeout(() => {
      setPicked(null)
      if (index < quiz.questions.length - 1) {
        setIndex(index + 1)
        setPhase('choose')
      } else {
        submitAll(next)
      }
    }, LEGACY_ADVANCE_MS)
  }

  async function select(shownIndex: number) {
    if (!quiz || phase !== 'choose') return
    const q = quiz.questions[index]
    setPicked(shownIndex)
    setPhase('pending')

    if (legacyRef.current) {
      const next = { ...answers, [q.question_id]: shownIndex }
      setAnswers(next)
      legacyAdvance(next)
      return
    }

    try {
      const r = await dailyQuiz.answer(quiz.id, q.question_id, shownIndex)
      setReveals(prev => new Map(prev).set(q.question_id, r))
      setAnswers(prev => ({ ...prev, [q.question_id]: r.selected_index }))
      setPhase('revealed')
      if (r.correct) haptics.light()
      else haptics.error()
      track('quiz_answer', { quiz_id: quiz.id, index, correct: r.correct }, quiz.id)
      useDashboardStore.getState().patchQuiz({ state: 'in_progress', answered_count: r.answered_count ?? index + 1 })
    } catch (e: any) {
      if (isAnswerUnsupported(e?.message)) {
        // Backend without /answer yet: finish this round the old way.
        legacyRef.current = true
        const next = { ...answers, [q.question_id]: shownIndex }
        setAnswers(next)
        legacyAdvance(next)
        return
      }
      showToast('error', e?.message ?? 'Javob yuborilmadi. Qayta urinib koʻring.')
      setPicked(null)
      setPhase('choose')
    }
  }

  function next() {
    if (!quiz) return
    if (index >= quiz.questions.length - 1) {
      submitAll(answers)
      return
    }
    setIndex(index + 1)
    setPicked(null)
    setPhase('choose')
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))

  // ── Render ───────────────────────────────────────────────────────────────
  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.xxs }]}>
      <IconButton icon={X} accessibilityLabel="Yopish (javoblar saqlanadi)" onPress={close} />
      <View style={styles.headerText}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]} numberOfLines={1}>
          {quiz ? quizOverline(quiz.quiz_number, quiz.theme) : '5 SAVOL'}
        </Text>
        {quiz && !result && quiz.questions.length > 0 ? (
          <Text style={[typeScale.callout, { color: colors.text }]}>{questionCounter(index, quiz.questions.length)}</Text>
        ) : null}
      </View>
      <View style={styles.headerSide} />
    </View>
  )

  let body: React.ReactNode
  if (loading) {
    body = (
      <View style={styles.play}>
        <SkeletonBlock height={space.xs} />
        <SkeletonLine width="90%" />
        <SkeletonLine width="60%" />
        {[0, 1, 2, 3].map(i => <SkeletonBlock key={i} height={space.huge} />)}
      </View>
    )
  } else if (error) {
    body = (
      <EmptyState
        icon={WifiOff}
        title="Savollar yuklanmadi"
        body={error}
        action={{ label: 'Qayta urinish', onPress: load }}
      />
    )
  } else if (!quiz) {
    body = (
      <EmptyState icon={CalendarClock} title="Bugungi savollar hali tayyor emas" body="Birozdan soʻng qayta tekshiring." />
    )
  } else if (result) {
    body = <QuizResultView quiz={quiz} result={result} rank={rank} friends={friends} fresh={fresh} />
  } else {
    const q = quiz.questions[index]
    const ids = quiz.questions.map(x => x.question_id)
    const verdicts = new Map<number, boolean | null>()
    for (const id of ids) {
      if (reveals.has(id)) verdicts.set(id, reveals.get(id)!.correct)
      else if (answers[id] != null) verdicts.set(id, null)
    }
    const r = reveals.get(q.question_id)
    const isLast = index >= quiz.questions.length - 1
    const stateFor = (j: number): AnswerState => {
      if (phase === 'pending') return j === picked ? 'pending' : 'idle'
      if (phase === 'revealed' && r) {
        if (j === r.selected_index) return r.correct ? 'correct' : 'wrong'
        if (!r.correct && j === r.correct_index) return 'reveal'
        return 'dim'
      }
      return 'idle'
    }
    const correctText = r && r.correct_index != null ? q.options[r.correct_index] ?? null : null

    body = (
      <ScrollView contentContainerStyle={[styles.play, { paddingBottom: insets.bottom + space.xl }]} showsVerticalScrollIndicator={false}>
        <QuizProgress states={segmentStates(ids, verdicts, index)} />
        <Text style={[typeScale.title2, { color: colors.text }]} accessibilityRole="header">{q.question_text}</Text>
        <View style={styles.options}>
          {q.options.map((opt, j) => (
            <AnswerOption
              key={`${q.question_id}-${j}`}
              index={j}
              text={opt}
              state={stateFor(j)}
              disabled={phase !== 'choose' || submitting}
              onPress={() => select(j)}
            />
          ))}
        </View>
        {phase === 'revealed' && (
          <ExplanationCard
            key={q.question_id}
            correct={r ? r.correct : null}
            title={r ? feedbackTitle(r.correct, r.tanga_per_correct, correctText) : null}
            explanation={r?.explanation ?? null}
            nextLabel={nextLabel(isLast)}
            onNext={next}
            loading={submitting}
            reduceMotion={reduceMotion}
          />
        )}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {header}
      {body}
      <ToastHost />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xxs },
  headerText: { flex: 1, alignItems: 'center', gap: 2 },
  headerSide: { width: layout.minTouch },
  play: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.lg },
  options: { gap: space.sm },
})
