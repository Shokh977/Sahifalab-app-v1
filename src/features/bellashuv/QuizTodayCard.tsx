/**
 * Bellashuv: today's 5 Savol as one compact card (Phase 7.5 D1) — a blue
 * icon tile, "#69 · Pul va iqtisod", "Bugun 17 kishi oʻynadi", and the score
 * on the right ("Oʻynash" pill before you've played). A raised strip under
 * it: played → "#10-oʻrin" · "Ertaga 09:00 da yangi savollar" · "Natijalar"
 * (opens the results with the 5 Savol ranking); not played → the time left.
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CircleHelp } from 'lucide-react-native'
import { dailyQuiz, type DailyQuizStatus } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Pressable, SectionTitle } from '../../components/ui'
import { opensAt } from '../quiz/quizPlay'
import { resumeLabel } from '../today/primaryAction'
import { quizClosesIn, uzText } from '../today/today'

const ICON_TILE = 48
const CARD_RADIUS = 24

export function QuizTodayCard({ quiz, fetchedAt, now, onOpen, onResults }: {
  quiz: DailyQuizStatus | null
  fetchedAt: number
  now: number
  onOpen: () => void
  /** The results screen (with the 5 Savol ranking). */
  onResults: () => void
}) {
  const { colors, elevation, tint } = useTheme()
  const played = quiz?.state === 'submitted'
  const quizId = quiz?.id
  const statusRank = quiz?.my_rank ?? null
  const [fetchedRank, setFetchedRank] = useState<{ id: number; rank: number | null } | null>(null)

  // Older backends don't send my_rank: ask the results once.
  useEffect(() => {
    if (!played || quizId == null || statusRank != null) return
    let cancelled = false
    dailyQuiz.results(quizId)
      .then(r => { if (!cancelled) setFetchedRank({ id: quizId, rank: r.caller?.rank ?? null }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [played, quizId, statusRank])

  if (!quiz) return null
  const rank = statusRank ?? (fetchedRank?.id === quiz.id ? fetchedRank.rank : null)
  const secondsLeft = Math.max(0, quiz.seconds_remaining - Math.floor((now - fetchedAt) / 1000))
  const answered = quiz.state === 'in_progress' ? quiz.answered_count ?? 0 : 0
  const blue = tint('blue')
  const players = quiz.players_count == null ? null
    : quiz.players_count === 0 ? 'Hali hech kim oʻynamadi' : `Bugun ${quiz.players_count} kishi oʻynadi`
  const title = `#${quiz.quiz_number}${quiz.theme ? ` · ${uzText(quiz.theme)}` : ''}`

  return (
    <View style={styles.section}>
      <SectionTitle title="5 Savol" meta="Kunlik viktorina" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
        <Pressable
          onPress={played ? onResults : onOpen}
          accessibilityLabel={played ? `5 Savol ${title}, ${quiz.correct_count ?? 0} dan 5` : `5 Savol ${title}, oʻynash`}
          style={styles.top}
        >
          <View style={[styles.icon, { backgroundColor: blue.soft }]}>
            <CircleHelp size={iconSize.md} color={blue.ink} strokeWidth={iconStroke + 0.1} />
          </View>
          <View style={styles.flex}>
            <Text style={[typeScale.tileTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {players ? <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{players}</Text> : null}
          </View>
          {played ? (
            <Text style={[typeScale.title2, tabular, styles.heavy, { color: colors.text }]}>{quiz.correct_count ?? 0}/5</Text>
          ) : (
            <View style={[styles.pill, { backgroundColor: colors.accentSoft, borderColor: colors.orangeLine }]}>
              <Text style={[typeScale.callout, styles.bold, { color: colors.accentText }]}>
                {answered > 0 ? resumeLabel(answered) : 'Oʻynash'}
              </Text>
            </View>
          )}
        </Pressable>

        {played ? (
          <Pressable onPress={onResults} accessibilityLabel="Natijalar" style={[styles.strip, { backgroundColor: colors.surfaceRaised }]}>
            {rank != null && (
              <Text style={[typeScale.callout, tabular, styles.heavy, { color: colors.accentText }]}>#{rank}-oʻrin</Text>
            )}
            <Text style={[typeScale.callout, styles.flex, { color: colors.textMuted }]} numberOfLines={3}>
              Ertaga {opensAt(secondsLeft, now)} da yangi savollar
            </Text>
            <Text style={[typeScale.callout, styles.bold, { color: colors.accentText }]}>Natijalar</Text>
          </Pressable>
        ) : (
          <View style={[styles.strip, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[typeScale.callout, tabular, { color: colors.textMuted }]}>{quizClosesIn(secondsLeft)}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  card: { borderRadius: CARD_RADIUS, borderWidth: 1, padding: space.md, gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { width: ICON_TILE, height: ICON_TILE, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: fonts.bold },
  heavy: { fontFamily: fonts.extrabold },
  pill: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: space.sm, paddingVertical: space.xxs + 2 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: space.sm - 2, borderRadius: radius.md, paddingVertical: space.sm - 2, paddingHorizontal: space.sm },
})
