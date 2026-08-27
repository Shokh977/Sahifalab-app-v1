import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, Clock } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { challenges as challengesApi } from '../../lib/api'
import { dailyQuiz, type DailyQuizToday } from '../../lib/api'
import { typography, spacing, radius } from '../../lib/constants'
import { QuizResultView } from '../../components/daily-quiz/QuizResultView'

function fmtCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function DailyQuizScreen() {
  const { c }  = useTheme()
  const router = useRouter()

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [quiz, setQuiz]         = useState<DailyQuizToday | null>(null)
  const [index, setIndex]       = useState(0)
  const [answers, setAnswers]   = useState<Record<number, number>>({})
  const [picked, setPicked]     = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    correct_count: number; tanga_awarded: number
    per_question_correct: boolean[]; elapsed_ms?: number; quiz_streak_days: number
  } | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dailyQuiz.today()
      setQuiz(res.quiz)
      if (res.quiz) setSecondsLeft(res.quiz.seconds_remaining)
      if (res.quiz?.state === 'submitted') {
        // GET /today doesn't carry the full breakdown (per-question marks,
        // streak) — the submit endpoint's "already_submitted" branch
        // returns the ORIGINAL cached result without rescoring, so this is
        // a safe, idempotent way to fetch it (empty answers are ignored
        // on that branch — see daily_quiz_service.score_and_submit).
        const full = await dailyQuiz.submit(res.quiz.id, [])
        setResult({
          correct_count: full.correct_count, tanga_awarded: full.tanga_awarded,
          per_question_correct: full.per_question_correct, elapsed_ms: full.elapsed_ms,
          quiz_streak_days: full.quiz_streak_days,
        })
      }
      challengesApi.mine().then(mine => {
        const active = mine.find(x => x.status === 'active' && !x.completed_at && !x.is_winner && !x.failed_at)
        setRank(active?.rank ?? null)
      }).catch(() => {})
    } catch (e: any) {
      setError(e?.message ?? "Yuklab bo'lmadi")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Live countdown tick for the status block's clock + the tertiary link's
  // lock state — a plain per-second re-render, no animated digit transition
  // (reduce-motion has nothing to skip here beyond that).
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(s => (s != null && s > 0 ? s - 1 : s))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  async function submitAll(finalAnswers: Record<number, number>) {
    if (!quiz) return
    setSubmitting(true)
    try {
      const payload = quiz.questions.map(q => ({ question_id: q.question_id, selected_index: finalAnswers[q.question_id] }))
      const res = await dailyQuiz.submit(quiz.id, payload)
      setResult({
        correct_count: res.correct_count, tanga_awarded: res.tanga_awarded,
        per_question_correct: res.per_question_correct, elapsed_ms: res.elapsed_ms,
        quiz_streak_days: res.quiz_streak_days,
      })
      useAuthStore.getState().refreshUser()
    } catch (e: any) {
      setError(e?.message ?? "Yuborib bo'lmadi")
    } finally {
      setSubmitting(false)
    }
  }

  function selectOption(shownIndex: number) {
    if (!quiz || picked !== null) return
    const q = quiz.questions[index]
    setPicked(shownIndex)
    const next = { ...answers, [q.question_id]: shownIndex }
    setAnswers(next)

    setTimeout(() => {
      setPicked(null)
      if (index < quiz.questions.length - 1) {
        setIndex(index + 1)
      } else {
        submitAll(next)
      }
    }, 250)
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[s.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))} hitSlop={12} style={s.navBtn}>
          <ChevronLeft size={24} color={c.accentPrimary} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {quiz ? `5 SAVOL #${quiz.quiz_number}` : '5 Savol'}
        </Text>
        <View style={s.navBtn} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={c.accentPrimary} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={[s.stateBody, { color: c.textSecondary }]}>{error}</Text>
          <Pressable onPress={load} style={[s.retryBtn, { backgroundColor: c.accentPrimary }]}>
            <Text style={s.retryText}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : !quiz ? (
        <View style={s.center}>
          <Text style={s.stateIcon}>🗓️</Text>
          <Text style={[s.stateTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Bugungi savollar hali tayyor emas
          </Text>
          <Text style={[s.stateBody, { color: c.textSecondary }]}>Birozdan so'ng qayta tekshiring.</Text>
        </View>
      ) : result ? (
        <QuizResultView quiz={quiz} result={result} rank={rank} secondsLeft={secondsLeft} />
      ) : (
        <View style={s.playArea}>
          <View style={s.topRow}>
            <View style={s.dots}>
              {quiz.questions.map((q, i) => (
                <View
                  key={q.question_id}
                  style={[
                    s.dot,
                    { backgroundColor: i < index ? c.accentPrimary : i === index ? c.accentPrimary + '88' : c.bgTertiary },
                  ]}
                />
              ))}
            </View>
            <View style={s.timerRow}>
              <Clock size={13} color={c.textMuted} />
              <Text style={[s.timerText, { color: c.textMuted }]}>{fmtCountdown(quiz.seconds_remaining)}</Text>
            </View>
          </View>

          <Text style={[s.questionText, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {quiz.questions[index].question_text}
          </Text>

          <View style={{ gap: spacing.sm }}>
            {quiz.questions[index].options.map((opt, i) => {
              const isPicked = picked === i
              return (
                <Pressable
                  key={i}
                  disabled={picked !== null || submitting}
                  onPress={() => selectOption(i)}
                  style={[
                    s.option,
                    {
                      backgroundColor: isPicked ? c.accentPrimary + '22' : c.bgSecondary,
                      borderColor: isPicked ? c.accentPrimary : c.border,
                    },
                  ]}
                >
                  <Text style={[s.optionText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
                    {opt}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {submitting && (
            <View style={s.submittingRow}>
              <ActivityIndicator color={c.accentPrimary} />
              <Text style={[s.submittingText, { color: c.textMuted }]}>Yuborilmoqda...</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: spacing.xl },
  stateIcon: { fontSize: 40 },
  stateTitle: { fontSize: 16 },
  stateBody: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.full },
  retryText: { color: '#fff', fontSize: 14 },

  playArea: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 12 },

  questionText: { fontSize: 20, lineHeight: 28 },

  option: { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md },
  optionText: { fontSize: 15, lineHeight: 21 },

  submittingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md },
  submittingText: { fontSize: 13 },
})
