/**
 * One ranking row (Phase 7.5 D1, shared with the full Reyting screen in
 * Phase 8): rank, avatar, name with "Lv.8 · 29,2 soat" (or a note such as
 * "#22 gacha 22 XP"), and XP on the right. Your own row is orange soft
 * with an orange line; the others sit on a hairline unless `first`.
 * `dense` (the full Reyting list): 14 px names and XP, 32 px avatars.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { avatarSize, radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Avatar, Pressable } from '../../components/ui'
import { groupDigits } from '../courses/courses'
import { uzText } from '../today/today'
import { hoursLabel } from './bellashuv'

const RANK_COL = 30
const ROW_AVATAR = 38
const DENSE_RANK_COL = 26

export function RankingRow({ e, mine, note, first, dense, onPress }: {
  e: LeaderboardEntry
  mine?: boolean
  /** Replaces the level and hours line, in orange. */
  note?: string
  /** No hairline above (the first row of a group). */
  first?: boolean
  dense?: boolean
  onPress?: () => void
}) {
  const { colors } = useTheme()
  const name = mine ? 'Siz' : uzText(e.first_name || e.username || 'Foydalanuvchi')
  const label = `${e.rank}-oʻrin, ${name}, ${e.score} XP${note ? `, ${note}` : ''}`
  const titleType = dense ? typeScale.label : typeScale.rowTitle
  const style = [
    styles.row,
    dense && styles.dense,
    mine
      ? [styles.mine, { backgroundColor: colors.accentSoft, borderColor: colors.orangeLine }]
      : !first && { borderTopWidth: 1, borderTopColor: colors.border },
  ]
  const content = (
    <>
      <Text style={[typeScale.label, tabular, styles.rank, dense && styles.denseRank, { color: mine ? colors.accentText : colors.textMuted, fontFamily: mine ? fonts.extrabold : fonts.bold }]}>
        {e.rank}
      </Text>
      <Avatar name={e.first_name || '?'} id={e.telegram_id} uri={e.photo_url} diameter={dense ? avatarSize.sm : ROW_AVATAR} />
      <View style={styles.flex}>
        <Text style={[titleType, styles.bold, mine && styles.heavy, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[typeScale.small, tabular, { color: note ? colors.accentText : colors.textMuted, fontFamily: note ? fonts.semibold : fonts.regular }]} numberOfLines={2}>
          {note ?? `Lv.${e.level} · ${hoursLabel(e.minutes)}`}
        </Text>
      </View>
      <Text style={[titleType, tabular, styles.bold, mine && styles.heavy, { color: colors.text }]}>{groupDigits(e.score)}{mine ? ' XP' : ''}</Text>
    </>
  )

  return onPress ? (
    <Pressable onPress={onPress} accessibilityLabel={label} style={style}>{content}</Pressable>
  ) : (
    <View accessible accessibilityLabel={label} style={style}>{content}</View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm - 2, paddingHorizontal: space.xxs },
  mine: { borderWidth: 1.5, borderRadius: radius.lg - 2, paddingRight: space.sm },
  rank: { width: RANK_COL, textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: fonts.bold },
  heavy: { fontFamily: fonts.extrabold },
  dense: { paddingVertical: space.xs },
  denseRank: { width: DENSE_RANK_COL },
})
