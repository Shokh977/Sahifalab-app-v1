import React from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Copy, Share2 } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../stores/authStore'
import { typography, spacing, radius } from '../../lib/constants'
import type { DailyQuizToday } from '../../lib/api'
import { ResultTicket, type AnswerMark, type ResultTicketProps } from './ResultTicket'
import { ShareCaptureHost } from './ShareCaptureHost'
import { useShareTicket } from '../../hooks/useShareTicket'

const GREEN = '#2FA84F'
const GREEN_TINT = '#E8F7EC'
const GREEN_TINT_DARK = 'rgba(55,180,87,0.18)'
const ORANGE = '#D9832B'

function statusTitleFor(score: number, total: number): string {
  if (score === total) return 'Mukammal!'
  if (score >= 3) return 'Yaxshi natija'
  if (score >= 1) return 'Natijang tayyor'
  return 'Ertaga qaytamiz'
}

export function QuizResultView({
  quiz, result, rank,
}: {
  quiz: DailyQuizToday
  result: { correct_count: number; tanga_awarded: number; per_question_correct: boolean[]; elapsed_ms?: number; quiz_streak_days: number }
  rank: number | null
}) {
  const { c, theme } = useTheme()
  const router = useRouter()
  const user = useAuthStore(s => s.user)

  const total = result.per_question_correct.length || 5
  // per_question_correct is always populated by both score_and_submit()
  // return paths (fresh submit and the idempotent replay) — the fallback
  // below only matters if that ever isn't true, and marks every square
  // "skipped" rather than guessing right/wrong.
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

  const gold = result.correct_count === total

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.statusBlock}>
        <View style={[s.badge, { backgroundColor: gold ? '#F0A32B22' : (theme === 'dark' ? GREEN_TINT_DARK : GREEN_TINT) }]}>
          <Text style={[s.badgeText, { color: gold ? '#F0A32B' : GREEN, fontFamily: typography.fontFamily.bold }]}>
            TUR YAKUNLANDI
          </Text>
        </View>
        <Text style={[s.statusTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
          {statusTitleFor(result.correct_count, total)}
        </Text>
        <Text style={[s.statusSub, { color: c.textMuted }]}>
          To'liq javoblar va tushuntirishlar tayyor
        </Text>
      </View>

      <View style={s.ticketWrap}>
        <ResultTicket {...ticketProps} />
      </View>
      <ShareCaptureHost hostRef={hostRef} ticketProps={ticketProps} />

      <View style={s.actionsRow}>
        <Pressable
          onPress={copyLink} disabled={capturing}
          accessibilityRole="button" accessibilityHint="Natija havolasini nusxalaydi"
          style={[s.actionBtn, s.actionSecondary, { backgroundColor: c.bgSecondary, borderColor: c.border, opacity: capturing ? 0.5 : 1 }]}
        >
          <Copy size={15} color={c.textPrimary} />
          <Text style={[s.actionText, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {copied ? 'Nusxalandi' : 'Nusxalash'}
          </Text>
        </Pressable>
        <Pressable
          onPress={share} disabled={capturing}
          accessibilityRole="button" accessibilityHint="Natija rasmini ulashadi"
          style={[s.actionBtn, s.actionPrimary, { backgroundColor: ORANGE, opacity: capturing ? 0.7 : 1 }]}
        >
          {capturing
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Share2 size={15} color="#fff" />
                <Text style={[s.actionText, { color: '#fff', fontFamily: typography.fontFamily.bold }]}>Ulashish</Text>
              </>}
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/(screens)/daily-quiz-results', params: { quizId: String(quiz.id) } } as any)}
        accessibilityRole="button"
        style={s.tertiaryLink}
      >
        <Text style={[s.tertiaryText, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
          Natijalarni ko'rish →
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingTop: 20, alignItems: 'center' },

  statusBlock: { alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { fontSize: 10, letterSpacing: 0.8 },
  statusTitle: { fontSize: 22, letterSpacing: -0.4 },
  statusSub: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 290, fontWeight: '500' },

  ticketWrap: { width: '100%', marginTop: 20 },

  actionsRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: spacing.lg },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 16, paddingVertical: 14, minHeight: 48,
  },
  actionSecondary: { flex: 1, borderWidth: 1 },
  actionPrimary: {
    flex: 1.3,
    shadowColor: '#D9832B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 16, elevation: 4,
  },
  actionText: { fontSize: 13 },

  tertiaryLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: spacing.lg, paddingVertical: 12, minHeight: 48,
  },
  tertiaryText: { fontSize: 12 },
})
