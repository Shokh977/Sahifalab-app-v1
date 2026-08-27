import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Sparkle, CaretRight } from 'phosphor-react-native'
import { useTheme } from '../../hooks/useTheme'
import { typography, spacing, radius } from '../../lib/constants'
import { dailyQuiz, type DailyQuizToday } from '../../lib/api'

function fmtCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}s ${m}d qoldi`
  return `${m}d qoldi`
}

/**
 * Dashboard discovery surface for "5 Savol" (090_daily_quiz) — top card per
 * spec ("a daily habit belongs where users already land"), not buried in a
 * tab. Renders nothing if no quiz is published yet for today (e.g. admin
 * hasn't approved in time) — no card beats a broken one.
 */
export function DailyQuizCard() {
  const { c }  = useTheme()
  const router = useRouter()
  const [quiz, setQuiz]       = useState<DailyQuizToday | null>(null)
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    let cancelled = false
    dailyQuiz.today().then(res => {
      if (!cancelled) setQuiz(res.quiz)
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  if (!loaded) return null
  if (!quiz) return null

  const submitted = quiz.state === 'submitted'

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(screens)/daily-quiz', params: { quizId: String(quiz.id) } } as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: pressed ? 0.85 : 1, marginHorizontal: spacing.screenMargin },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: '#F59E0B1a' }]}>
        <Sparkle size={20} color="#F59E0B" weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
          5 SAVOL #{quiz.quiz_number}
        </Text>
        {submitted ? (
          <Text style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            {quiz.correct_count}/5 to'g'ri — natijalar {fmtCountdown(quiz.seconds_remaining)}
          </Text>
        ) : (
          <Text style={[styles.sub, { color: c.textMuted, fontFamily: typography.fontFamily.regular }]}>
            Bugungi savollar tayyor — {fmtCountdown(quiz.seconds_remaining)}
          </Text>
        )}
      </View>
      {!submitted && <CaretRight size={16} color={c.textMuted} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.sm,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14 },
  sub:   { fontSize: 12, marginTop: 1 },
})
