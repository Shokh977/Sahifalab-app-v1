/**
 * Bellashuv: today's 5 Savol.
 * Not played → number, topic, how many played (and friends), "Oʻynash"
 * (or "Davom etish · 3/5"). Played → score, answer dots, rank, and when
 * the next round opens.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { dailyQuiz, type DailyQuizStatus } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Button, Card } from '../../components/ui'
import { QuizProgress } from '../quiz/QuizProgress'
import { opensAt } from '../quiz/quizPlay'
import { resumeLabel } from '../today/primaryAction'
import { uzText } from '../today/today'
import { playersLine } from './bellashuv'

export function QuizTodayCard({ quiz, fetchedAt, now, onOpen }: {
  quiz: DailyQuizStatus | null
  fetchedAt: number
  now: number
  onOpen: () => void
}) {
  const { colors } = useTheme()
  const played = quiz?.state === 'submitted'
  const quizId = quiz?.id
  const [detail, setDetail] = useState<{ dots: boolean[]; rank: number | null } | null>(null)

  // Played: the per-answer dots (GET /today is safe once submitted) and the rank.
  useEffect(() => {
    if (!played || quizId == null) return
    let cancelled = false
    Promise.allSettled([dailyQuiz.today(), dailyQuiz.results(quizId)]).then(([t, r]) => {
      if (cancelled) return
      setDetail({
        dots: t.status === 'fulfilled' ? t.value.quiz?.per_question_correct ?? [] : [],
        rank: r.status === 'fulfilled' ? r.value.caller?.rank ?? null : null,
      })
    })
    return () => { cancelled = true }
  }, [played, quizId])

  if (!quiz) return null
  const secondsLeft = Math.max(0, quiz.seconds_remaining - Math.floor((now - fetchedAt) / 1000))
  const answered = quiz.state === 'in_progress' ? quiz.answered_count ?? 0 : 0
  const players = playersLine(quiz.players_count, quiz.friends_played)

  if (played) {
    const dots = detail?.dots ?? []
    return (
      <Card variant="pressable" onPress={onOpen} accessibilityLabel={`5 Savol natijasi ${quiz.correct_count ?? 0} dan 5`}>
        <View style={styles.gap}>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>5 SAVOL #{quiz.quiz_number}</Text>
          <View style={styles.playedRow}>
            <Text style={[typeScale.title1, tabular, { color: colors.text }]}>{quiz.correct_count ?? 0}/5</Text>
            <View style={styles.flex}>
              {dots.length > 0 && (
                <QuizProgress states={dots.map(ok => (ok ? 'correct' : 'wrong'))} />
              )}
            </View>
            {detail?.rank != null && (
              <Text style={[typeScale.headline, tabular, { color: colors.accentText }]}>#{detail.rank}-oʻrin</Text>
            )}
          </View>
          <Text style={[typeScale.callout, { color: colors.textMuted }]}>
            Ertaga yangi 5 savol · {opensAt(secondsLeft, now)} da ochiladi
          </Text>
        </View>
      </Card>
    )
  }

  return (
    <Card>
      <View style={styles.gap}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>5 SAVOL #{quiz.quiz_number}</Text>
        {quiz.theme ? <Text style={[typeScale.title2, { color: colors.text }]}>{uzText(quiz.theme)}</Text> : null}
        {players ? <Text style={[typeScale.callout, { color: colors.textMuted }]}>{players}</Text> : null}
        <Button
          label={answered > 0 ? resumeLabel(answered) : 'Oʻynash'}
          size="lg"
          fullWidth
          onPress={onOpen}
          style={styles.button}
        />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.xs },
  playedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  button: { marginTop: space.xs },
})
