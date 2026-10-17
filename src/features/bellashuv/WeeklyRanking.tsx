/**
 * "HAFTALIK REYTING": top 5 (fixed rank column, medal colours for 1–3,
 * initials, name, level and hours, XP), then your row pinned on an
 * accentSoft background with "#56 gacha 120 XP".
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { radius, rankColumnWidth, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Avatar, Button, Card } from '../../components/ui'
import { rankGap, uzText } from '../today/today'
import { hoursLabel, medalTone } from './bellashuv'

const TOP = 5

function Row({ e, mine }: { e: LeaderboardEntry; mine?: boolean }) {
  const { colors } = useTheme()
  const tone = medalTone(e.rank)
  const name = uzText(e.first_name || e.username || 'Foydalanuvchi')
  return (
    <View
      accessible
      accessibilityLabel={`${e.rank}-oʻrin, ${name}, ${e.score} XP`}
      style={[styles.row, mine && { backgroundColor: colors.accentSoft }]}
    >
      <Text
        numberOfLines={1}
        style={[typeScale.headline, tabular, styles.rank, { color: tone ? colors[tone] : colors.textMuted }]}
      >
        #{e.rank}
      </Text>
      <Avatar name={e.first_name || e.username || '?'} size="sm" />
      <View style={styles.text}>
        <Text style={[typeScale.headline, { color: colors.text }]} numberOfLines={1}>{mine ? 'Siz' : name}</Text>
        <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>
          Lv.{e.level} · {hoursLabel(e.minutes)}
        </Text>
      </View>
      <Text style={[typeScale.callout, tabular, { color: colors.text }]}>{e.score} XP</Text>
    </View>
  )
}

export function WeeklyRanking({ entries, myRank, onAll }: {
  entries: readonly LeaderboardEntry[]
  myRank: number | null
  onAll: () => void
}) {
  const { colors } = useTheme()
  if (entries.length === 0) return null

  const top = entries.filter(e => e.rank <= TOP).slice(0, TOP)
  const me = entries.find(e => e.is_me) ?? (myRank != null ? entries.find(e => e.rank === myRank) : undefined)
  const meInTop = !!me && top.some(t => t.telegram_id === me.telegram_id)
  const gap = rankGap(entries, myRank)

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[typeScale.overline, styles.flex, { color: colors.textMuted }]} accessibilityRole="header">
          Haftalik reyting
        </Text>
        <Button label="Hammasi" variant="ghost" size="sm" onPress={onAll} />
      </View>
      <Card style={styles.card}>
        {top.map(e => <Row key={e.telegram_id} e={e} mine={meInTop && e.telegram_id === me?.telegram_id} />)}
        {me && !meInTop && (
          <View style={[styles.pinned, { borderTopColor: colors.border }]}>
            <Row e={me} mine />
            {gap.kind === 'gap' && (
              <Text style={[typeScale.callout, tabular, styles.gapLine, { color: colors.accentText }]}>
                #{gap.target} gacha {gap.xp} XP
              </Text>
            )}
          </View>
        )}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.xs },
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  card: { paddingVertical: space.xs, paddingHorizontal: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
  },
  rank: { width: rankColumnWidth },
  text: { flex: 1, gap: 2 },
  pinned: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.xs, paddingTop: space.xs },
  gapLine: { paddingHorizontal: space.xs, paddingBottom: space.xs },
})
