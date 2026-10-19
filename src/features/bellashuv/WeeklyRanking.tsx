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
import { layout, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Avatar, Pressable, SectionTitle } from '../../components/ui'
import { groupDigits } from '../courses/courses'
import { daysToWeeklyReset } from '../today/rivals'
import { uzText } from '../today/today'
import { hoursLabel, rankingRows } from './bellashuv'
import { Podium } from './Podium'

const CARD_RADIUS = 28
const RANK_COL = 30
const ROW_AVATAR = 38

function Row({ e, mine, note }: { e: LeaderboardEntry; mine?: boolean; note?: string }) {
  const { colors } = useTheme()
  const name = mine ? 'Siz' : uzText(e.first_name || e.username || 'Foydalanuvchi')
  return (
    <View
      accessible
      accessibilityLabel={`${e.rank}-oʻrin, ${name}, ${e.score} XP${note ? `, ${note}` : ''}`}
      style={[
        styles.row,
        mine ? [styles.mine, { backgroundColor: colors.accentSoft, borderColor: colors.orangeLine }] : { borderTopWidth: 1, borderTopColor: colors.border },
      ]}
    >
      <Text style={[typeScale.label, tabular, styles.rank, { color: mine ? colors.accentText : colors.textMuted, fontFamily: mine ? fonts.extrabold : fonts.bold }]}>
        {e.rank}
      </Text>
      <Avatar name={e.first_name || '?'} id={e.telegram_id} uri={e.photo_url} diameter={ROW_AVATAR} />
      <View style={styles.flex}>
        <Text style={[typeScale.rowTitle, mine && styles.heavy, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[typeScale.small, tabular, { color: note ? colors.accentText : colors.textMuted, fontFamily: note ? fonts.semibold : fonts.regular }]} numberOfLines={1}>
          {note ?? `Lv.${e.level} · ${hoursLabel(e.minutes)}`}
        </Text>
      </View>
      <Text style={[typeScale.rowTitle, tabular, mine && styles.heavy, { color: colors.text }]}>{groupDigits(e.score)}{mine ? " XP" : ""}</Text>
    </View>
  )
}

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
  const above = pinned ? [...entries, ...(around ?? [])].find(e => e.rank === pinned.rank - 1) : undefined
  const note = pinned && above ? `#${above.rank} gacha ${groupDigits(Math.max(1, above.score - pinned.score))} XP` : undefined

  return (
    <View style={styles.section}>
      <SectionTitle title="Haftalik reyting" meta={`XP boʻyicha · ${daysToWeeklyReset(now)} kun qoldi`} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation]}>
        <Podium entries={podium.map(e => ({ id: e.telegram_id, rank: e.rank, name: e.is_me ? 'Siz' : e.first_name || e.username || '', photoUrl: e.photo_url, xp: e.score }))} />
        {rows.map(e => <Row key={e.telegram_id} e={e} mine={e.is_me} />)}
        {pinned && <View style={styles.pinned}><Row e={pinned} mine note={note} /></View>}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm - 2, paddingHorizontal: space.xxs },
  mine: { borderWidth: 1.5, borderRadius: radius.lg - 2, paddingRight: space.sm },
  rank: { width: RANK_COL, textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  heavy: { fontFamily: fonts.extrabold },
  pinned: { marginTop: space.xxs },
  all: { alignSelf: 'center', minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.sm },
})
