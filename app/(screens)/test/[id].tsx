import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Modal, Alert, BackHandler, ActivityIndicator, Image, Dimensions,
} from 'react-native'
import { Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withSpring, withTiming, withSequence, withRepeat, Easing,
} from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../../hooks/useTheme'
import {
  tests,
  type TestAttemptStart, type TestQuestion,
  type TestSubmitAnswer, type TestSubmitResult,
} from '../../../lib/api'
import { typography, spacing, radius } from '../../../lib/constants'

// Persisted so an in-progress attempt survives the app being backgrounded or
// killed mid-test — previously, killing the app lost all answers with no
// resume, unlike lesson position/notes which persist continuously.
interface PersistedTestProgress {
  attempt:      TestAttemptStart
  answers:      Record<number, TestSubmitAnswer>
  currentIndex: number
  targetEndMs:  number | null   // absolute timestamp the timer counts down to
}
const progressKey = (testId: number) => `sahifalab_test_progress_${testId}`

async function loadPersistedProgress(testId: number): Promise<PersistedTestProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(progressKey(testId))
    return raw ? (JSON.parse(raw) as PersistedTestProgress) : null
  } catch { return null }
}
async function savePersistedProgress(testId: number, progress: PersistedTestProgress) {
  try { await AsyncStorage.setItem(progressKey(testId), JSON.stringify(progress)) } catch {}
}
async function clearPersistedProgress(testId: number) {
  try { await AsyncStorage.removeItem(progressKey(testId)) } catch {}
}

// ── SVG lazy-require ──────────────────────────────────────────────────────────
let Svg: any = null, SvgCircle: any = null, SvgPath: any = null
try {
  const mod = require('react-native-svg')
  Svg       = mod.Svg ?? mod.default ?? mod
  SvgCircle = mod.Circle
  SvgPath   = mod.Path
} catch {}

let AnimatedSvgPath: any = null
if (SvgPath) AnimatedSvgPath = Animated.createAnimatedComponent(SvgPath)

const { width: SCREEN_W } = Dimensions.get('window')

// approx stroke lengths for animation
const DASH_CHECK = 90
const DASH_X     = 68

type Phase = 'init' | 'taking' | 'submitting' | 'results'

// ── Timer display ─────────────────────────────────────────────────────────────
function TimerDisplay({ seconds, c }: { seconds: number; c: any }) {
  const isWarning = seconds < 120
  const isDanger  = seconds < 30
  const m    = Math.floor(seconds / 60)
  const s    = seconds % 60
  const text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const scale = useSharedValue(1)
  useEffect(() => {
    if (isDanger) {
      scale.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 500 }), withTiming(1.0, { duration: 500 })),
        -1,
      )
    } else {
      scale.value = withTiming(1)
    }
  }, [isDanger])

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.Text style={[
      styles.timerText, animStyle,
      { color: isDanger ? c.error : isWarning ? c.warning : c.textPrimary },
    ]}>
      {text}
    </Animated.Text>
  )
}

// ── Option card (single_choice / multiple_choice) ─────────────────────────────
function OptionButton({ text, selected, onPress, c }: {
  text: string; selected: boolean; onPress: () => void; c: any
}) {
  const checkScale = useSharedValue(selected ? 1 : 0)
  useEffect(() => {
    checkScale.value = withSpring(selected ? 1 : 0, { damping: 8, stiffness: 300 })
  }, [selected])

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity:   checkScale.value,
  }))

  return (
    <Pressable
      onPress={onPress}
      style={[styles.optionCard, {
        backgroundColor: selected ? (c.accentPrimaryMuted ?? 'rgba(232,121,47,0.1)') : c.bgSecondary,
        borderColor:     selected ? c.accentPrimary : c.border,
      }]}
    >
      <View style={[styles.optionCircle, {
        borderColor:     selected ? c.accentPrimary : c.border,
        backgroundColor: selected ? c.accentPrimary : 'transparent',
      }]}>
        <Animated.Text style={[styles.checkMark, checkStyle]}>✓</Animated.Text>
      </View>
      <Text style={[styles.optionText, { color: c.textPrimary, fontFamily: typography.fontFamily.regular }]}>
        {text}
      </Text>
    </Pressable>
  )
}

// ── Animated result icon ──────────────────────────────────────────────────────
function ResultIcon({ passed }: { passed: boolean }) {
  const dash  = useSharedValue(passed ? DASH_CHECK : DASH_X)
  const dash2 = useSharedValue(DASH_X)

  const animProps  = useAnimatedProps(() => ({ strokeDashoffset: dash.value }))
  const animProps2 = useAnimatedProps(() => ({ strokeDashoffset: dash2.value }))

  useEffect(() => {
    dash.value  = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    dash2.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
  }, [])

  if (!Svg || !SvgCircle || !AnimatedSvgPath) {
    return (
      <View style={[styles.iconCircle, {
        backgroundColor: passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      }]}>
        <Text style={{ fontSize: 52 }}>{passed ? '✓' : '✗'}</Text>
      </View>
    )
  }

  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <SvgCircle
        cx={60} cy={60} r={56}
        fill={passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}
        stroke={passed ? '#22c55e' : '#ef4444'}
        strokeWidth={2}
      />
      {passed ? (
        <AnimatedSvgPath
          d="M 30 62 L 52 82 L 90 38"
          stroke="#22c55e"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={DASH_CHECK}
          animatedProps={animProps}
        />
      ) : (
        <>
          <AnimatedSvgPath
            d="M 38 38 L 82 82"
            stroke="#ef4444"
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={DASH_X}
            animatedProps={animProps}
          />
          <AnimatedSvgPath
            d="M 82 38 L 38 82"
            stroke="#ef4444"
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={DASH_X}
            animatedProps={animProps2}
          />
        </>
      )}
    </Svg>
  )
}

// ── XP float animation ────────────────────────────────────────────────────────
function XpFloat({ xp }: { xp: number }) {
  const translateY = useSharedValue(0)
  const opacity    = useSharedValue(0)

  useEffect(() => {
    opacity.value    = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 400 }),
    )
    translateY.value = withTiming(-44, { duration: 1400 })
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.Text style={[styles.xpFloat, animStyle]}>+{xp} XP</Animated.Text>
  )
}

// ── Results view ──────────────────────────────────────────────────────────────
function ResultsView({
  result, attempt, c, insets, router, testId,
}: {
  result:   TestSubmitResult
  attempt:  TestAttemptStart
  c:        any
  insets:   any
  router:   any
  testId:   number
}) {
  const [showAnswers, setShowAnswers] = useState(false)

  const fmtElapsed = (secs: number) => {
    const m = Math.floor(secs / 60), s = secs % 60
    if (m === 0) return `${s} soniya`
    return `${m} daqiqa ${s} soniya`
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bgPrimary }}
      contentContainerStyle={[
        styles.resultsContent,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
      ]}
    >
      {/* Result header */}
      <View style={styles.resultHeader}>
        <ResultIcon passed={result.passed} />

        <Text style={[styles.scoreText, { color: result.passed ? '#22c55e' : '#ef4444' }]}>
          {Math.round(result.score_pct)}%
        </Text>

        <Text style={[styles.resultMsg, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {result.passed ? "Tabriklaymiz! Test topshirdingiz 🎉" : "Kechirasiz, o'ta olmadingiz"}
        </Text>

        {!result.passed && (
          <Text style={[styles.passingNote, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Kamida {attempt.passing_score}% kerak
          </Text>
        )}

        <View style={{ height: 40 }}>
          {result.xp_awarded > 0 && <XpFloat xp={result.xp_awarded} />}
        </View>

        {!result.passed && (
          <Pressable
            onPress={() => router.replace(`/(screens)/test/${testId}` as any)}
            style={[styles.retryTestBtn, { borderColor: c.accentPrimary }]}
          >
            <Text style={{ color: c.accentPrimary, fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }}>
              Qayta topshirish
            </Text>
          </Pressable>
        )}
      </View>

      {/* Score breakdown */}
      <View style={[styles.breakdownCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            To'g'ri javoblar
          </Text>
          <Text style={[styles.breakdownValue, { color: '#22c55e', fontFamily: typography.fontFamily.semibold }]}>
            {result.correct_count} / {result.total_questions}
          </Text>
        </View>
        <View style={[styles.breakdownRow, styles.breakdownBordered, { borderTopColor: c.border }]}>
          <Text style={[styles.breakdownLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Noto'g'ri javoblar
          </Text>
          <Text style={[styles.breakdownValue, { color: '#ef4444', fontFamily: typography.fontFamily.semibold }]}>
            {result.wrong_count} / {result.total_questions}
          </Text>
        </View>
        <View style={[styles.breakdownRow, styles.breakdownBordered, { borderTopColor: c.border }]}>
          <Text style={[styles.breakdownLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Vaqt
          </Text>
          <Text style={[styles.breakdownValue, { color: c.textSecondary, fontFamily: typography.fontFamily.semibold }]}>
            {fmtElapsed(result.elapsed_seconds)}
          </Text>
        </View>
      </View>

      {/* Answer review */}
      {result.show_answers && (result.answered_questions?.length ?? 0) > 0 && (
        <View style={{ marginTop: 24, width: '100%' }}>
          <Pressable
            onPress={() => setShowAnswers(v => !v)}
            style={[styles.expandHeader, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
          >
            <Text style={[styles.expandLabel, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
              Javoblarni ko'rish
            </Text>
            <Text style={{ color: c.textSecondary, fontSize: 14 }}>{showAnswers ? '▲' : '▼'}</Text>
          </Pressable>

          {showAnswers && (
            <View style={{ marginTop: spacing.sm, gap: 16 }}>
              {result.answered_questions!.map((aq, i) => (
                <View key={aq.id}>
                  <Text style={[styles.reviewQuestion, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
                    {i + 1}. {aq.question_text}
                  </Text>
                  <View style={[styles.reviewAnswer, {
                    borderLeftColor: aq.correct ? '#22c55e' : '#ef4444',
                    backgroundColor: aq.correct ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    marginTop: 6,
                  }]}>
                    <Text style={{ color: c.textPrimary, fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular }}>
                      {aq.user_answer} {aq.correct ? '✓' : '✗'}
                    </Text>
                    {!aq.correct && (
                      <Text style={{ color: '#22c55e', fontSize: typography.size.xs, fontFamily: typography.fontFamily.regular, marginTop: 4 }}>
                        To'g'ri javob: {aq.correct_answer}
                      </Text>
                    )}
                  </View>
                  {aq.explanation ? (
                    <View style={[styles.explanationBox, { backgroundColor: c.bgTertiary, marginTop: 6 }]}>
                      <Text style={{ color: c.textSecondary, fontSize: typography.size.sm, fontStyle: 'italic', fontFamily: typography.fontFamily.regular }}>
                        {aq.explanation}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Certificate card */}
      {result.passed && result.certificate_issued && result.is_final && result.certificate_code && (
        <View style={[styles.certCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
          <Text style={{ fontSize: 40 }}>🎓</Text>
          <Text style={[styles.certTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Sertifikat tayyor!
          </Text>
          <View style={{ width: '100%', gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={() => router.push(`/(screens)/certificate/${result.certificate_code}` as any)}
              style={[styles.certBtn, { backgroundColor: c.accentPrimary }]}
            >
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily.semibold, fontSize: typography.size.base }}>
                Sertifikatni ko'rish
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Back to course */}
      <Pressable onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={[styles.backToCourse, { color: c.accentSecondary ?? c.accentPrimary }]}>
          Kursga qaytish
        </Text>
      </Pressable>
    </ScrollView>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { c }  = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [phase,             setPhase]             = useState<Phase>('init')
  const [attempt,           setAttempt]           = useState<TestAttemptStart | null>(null)
  const [currentIndex,      setCurrentIndex]      = useState(0)
  const [answers,           setAnswers]           = useState<Record<number, TestSubmitAnswer>>({})
  const [timerSecs,         setTimerSecs]         = useState(0)
  const [initError,         setInitError]         = useState<string | null>(null)
  const [showExitConfirm,   setShowExitConfirm]   = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [result,            setResult]            = useState<TestSubmitResult | null>(null)

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoSubmitted = useRef(false)
  // stable refs so timer/interval callbacks see latest values
  const answersRef    = useRef(answers)
  const attemptRef    = useRef(attempt)
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { attemptRef.current = attempt }, [attempt])

  // Absolute end timestamp, not a plain counter — deriving remaining time from
  // Date.now() vs. this (like stores/timerStore.ts already does for the focus
  // timer) means backgrounding the app (a call, an app switch, screen lock)
  // can't desync the countdown the way a plain setInterval decrement does.
  const targetEndRef = useRef<number | null>(null)

  const progressWidth = useSharedValue(0)
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` as any }))

  const startTest = useCallback(async () => {
    const testId = Number(id)
    setInitError(null)

    const resumable = await loadPersistedProgress(testId)
    if (resumable) {
      setAttempt(resumable.attempt)
      setAnswers(resumable.answers)
      setCurrentIndex(resumable.currentIndex)
      autoSubmitted.current = false
      targetEndRef.current = resumable.targetEndMs
      if (resumable.targetEndMs) {
        setTimerSecs(Math.max(0, Math.ceil((resumable.targetEndMs - Date.now()) / 1000)))
      }
      progressWidth.value = withTiming((resumable.currentIndex + 1) / resumable.attempt.questions.length * 100, { duration: 300 })
      setPhase('taking')
      return
    }

    tests.start(testId).then(data => {
      const targetEndMs = data.time_limit_min ? Date.now() + data.time_limit_min * 60 * 1000 : null
      setAttempt(data)
      setAnswers({})
      setCurrentIndex(0)
      autoSubmitted.current = false
      targetEndRef.current = targetEndMs
      if (data.time_limit_min) setTimerSecs(data.time_limit_min * 60)
      progressWidth.value = withTiming(1 / data.questions.length * 100, { duration: 300 })
      setPhase('taking')
      savePersistedProgress(testId, { attempt: data, answers: {}, currentIndex: 0, targetEndMs })
    }).catch(() => {
      setInitError("Test yuklanmadi. Qayta urinib ko'ring.")
    })
  }, [id])

  useEffect(() => { startTest() }, [])

  // Persist answers/position as they change so an in-progress attempt
  // survives the app being backgrounded or killed mid-test.
  useEffect(() => {
    if (phase !== 'taking' || !attempt) return
    savePersistedProgress(Number(id), {
      attempt, answers, currentIndex, targetEndMs: targetEndRef.current,
    })
  }, [phase, attempt, answers, currentIndex, id])

  const doSubmit = useCallback(async () => {
    const att = attemptRef.current
    if (!att) return
    setPhase('submitting')
    setShowSubmitConfirm(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    const answersArr: TestSubmitAnswer[] = att.questions.map(q =>
      answersRef.current[q.id] ?? { question_id: q.id, selected_option_id: null, text: null }
    )
    try {
      const res = await tests.submit(att.test_id, att.attempt_id, answersArr)
      setResult(res)
      setPhase('results')
      await clearPersistedProgress(Number(id))
    } catch {
      setPhase('taking')
      Alert.alert('Xatolik', "Javoblar yuborilmadi. Qayta urinib ko'ring.")
    }
  }, [id])

  // Timer countdown — ticks every second just to refresh the display, but the
  // actual remaining time is always recomputed from the wall-clock target, so
  // a throttled/paused interval while backgrounded can't cause drift; the
  // first tick after resuming immediately shows the true elapsed time.
  useEffect(() => {
    if (phase !== 'taking' || !targetEndRef.current) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((targetEndRef.current! - Date.now()) / 1000))
      setTimerSecs(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        if (!autoSubmitted.current) {
          autoSubmitted.current = true
          doSubmit()
        }
      }
    }
    timerRef.current = setInterval(tick, 1000)
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [phase, attempt?.time_limit_min])

  // Android back interception
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'taking') { setShowExitConfirm(true); return true }
      return false
    })
    return () => h.remove()
  }, [phase])

  const goToQuestion = useCallback((index: number) => {
    const att = attemptRef.current
    if (!att) return
    setCurrentIndex(index)
    progressWidth.value = withTiming((index + 1) / att.questions.length * 100, { duration: 300 })
  }, [])

  const setAnswer = useCallback((q: TestQuestion, optionId?: number | null, text?: string) => {
    setAnswers(prev => {
      const next = {
        ...prev,
        [q.id]: { question_id: q.id, selected_option_id: optionId ?? null, text: text ?? null },
      }
      answersRef.current = next
      return next
    })
  }, [])

  // ── Init phase ──────────────────────────────────────────────────────────────
  if (phase === 'init') {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
        {initError ? (
          <>
            <Text style={[styles.errorMsg, { color: c.textSecondary }]}>{initError}</Text>
            <Pressable onPress={startTest} style={[styles.retryBtn, { backgroundColor: c.accentPrimary }]}>
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily.semibold }}>Qayta urinish</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={c.accentPrimary} size="large" />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>Test yuklanmoqda...</Text>
          </>
        )}
      </View>
    )
  }

  // ── Submitting phase ────────────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.accentPrimary} size="large" />
        <Text style={[styles.loadingText, { color: c.textSecondary }]}>Natijalar tekshirilmoqda...</Text>
      </View>
    )
  }

  // ── Results phase ───────────────────────────────────────────────────────────
  if (phase === 'results' && result && attempt) {
    return (
      <>
        <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
        <ResultsView
          result={result} attempt={attempt}
          c={c} insets={insets} router={router} testId={Number(id)}
        />
      </>
    )
  }

  if (!attempt) return null

  const currentQ      = attempt.questions[currentIndex]
  if (!currentQ) return null

  const currentAns    = answers[currentQ.id]
  const isLast        = currentIndex === attempt.questions.length - 1
  const answeredCount = attempt.questions.filter(q => answers[q.id] != null).length
  const unanswered    = attempt.questions.length - answeredCount

  // ── Taking phase ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: c.bgPrimary }]}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={() => setShowExitConfirm(true)} hitSlop={12} style={styles.closeBtn}>
          <Text style={[styles.closeIcon, { color: c.textPrimary }]}>✕</Text>
        </Pressable>
        <Text style={[styles.counter, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {currentIndex + 1} / {attempt.questions.length}
        </Text>
        {attempt.time_limit_min ? (
          <TimerDisplay seconds={timerSecs} c={c} />
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: c.bgTertiary }]}>
        <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: c.accentPrimary }]} />
      </View>

      {/* Question area */}
      <ScrollView
        contentContainerStyle={[styles.qContent, { paddingBottom: 110 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.qLabel, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {currentIndex + 1}-savol
        </Text>
        <Text style={[styles.qText, { color: c.textPrimary, fontFamily: typography.fontFamily.medium }]}>
          {currentQ.question_text}
        </Text>

        {currentQ.question_image ? (
          <Image
            source={{ uri: currentQ.question_image }}
            style={styles.qImage}
            resizeMode="contain"
          />
        ) : null}

        <View style={{ marginTop: 24 }}>
          {currentQ.question_type === 'fill_blank' ? (
            <TextInput
              style={[styles.fillInput, {
                backgroundColor: c.bgSecondary,
                borderColor:     c.border,
                color:           c.textPrimary,
                fontFamily:      typography.fontFamily.regular,
              }]}
              placeholder="Javobingizni kiriting..."
              placeholderTextColor={c.textDisabled}
              value={currentAns?.text ?? ''}
              onChangeText={t => setAnswer(currentQ, null, t)}
              multiline
              textAlignVertical="top"
            />
          ) : currentQ.question_type === 'true_false' ? (
            <View style={styles.tfRow}>
              {([{ id: -1, text: "To'g'ri" }, { id: -2, text: "Noto'g'ri" }] as const).map(opt => {
                const sel = currentAns?.selected_option_id === opt.id
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setAnswer(currentQ, opt.id)}
                    style={[styles.tfBtn, {
                      backgroundColor: sel ? (c.accentPrimaryMuted ?? 'rgba(232,121,47,0.1)') : c.bgSecondary,
                      borderColor:     sel ? c.accentPrimary : c.border,
                    }]}
                  >
                    <Text style={[styles.tfText, {
                      color:      sel ? c.accentPrimary : c.textPrimary,
                      fontFamily: sel ? typography.fontFamily.semibold : typography.fontFamily.medium,
                    }]}>
                      {opt.text}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {(currentQ.options ?? []).map(opt => (
                <OptionButton
                  key={opt.id}
                  text={opt.text}
                  selected={currentAns?.selected_option_id === opt.id}
                  onPress={() => setAnswer(currentQ, opt.id)}
                  c={c}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, {
        backgroundColor: c.bgSecondary,
        borderTopColor:  c.border,
        paddingBottom:   insets.bottom + spacing.sm,
      }]}>
        {currentIndex > 0 ? (
          <Pressable onPress={() => goToQuestion(currentIndex - 1)} style={styles.prevBtn}>
            <Text style={[styles.prevText, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              ← Ortga
            </Text>
          </Pressable>
        ) : <View />}

        <Pressable
          onPress={isLast ? () => setShowSubmitConfirm(true) : () => goToQuestion(currentIndex + 1)}
          style={[styles.nextBtn, { backgroundColor: isLast ? (c.success ?? '#22c55e') : c.accentPrimary }]}
        >
          <Text style={[styles.nextBtnText, { fontFamily: typography.fontFamily.semibold }]}>
            {isLast ? 'Yakunlash' : 'Keyingi →'}
          </Text>
        </Pressable>
      </View>

      {/* Exit confirm */}
      <Modal visible={showExitConfirm} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.dialogBox, { backgroundColor: c.bgSecondary }]}>
            <Text style={[styles.dialogTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Testdan chiqasizmi?
            </Text>
            <Text style={[styles.dialogBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Javoblar saqlanmaydi.
            </Text>
            <Pressable
              onPress={() => { setShowExitConfirm(false); router.back() }}
              style={[styles.dialogBtn, { borderBottomColor: c.border, borderBottomWidth: 1 }]}
            >
              <Text style={{ fontSize: typography.size.base, color: c.error, fontFamily: typography.fontFamily.semibold }}>
                Chiqish
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowExitConfirm(false)} style={styles.dialogBtn}>
              <Text style={{ fontSize: typography.size.base, color: c.accentPrimary, fontFamily: typography.fontFamily.semibold }}>
                Davom etish
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Submit confirm */}
      <Modal visible={showSubmitConfirm} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowSubmitConfirm(false)}>
          <View style={[styles.submitSheet, { backgroundColor: c.bgSecondary, paddingBottom: insets.bottom + spacing.base }]}>
            <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
            <Text style={[styles.sheetTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              Testni yakunlaysizmi?
            </Text>
            <Text style={[styles.sheetBody, { color: c.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              Javob berilgan: {answeredCount} / {attempt.questions.length} savol
            </Text>
            {unanswered > 0 && (
              <Text style={[styles.sheetWarn, { color: c.warning ?? '#f59e0b', fontFamily: typography.fontFamily.regular }]}>
                {unanswered} ta savolga javob berilmagan
              </Text>
            )}
            <Pressable onPress={doSubmit} style={[styles.sheetConfirm, { backgroundColor: c.accentPrimary }]}>
              <Text style={{ color: '#fff', fontSize: typography.size.base, fontFamily: typography.fontFamily.semibold }}>
                Tasdiqlash
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowSubmitConfirm(false)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: c.textSecondary, fontSize: typography.size.sm, fontFamily: typography.fontFamily.regular }}>
                Ortga qaytish
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  centered:{ alignItems: 'center', justifyContent: 'center', gap: spacing.base },

  // Top bar
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
  },
  closeBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 20, fontWeight: '600' },
  counter:   { fontSize: typography.size.base },
  timerText: { fontSize: typography.size.base, fontWeight: '600', minWidth: 56, textAlign: 'right' },

  // Progress bar
  progressTrack: { width: '100%', height: 3 },
  progressFill:  { height: 3 },

  // Question
  qContent: { paddingHorizontal: spacing.base, paddingTop: 32 },
  qLabel:   { fontSize: typography.size.sm, marginBottom: 8 },
  qText:    { fontSize: 20, lineHeight: 30 },
  qImage:   { width: '100%', height: 200, marginTop: 16, borderRadius: radius.card },

  // Options
  optionCard: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    padding:       16,
    borderRadius:  radius.card,
    borderWidth:   1.5,
  },
  optionCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark:  { color: '#fff', fontSize: 10, fontWeight: '700' },
  optionText: { fontSize: 15, flex: 1, lineHeight: 22 },

  // True/False
  tfRow: { flexDirection: 'row', gap: 12 },
  tfBtn: {
    flex: 1, paddingVertical: 16, borderRadius: radius.card, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  tfText: { fontSize: 15 },

  // Fill blank
  fillInput: {
    borderWidth: 1.5, borderRadius: radius.card,
    padding: spacing.sm, minHeight: 100, fontSize: 15,
  },

  // Bottom nav
  bottomNav: {
    position:          'absolute', bottom: 0, left: 0, right: 0,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    borderTopWidth:    1,
  },
  prevBtn:     { paddingVertical: spacing.sm },
  prevText:    { fontSize: typography.size.sm },
  nextBtn:     { paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.full },
  nextBtnText: { color: '#fff', fontSize: typography.size.base },

  // Exit modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  dialogBox: {
    width: SCREEN_W * 0.82, borderRadius: 16, overflow: 'hidden',
  },
  dialogTitle: { fontSize: 17, textAlign: 'center', padding: spacing.base, paddingBottom: spacing.sm },
  dialogBody:  { fontSize: typography.size.sm, textAlign: 'center', paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  dialogBtn:   { paddingVertical: spacing.base, alignItems: 'center' },

  // Submit sheet
  submitSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.base,
  },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.base },
  sheetTitle:   { fontSize: 20, textAlign: 'center', marginBottom: spacing.sm },
  sheetBody:    { fontSize: typography.size.sm, textAlign: 'center', marginBottom: 4 },
  sheetWarn:    { fontSize: typography.size.sm, textAlign: 'center', marginBottom: spacing.sm },
  sheetConfirm: { paddingVertical: 14, borderRadius: radius.full, alignItems: 'center', marginTop: spacing.sm },

  // Results
  resultsContent: { paddingHorizontal: spacing.base, alignItems: 'center' },
  resultHeader:   { alignItems: 'center', gap: 8, marginBottom: 32 },
  iconCircle:     { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  scoreText:      { fontSize: 48, fontWeight: '900', lineHeight: 56 },
  resultMsg:      { fontSize: 17, textAlign: 'center' },
  passingNote:    { fontSize: typography.size.sm, textAlign: 'center' },
  xpFloat: {
    position: 'absolute', top: 0, left: 0, right: 0,
    textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#e8792f',
  },
  retryTestBtn: {
    marginTop: 8, paddingHorizontal: spacing.xl, paddingVertical: 10,
    borderRadius: radius.full, borderWidth: 1.5,
  },

  // Breakdown card
  breakdownCard:    { width: '100%', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  breakdownRow:     { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base, alignItems: 'center' },
  breakdownBordered:{ borderTopWidth: 1 },
  breakdownLabel:   { fontSize: typography.size.sm },
  breakdownValue:   { fontSize: typography.size.base },

  // Answer review
  expandHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base, borderRadius: radius.card, borderWidth: 1,
  },
  expandLabel:    { fontSize: typography.size.base },
  reviewQuestion: { fontSize: typography.size.sm },
  reviewAnswer:   { padding: 8, borderLeftWidth: 3, borderRadius: 4 },
  explanationBox: { padding: 8, borderRadius: 4 },

  // Certificate card
  certCard: {
    width: '100%', marginTop: 24, padding: 20, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 4,
  },
  certTitle:    { fontSize: 17 },
  certBtn:      { paddingVertical: 12, borderRadius: radius.full, alignItems: 'center' },
  backToCourse: { fontSize: 15, textDecorationLine: 'underline' },

  // Init/submit state
  errorMsg:    { fontSize: typography.size.base, textAlign: 'center', paddingHorizontal: spacing.xl },
  retryBtn:    { paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.full },
  loadingText: { fontSize: typography.size.base },
})
