/**
 * "Haftalik reyting" on Bellashuv (Phase 7.5 D1): XP this week, as a card —
 * the podium (#2 / #1 / #3), rows #4 and #5, your row pinned below (orange
 * soft, with "#22 gacha 22 XP" inside) unless you're already shown, and
 * "Toʻliq reyting". Past the top list your row comes from around_me.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { layout, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Pressable, SectionTitle } from '../../components/ui'
import { daysToWeeklyReset } from '../today/rivals'
import { chaseNote, rankingRows } from './bellashuv'
import { Podium } from './Podium'
import { RankingRow } from './RankingRow'

const CARD_RADIUS = 28

export function WeeklyRanking({ entries, around, now, onAll }: {
  entries: readonly LeaderboardEntry[]
  around?: readonly LeaderboardEntry[]
  myRank?: number | null
  now: number
  onAll: () => void
}) {
  const { colors, elevation } = useTheme()
  if (entries.length === 0) return null

  const { podium, rows, pinned } = rankingRows(entries, around)
  const note = pinned ? chaseNote(pinned, [...entries, ...(around ?? [])]) : undefined

  return (
    <View style={styles.section}>
      <SectionTitle title="Haftalik reyting" meta={`XP boʻyicha · ${daysToWeeklyReset(now)} kun qoldi`} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
        <Podium entries={podium.map(e => ({ id: e.telegram_id, rank: e.rank, name: e.is_me ? 'Siz' : e.first_name || e.username || '', photoUrl: e.photo_url, xp: e.score }))} />
        {rows.map(e => <RankingRow key={e.telegram_id} e={e} mine={e.is_me} />)}
        {pinned && <View style={styles.pinned}><RankingRow e={pinned} mine note={note} /></View>}
        <Pressable onPress={onAll} accessibilityRole="link" style={styles.all}>
          <Text style={[typeScale.link, { color: colors.accentText }]}>Toʻliq reyting</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  card: { borderRadius: CARD_RADIUS, borderWidth: 1, paddingTop: space.md + 2, paddingHorizontal: space.md, paddingBottom: space.xxs, gap: space.xxs + 2 },
  pinned: { marginTop: space.xxs },
  all: { alignSelf: 'center', minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.sm },
})
