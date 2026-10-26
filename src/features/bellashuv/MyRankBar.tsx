/**
 * Reyting: your place, floating over the bottom of the list — rank, you,
 * "#22 gacha 22 XP" (or "Siz birinchisiz") and a Fokus button, since
 * focus is how you climb. Before you have XP in the period it says so.
 * The Fokus button is a soft orange pill (14 px accentText): white text on
 * orange would have to be 18 px (contrast rule), too loud for this bar.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Timer } from 'lucide-react-native'
import type { LeaderboardEntry } from '../../../lib/api'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, layout, radius, space, avatarSize } from '../../design/spacing'
import { fonts, tabular, type as typeScale } from '../../design/typography'
import { Pressable } from '../../components/ui'
import { RingedAvatar } from '../profile/cosmetics/RingedAvatar'
import { useMyLookStore } from '../../../stores/myLookStore'

const RANK_COL = 26

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
  const myRing = useMyLookStore(st => st.ring)
  const { colors, elevation } = useTheme()
  const sub = me ? note ?? (me.rank === 1 ? 'Siz birinchisiz' : undefined) : 'Fokus XP beradi'
  const label = me ? `Siz ${me.rank}-oʻrindasiz, ${me.score} XP${sub ? `, ${sub}` : ''}` : 'Siz hali reytingda yoʻqsiz'

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.orangeLine }, elevation]}>
      <Pressable onPress={onPress} disabled={!onPress} noFeedback accessibilityLabel={label} style={styles.who}>
        <Text style={[typeScale.label, tabular, styles.rank, { color: colors.accentText }]}>{me ? me.rank : '–'}</Text>
        <RingedAvatar ring={me?.ring ?? myRing} name={name || '?'} id={id} uri={photoUrl} diameter={avatarSize.sm} />
        <View style={styles.flex}>
          <Text style={[typeScale.label, styles.heavy, { color: colors.text }]} numberOfLines={1}>
            {me ? 'Siz' : 'Hali reytingda yoʻqsiz'}
          </Text>
          {sub ? (
            <Text style={[typeScale.small, tabular, styles.semi, { color: colors.accentText }]} numberOfLines={2}>{sub}</Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onFocus}
        accessibilityLabel="Fokusni boshlash"
        hitSlop={space.xs}
        style={[styles.focus, { backgroundColor: colors.accentSoft, borderColor: colors.orangeLine }]}
      >
        <Timer size={iconSize.sm} color={colors.accentText} strokeWidth={iconStroke} />
        <Text style={[typeScale.link, { color: colors.accentText }]}>Fokus</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    borderRadius: radius.xl, borderWidth: 1.5, paddingVertical: space.xs, paddingLeft: space.xs, paddingRight: space.xs,
  },
  focus: {
    flexDirection: 'row', alignItems: 'center', gap: space.xxs, minHeight: layout.minTouch - space.sm,
    paddingHorizontal: space.sm, borderRadius: radius.full, borderWidth: 1,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 },
  rank: { width: RANK_COL, textAlign: 'center', fontFamily: fonts.extrabold },
  flex: { flex: 1, minWidth: 0 },
  heavy: { fontFamily: fonts.extrabold },
  semi: { fontFamily: fonts.semibold },
})
