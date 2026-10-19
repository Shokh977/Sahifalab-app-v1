/**
 * Reyting: your place, floating over the bottom of the list — rank, you,
 * "#22 gacha 22 XP" (or "Siz birinchisiz") and a Fokus button, since
 * focus is how you climb. Before you have XP in the period it says so.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Timer } from 'lucide-react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Avatar, Button, Pressable } from '../../components/ui'

const RANK_COL = 30

export function MyRankBar({ me, note, name, photoUrl, id, onPress, onFocus }: {
  me: LeaderboardEntry | null
  note?: string
  /** Your own name and photo, for the avatar when you're not on the board yet. */
  name: string
  photoUrl?: string | null
  id?: number
  onPress?: () => void
  onFocus: () => void
}) {
  const { colors, elevation } = useTheme()
  const sub = me ? note ?? (me.rank === 1 ? 'Siz birinchisiz' : undefined) : 'Fokus XP beradi'
  const label = me ? `Siz ${me.rank}-oʻrindasiz, ${me.score} XP${sub ? `, ${sub}` : ''}` : 'Siz hali reytingda yoʻqsiz'

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.orangeLine }, elevation]}>
      <Pressable onPress={onPress} disabled={!onPress} noFeedback accessibilityLabel={label} style={styles.who}>
        <Text style={[typeScale.label, tabular, styles.rank, { color: colors.accentText }]}>{me ? me.rank : '–'}</Text>
        <Avatar name={name || '?'} id={id} uri={photoUrl} size="row" />
        <View style={styles.flex}>
          <Text style={[typeScale.rowTitle, styles.heavy, { color: colors.text }]} numberOfLines={1}>
            {me ? 'Siz' : 'Hali reytingda yoʻqsiz'}
          </Text>
          {sub ? (
            <Text style={[typeScale.small, tabular, styles.semi, { color: colors.accentText }]} numberOfLines={2}>{sub}</Text>
          ) : null}
        </View>
      </Pressable>
      <Button label="Fokus" icon={Timer} size="sm" onPress={onFocus} />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    borderRadius: radius.xl, borderWidth: 1.5, paddingVertical: space.sm, paddingLeft: space.xs, paddingRight: space.sm,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 },
  rank: { width: RANK_COL, textAlign: 'center', fontFamily: fonts.extrabold },
  flex: { flex: 1, minWidth: 0 },
  heavy: { fontFamily: fonts.extrabold },
  semi: { fontFamily: fonts.semibold },
})
