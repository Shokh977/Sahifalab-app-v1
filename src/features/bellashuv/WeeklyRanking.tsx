/**
 * "HAFTALIK REYTING": top 5 (fixed rank column, medal colours for 1–3,
 * initials, name, level and hours, XP), then your row pinned on an
 * accentSoft background with "#56 gacha 120 XP" inside it.
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { space } from '../../design/spacing'
import { Card, SectionTitle } from '../../components/ui'
import { rankGap } from '../today/today'
import { hoursLabel } from './bellashuv'
import { RankRow } from './RankRow'

const TOP = 5

function Row({ e, mine, note }: { e: LeaderboardEntry; mine?: boolean; note?: string }) {
  return (
    <RankRow
      rank={e.rank}
      name={e.first_name || e.username || ''}
      photoUrl={e.photo_url}
      subtitle={`Lv.${e.level} · ${hoursLabel(e.minutes)}`}
      note={note}
      value={`${e.score} XP`}
      mine={mine}
      userId={e.telegram_id}
    />
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
      <SectionTitle title="Haftalik reyting" link={{ label: 'Hammasi', onPress: onAll }} />
      <Card style={styles.card}>
        {top.map(e => <Row key={e.telegram_id} e={e} mine={meInTop && e.telegram_id === me?.telegram_id} />)}
        {me && !meInTop && (
          <View style={[styles.pinned, { borderTopColor: colors.border }]}>
            <Row e={me} mine note={gap.kind === 'gap' ? `#${gap.target} gacha ${gap.xp} XP` : undefined} />
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
  pinned: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.xs, paddingTop: space.xs },
})
