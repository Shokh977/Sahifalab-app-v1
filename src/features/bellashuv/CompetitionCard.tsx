/**
 * Bellashuv: the one competition card.
 * Live → title, the team bar (team competitions) or the distance to the
 * top 10 (Phase 7.5 A3; hidden when there's no data — never an empty bar),
 * your contribution and time left. Live but not joined → no progress at
 * all, just "Qoʻshilish" (Phase 7.5). Next → "KEYINGI BELLASHUV", title, a
 * Countdown, one line of rules and "Eslatma qoʻyish".
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Bell, BellRing, UserPlus } from 'lucide-react-native'
import { challenges as challengesApi } from '../../../lib/api'
import { challengeGoalText, fmtMetricGoal } from '../../../lib/challenges'
import { TeamHeadToHeadBar } from '../../../components/study/TeamHeadToHeadBar'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Button, Card, Countdown, ProgressBar, showToast } from '../../components/ui'
import { uzText } from '../today/today'
import { timeLeft, type MainCompetition } from './bellashuv'
import { hasReminder, setReminder } from './competitionReminder'
import { TOP_N, topTenGap, type TopTen } from './topTen'

export function CompetitionCard({ main, now, onOpen, onJoined }: {
  main: NonNullable<MainCompetition>
  now: number
  onOpen: () => void
  /** After "Qoʻshilish" succeeds: reload so the card shows your progress. */
  onJoined?: () => void
}) {
  const { colors, deckColors } = useTheme()
  const c = main.challenge
  const [reminded, setReminded] = useState(false)

  useEffect(() => {
    if (main.kind !== 'next') return
    let alive = true
    hasReminder(c.id).then(v => { if (alive) setReminded(v) })
    return () => { alive = false }
  }, [main.kind, c.id])

  // Distance to the top 10, for a live individual competition you've joined.
  const wantsTopTen = main.kind === 'live' && c.joined && c.challenge_type !== 'team'
  const [topTen, setTopTen] = useState<{ id: string; value: TopTen | null } | null>(null)
  useEffect(() => {
    if (!wantsTopTen) return
    let alive = true
    challengesApi.leaderboard(c.id, TOP_N)
      .then(r => { if (alive) setTopTen({ id: c.id, value: topTenGap(r.caller, r.leaderboard) }) })
      .catch(() => { if (alive) setTopTen({ id: c.id, value: null }) })
    return () => { alive = false }
  }, [wantsTopTen, c.id])
  const gap = wantsTopTen && topTen?.id === c.id ? topTen.value : null
  const [joining, setJoining] = useState(false)

  const join = async () => {
    setJoining(true)
    try {
      await challengesApi.join(c.id)
      showToast('success', 'Bellashuvga qoʻshildingiz')
      onJoined?.()
    } catch (e) {
      showToast('error', e instanceof Error && e.message ? e.message : 'Qoʻshilib boʻlmadi. Qayta urinib koʻring.')
    } finally {
      setJoining(false)
    }
  }

  // Live, not joined: nothing of yours to measure yet — the action is to join.
  // A plain card: it holds buttons (no nested buttons).
  if (main.kind === 'live' && !c.joined) {
    return (
      <Card accessibilityLabel={`Faol bellashuv: ${c.title}`}>
        <View style={styles.gap}>
          <Text style={[typeScale.overline, { color: colors.successText }]}>Faol bellashuv · {timeLeft(c.ends_at, now)}</Text>
          <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={2}>{uzText(c.title)}</Text>
          <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{uzText(challengeGoalText(c))}</Text>
          <View style={styles.row}>
            <Button label="Qoʻshilish" icon={UserPlus} loading={joining} onPress={join} style={styles.grow} />
            <Button label="Batafsil" variant="ghost" onPress={onOpen} />
          </View>
        </View>
      </Card>
    )
  }

  if (main.kind === 'live') {
    return (
      <Card variant="pressable" onPress={onOpen} accessibilityLabel={`Faol bellashuv: ${c.title}`}>
        <View style={styles.gap}>
          <Text style={[typeScale.overline, { color: colors.successText }]}>Faol bellashuv · {timeLeft(c.ends_at, now)}</Text>
          <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={2}>{uzText(c.title)}</Text>
          {c.challenge_type === 'team' && c.team ? (
            <TeamHeadToHeadBar
              teamAName={c.team_a_name ?? 'Guruh A'} teamAColor={c.team_a_color ?? deckColors[0]} teamATotal={c.team_a_total}
              teamBName={c.team_b_name ?? 'Guruh B'} teamBColor={c.team_b_color ?? deckColors[4]} teamBTotal={c.team_b_total}
              fmtValue={v => fmtMetricGoal(v, c.metric)}
            />
          ) : gap ? (
            <View style={styles.gapBlock}>
              <Text style={[typeScale.callout, tabular, { color: gap.kind === 'in' ? colors.successText : colors.text }]}>
                {gap.kind === 'in' ? `Top 10 dasiz · #${gap.rank}` : `Top 10 gacha ${fmtMetricGoal(gap.left, c.metric)} qoldi`}
              </Text>
              <ProgressBar
                value={gap.kind === 'in' ? 1 : gap.progress}
                thickness="thick"
                accessibilityLabel={gap.kind === 'in' ? 'Top 10 ichida' : 'Top 10 gacha'}
              />
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={[typeScale.callout, styles.flex, { color: colors.text }]}>
              Sizning hissangiz: {fmtMetricGoal(c.progress_value, c.metric)}
            </Text>
            {c.rank != null && (
              <Text style={[typeScale.callout, { color: colors.accentText }]}>#{c.rank}-oʻrin</Text>
            )}
          </View>
        </View>
      </Card>
    )
  }

  const remind = async () => {
    const ok = await setReminder(c)
    if (ok) {
      setReminded(true)
      showToast('success', 'Bellashuv boshlanganda eslatamiz')
    } else {
      showToast('error', 'Eslatma qoʻyilmadi. Bildirishnomalarga ruxsat bering.')
    }
  }

  // Not a pressable card: it holds buttons of its own (no nested buttons).
  return (
    <Card accessibilityLabel={`Keyingi bellashuv: ${c.title}`}>
      <View style={styles.gap}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Keyingi bellashuv</Text>
        <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={2}>{uzText(c.title)}</Text>
        <Countdown target={c.starts_at} />
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{uzText(challengeGoalText(c))}</Text>
        <View style={styles.row}>
          <Button
            label={reminded ? 'Eslatma qoʻyildi' : 'Eslatma qoʻyish'}
            icon={reminded ? BellRing : Bell}
            variant="secondary"
            disabled={reminded}
            onPress={remind}
            style={styles.grow}
          />
          <Button label="Batafsil" variant="ghost" onPress={onOpen} />
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  gapBlock: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  flex: { flex: 1 },
  grow: { flex: 1, alignSelf: 'auto' },
})
