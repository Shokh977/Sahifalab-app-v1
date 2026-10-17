/**
 * 5 Savol result: the share ticket (kept as is) with its reveal moment, the
 * share actions, then when the next round opens, the quiz streak, friends'
 * scores and the link to the full ranking.
 */
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { CalendarClock, Copy, Flame, Share2 } from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import type { DailyQuizResults, DailyQuizToday } from '../../lib/api'
import { useShareTicket } from '../../hooks/useShareTicket'
import { useTheme } from '../../src/design/ThemeProvider'
import { layout, space } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { haptics } from '../../src/lib/haptics'
import { Badge, Button, Card, ListRow } from '../../src/components/ui'
import { opensAt } from '../../src/features/quiz/quizPlay'
import { uzText } from '../../src/features/today/today'
import { ResultTicket, type AnswerMark, type ResultTicketProps } from './ResultTicket'
import { ShareCaptureHost } from './ShareCaptureHost'

function statusTitleFor(score: number, total: number): string {
  if (score === total) return 'Mukammal!'
  if (score >= 3) return 'Yaxshi natija'
  if (score >= 1) return 'Natijang tayyor'
  return 'Ertaga qaytamiz'
}

/** Haptic on a strong round (4–5 of 5), as part of the reveal. */
const SUCCESS_FROM = 4

export type QuizFriend = NonNullable<DailyQuizResults['friends']>[number]

export function QuizResultView({
  quiz, result, rank, friends, fresh,
}: {
  quiz: DailyQuizToday
  result: { correct_count: number; tanga_awarded: number; per_question_correct: boolean[]; elapsed_ms?: number; quiz_streak_days: number }
  rank: number | null
  friends?: QuizFriend[]
  /** Just submitted (not reopened later): play the reveal moment. */
  fresh?: boolean
}) {
  const { colors } = useTheme()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  // When this round's window closes = when tomorrow's opens (local time).
  const [opens] = useState(() => opensAt(quiz.seconds_remaining, Date.now()))

  const total = result.per_question_correct.length || 5
  const answers: AnswerMark[] = result.per_question_correct.length > 0
    ? result.per_question_correct.map((ok): AnswerMark => (ok ? 'correct' : 'wrong'))
    : Array.from({ length: total }, (): AnswerMark => 'skipped')

  const ticketProps: ResultTicketProps = {
    round: quiz.quiz_number,
    score: result.correct_count,
    total,
    answers,
    streak: result.quiz_streak_days,
    rank,
    level: user?.level ?? 1,
    date: new Date().toISOString(),
    referralCode: user?.telegram_id ? String(user.telegram_id) : '',
  }

  const { hostRef, capturing, copied, share, copyLink } = useShareTicket(ticketProps)

  useEffect(() => {
    if (fresh && result.correct_count >= SUCCESS_FROM) haptics.success()
  }, [fresh, result.correct_count])

  const others = (friends ?? []).filter(f => !f.is_me)

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.status}>
        <Badge kind="status" status={result.correct_count === total ? 'success' : 'accent'} label="Tur yakunlandi" />
        <Text style={[typeScale.title1, styles.center, { color: colors.text }]}>
          {statusTitleFor(result.correct_count, total)}
        </Text>
        <Text style={[typeScale.callout, styles.center, { color: colors.textMuted }]}>
          Toʻliq javoblar va tushuntirishlar tayyor
        </Text>
      </View>

      <ResultTicket {...ticketProps} reveal={fresh} />
      <ShareCaptureHost hostRef={hostRef} ticketProps={ticketProps} />

      <View style={styles.actions}>
        <Button
          label={copied ? 'Nusxalandi' : 'Nusxalash'}
          variant="secondary"
          icon={Copy}
          onPress={copyLink}
          disabled={capturing}
          style={styles.flex}
          accessibilityLabel="Natija havolasini nusxalash"
        />
        <Button
          label="Ulashish"
          icon={Share2}
          onPress={share}
          loading={capturing}
          style={styles.flexWide}
          accessibilityLabel="Natija rasmini ulashish"
        />
      </View>

      <Card style={styles.rows}>
        <ListRow
          title={`Ertaga yangi 5 savol · ${opens} da ochiladi`}
          leading={{ kind: 'icon', icon: CalendarClock }}
        />
        <ListRow
          title="5 Savol seriyasi"
          leading={{ kind: 'icon', icon: Flame }}
          trailing={{ kind: 'value', value: `${result.quiz_streak_days} kun` }}
        />
      </Card>

      {others.length > 0 && (
        <View style={styles.section}>
          <Text style={[typeScale.overline, { color: colors.textMuted }]}>Doʻstlar</Text>
          <Card style={styles.rows}>
            {(friends ?? []).map(f => (
              <ListRow
                key={f.user_id}
                title={f.is_me ? 'Siz' : uzText(f.first_name || f.username || 'Foydalanuvchi')}
                subtitle={`#${f.rank}`}
                leading={{ kind: 'avatar', name: f.first_name || f.username || '?', uri: f.photo_url }}
                trailing={{ kind: 'value', value: `${f.correct_count}/5` }}
              />
            ))}
          </Card>
        </View>
      )}

      <Button
        label="Toʻliq reyting va javoblar"
        variant="ghost"
        fullWidth
        onPress={() => router.push({ pathname: '/(screens)/daily-quiz-results', params: { quizId: String(quiz.id) } } as any)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: layout.gutter, paddingTop: space.lg, paddingBottom: space.xxl, gap: space.lg },
  status: { alignItems: 'center', gap: space.xs },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.xs },
  flex: { flex: 1, alignSelf: 'auto' },
  flexWide: { flex: 1.3, alignSelf: 'auto' },
  rows: { paddingVertical: space.xxs },
  section: { gap: space.xs },
})
