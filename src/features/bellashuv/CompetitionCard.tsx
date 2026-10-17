/**
 * Bellashuv: the one competition card.
 * Live → title, the team bar (team competitions) or progress, your
 * contribution and time left. Next → "KEYINGI BELLASHUV", title, a
 * Countdown, one line of rules and "Eslatma qoʻyish".
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Bell, BellRing } from 'lucide-react-native'
import type { Challenge } from '../../../lib/api'
import { challengeGoalText, fmtMetricGoal } from '../../../lib/challenges'
import { TeamHeadToHeadBar } from '../../../components/study/TeamHeadToHeadBar'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Button, Card, Countdown, ProgressBar, showToast } from '../../components/ui'
import { uzText } from '../today/today'
import { timeLeft, type MainCompetition } from './bellashuv'
import { hasReminder, setReminder } from './competitionReminder'

function progressOf(c: Challenge): number | null {
  if (c.challenge_type === 'consistency' && c.required_days) return c.qualifying_days / c.required_days
  if (c.target_value) return c.progress_value / c.target_value
  return null
}

export function CompetitionCard({ main, now, onOpen }: { main: NonNullable<MainCompetition>; now: number; onOpen: () => void }) {
  const { colors, deckColors } = useTheme()
  const c = main.challenge
  const [reminded, setReminded] = useState(false)

  useEffect(() => {
    if (main.kind !== 'next') return
    let alive = true
    hasReminder(c.id).then(v => { if (alive) setReminded(v) })
    return () => { alive = false }
  }, [main.kind, c.id])

  if (main.kind === 'live') {
    const progress = progressOf(c)
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
          ) : progress != null ? (
            <ProgressBar value={progress} thickness="thick" accessibilityLabel="Bellashuvdagi taraqqiyot" />
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

  return (
    <Card variant="pressable" onPress={onOpen} accessibilityLabel={`Keyingi bellashuv: ${c.title}`}>
      <View style={styles.gap}>
        <Text style={[typeScale.overline, { color: colors.textMuted }]}>Keyingi bellashuv</Text>
        <Text style={[typeScale.title2, { color: colors.text }]} numberOfLines={2}>{uzText(c.title)}</Text>
        <Countdown target={c.starts_at} />
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={2}>{uzText(challengeGoalText(c))}</Text>
        <Button
          label={reminded ? 'Eslatma qoʻyildi' : 'Eslatma qoʻyish'}
          icon={reminded ? BellRing : Bell}
          variant="secondary"
          fullWidth
          disabled={reminded}
          onPress={remind}
        />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  flex: { flex: 1 },
})
