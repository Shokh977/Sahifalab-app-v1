import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Sparkles } from 'lucide-react-native'
import { useTheme } from '../../../hooks/useTheme'
import { typography, radius } from '../../../lib/constants'
import { dailyQuiz, type DailyQuizToday } from '../../../lib/api'
import { GridCard } from './GridCard'

const AMBER = '#F0A32B'
const GREEN = '#37B457'

export function FiveSavolGridCard({ staggerIndex }: { staggerIndex: number }) {
  const { c } = useTheme()
  const router = useRouter()
  const [quiz, setQuiz] = useState<DailyQuizToday | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    dailyQuiz.today().then(res => { if (!cancelled) setQuiz(res.quiz) })
      .catch(() => {}).finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  if (!loaded || !quiz) return null

  const submitted = quiz.state === 'submitted'
  const correctCount = quiz.correct_count ?? 0

  return (
    <GridCard
      staggerIndex={staggerIndex}
      bg={c.bgSecondary}
      borderColor={c.border}
      onPress={() => router.push({ pathname: '/(screens)/daily-quiz', params: { quizId: String(quiz.id) } } as any)}
      accessibilityLabel={
        submitted
          ? `5 savol, bajarildi, ${correctCount} dan 5, kunlik tur bir`
          : `5 savol, kunlik tur bir, hali boshlanmagan`
      }
    >
      <View style={styles.topRow}>
        <View style={[styles.iconTile, { backgroundColor: AMBER + '22' }]}>
          <Sparkles size={16} color={AMBER} />
        </View>
        <Text style={styles.score}>
          <Text style={{ color: submitted ? GREEN : c.textPrimary, fontFamily: typography.fontFamily.extrabold }}>
            {correctCount}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: typography.fontFamily.medium }}>/5</Text>
        </Text>
      </View>

      <View>
        <Text numberOfLines={2} style={[styles.title, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          5 savol
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.sub, { color: submitted ? GREEN : c.textMuted, fontFamily: typography.fontFamily.medium }]}
        >
          {submitted ? "Bajarildi ✓" : 'Kunlik tur #1'}
        </Text>
      </View>

      <View style={styles.segRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: submitted && i < correctCount ? GREEN : c.bgTertiary },
            ]}
          />
        ))}
      </View>
    </GridCard>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconTile: { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 20 },
  title: { fontSize: 14 },
  sub: { fontSize: 11, marginTop: 1 },
  segRow: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 5, borderRadius: radius.full },
})
