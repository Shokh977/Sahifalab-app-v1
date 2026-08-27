import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, Flag, Check, X as XIcon, Flame } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { dailyQuiz, type DailyQuizResults } from '../../lib/api'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { ShareCard } from '../../components/daily-quiz/ShareCard'
import { typography, spacing, radius } from '../../lib/constants'

export default function DailyQuizResultsScreen() {
  const { c }  = useTheme()
  const router = useRouter()
  const { quizId } = useLocalSearchParams<{ quizId: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tooEarly, setTooEarly] = useState(false)
  const [data, setData]       = useState<DailyQuizResults | null>(null)
  const [reportTarget, setReportTarget] = useState<number | null>(null)

  const load = async () => {
    if (!quizId) return
    setLoading(true)
    setError(null)
    setTooEarly(false)
    try {
      const res = await dailyQuiz.results(Number(quizId))
      setData(res)
    } catch (e: any) {
      // request() surfaces the backend's `detail` string as the Error
      // message, not the HTTP status — match the literal 425 detail text
      // from GET /api/quiz/results (see daily_quiz.py's _window_close gate).
      if (String(e?.message ?? '').includes('hali yopilmagan')) {
        setTooEarly(true)
      } else {
        setError(e?.message ?? "Yuklab bo'lmadi")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [quizId])

  async function confirmReport() {
    if (reportTarget == null) return
    try {
      await dailyQuiz.report(reportTarget, 'Foydalanuvchi xato deb belgiladi')
    } catch {}
    setReportTarget(null)
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: c.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={[s.navBar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))} hitSlop={12} style={s.navBtn}>
          <ChevronLeft size={24} color={c.accentPrimary} />
        </Pressable>
        <Text style={[s.navTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.bold }]}>Natijalar</Text>
        <View style={s.navBtn} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={c.accentPrimary} size="large" /></View>
      ) : tooEarly ? (
        <View style={s.center}>
          <Text style={s.stateIcon}>⏳</Text>
          <Text style={[s.stateTitle, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
            Natijalar hali tayyor emas
          </Text>
          <Text style={[s.stateBody, { color: c.textSecondary }]}>
            Bugungi oyna yopilgach (24:00 UTC) to'liq natijalar, tushuntirishlar va reyting shu yerda ko'rinadi.
          </Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={[s.stateBody, { color: c.textSecondary }]}>{error}</Text>
          <Pressable onPress={load} style={[s.retryBtn, { backgroundColor: c.accentPrimary }]}>
            <Text style={s.retryText}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[s.headline, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
            5 SAVOL #{data.quiz.quiz_number}
          </Text>

          {data.caller && (
            <View style={[s.summaryRow]}>
              <View style={[s.summaryTile, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <Text style={[s.summaryValue, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
                  {data.caller.correct_count}/5
                </Text>
                <Text style={[s.summaryLabel, { color: c.textMuted }]}>Natija</Text>
              </View>
              <View style={[s.summaryTile, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <Text style={[s.summaryValue, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
                  {data.caller.percentile != null ? `${data.caller.percentile}%` : '—'}
                </Text>
                <Text style={[s.summaryLabel, { color: c.textMuted }]} numberOfLines={1}>o'yinchidan yaxshi</Text>
              </View>
              <View style={[s.summaryTile, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={[s.summaryValue, { color: c.textPrimary, fontFamily: typography.fontFamily.extrabold }]}>
                    {data.quiz_streak_days}
                  </Text>
                  <Flame size={16} color="#FF4500" />
                </View>
                <Text style={[s.summaryLabel, { color: c.textMuted }]}>Seriya</Text>
              </View>
            </View>
          )}

          {data.caller && (
            <ShareCard
              quizNumber={data.quiz.quiz_number} correctCount={data.caller.correct_count}
              elapsedMs={data.caller.elapsed_ms}
            />
          )}

          <Text style={[s.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            TO'G'RI JAVOBLAR
          </Text>
          {data.questions.map((q, i) => (
            <View key={q.question_id} style={[s.qCard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
              <View style={s.qHeader}>
                <Text style={[s.qNum, { color: c.textMuted }]}>{i + 1}-savol{q.voided ? ' · bekor qilindi' : ''}</Text>
                <Pressable onPress={() => setReportTarget(q.question_id)} hitSlop={8}>
                  <Flag size={14} color={c.textMuted} />
                </Pressable>
              </View>
              <Text style={[s.qText, { color: c.textPrimary, fontFamily: typography.fontFamily.semibold }]}>
                {q.question_text}
              </Text>
              {q.options.map((opt, oi) => (
                <View key={oi} style={s.optRow}>
                  {oi === q.correct_index
                    ? <Check size={14} color="#22C55E" />
                    : <View style={{ width: 14 }} />}
                  <Text style={[
                    s.optText,
                    { color: oi === q.correct_index ? '#22C55E' : c.textSecondary,
                      fontFamily: oi === q.correct_index ? typography.fontFamily.semibold : typography.fontFamily.regular },
                  ]}>
                    {opt}
                  </Text>
                </View>
              ))}
              <Text style={[s.explanation, { color: c.textSecondary }]}>{q.explanation}</Text>
              <Text style={[s.source, { color: c.textMuted }]}>{q.source}</Text>
            </View>
          ))}

          <Text style={[s.sectionLabel, { color: c.textMuted, fontFamily: typography.fontFamily.semibold }]}>
            REYTING · {data.total_players} o'yinchi
          </Text>
          <View style={[s.leaderboard, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            {data.leaderboard.map(row => (
              <View key={row.user_id} style={s.lbRow}>
                <Text style={[s.lbRank, { color: c.textMuted }]}>#{row.rank}</Text>
                <Text style={[s.lbName, { color: c.textPrimary }]} numberOfLines={1}>
                  {row.first_name || row.username || 'Foydalanuvchi'}
                </Text>
                <Text style={[s.lbScore, { color: c.textSecondary }]}>{row.correct_count}/5</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      <ConfirmModal
        visible={reportTarget !== null}
        emoji="🚩"
        title="Savolni xabar qilasizmi?"
        message="Bu savolda xatolik bor deb hisoblasangiz, adminlarga xabar beramiz."
        confirmText="Xabar qilish"
        cancelText="Bekor qilish"
        onConfirm={confirmReport}
        onCancel={() => setReportTarget(null)}
      />
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

  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  headline: { fontSize: 20 },

  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryTile: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
    alignItems: 'center', gap: 4,
  },
  summaryValue: { fontSize: 18 },
  summaryLabel: { fontSize: 10 },

  sectionLabel: { fontSize: 11, letterSpacing: 0.5, marginTop: spacing.xs },

  qCard: { borderRadius: radius.cardLg, borderWidth: 1, padding: spacing.md, gap: 6 },
  qHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNum: { fontSize: 11 },
  qText: { fontSize: 14, lineHeight: 20 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optText: { fontSize: 13, flex: 1 },
  explanation: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  source: { fontSize: 11, fontStyle: 'italic' },

  leaderboard: { borderRadius: radius.cardLg, borderWidth: 1, overflow: 'hidden' },
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000010',
  },
  lbRank: { fontSize: 12, width: 32 },
  lbName: { fontSize: 13, flex: 1 },
  lbScore: { fontSize: 13 },
})
