/**
 * One ranking row: fixed-width rank (tabular, medal colours for 1–3),
 * avatar, name with a sub-line, and a trailing value. `mine` sits on
 * accentSoft. Shared by the weekly ranking and the competition detail.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { radius, rankColumnWidth, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { Avatar } from '../../components/ui'
import { uzText } from '../today/today'
import { medalTone } from './bellashuv'

export interface RankRowProps {
  rank: number
  name: string
  photoUrl?: string | null
  subtitle?: string
  value: string
  mine?: boolean
  style?: StyleProp<ViewStyle>
}

export function RankRow({ rank, name, photoUrl, subtitle, value, mine, style }: RankRowProps) {
  const { colors } = useTheme()
  const tone = medalTone(rank)
  const shown = mine ? 'Siz' : uzText(name || 'Foydalanuvchi')
  return (
    <View
      accessible
      accessibilityLabel={`${rank}-oʻrin, ${shown}, ${value}`}
      style={[styles.row, mine && { backgroundColor: colors.accentSoft }, style]}
    >
      <Text numberOfLines={1} style={[typeScale.headline, tabular, styles.rank, { color: tone ? colors[tone] : colors.textMuted }]}>
        #{rank}
      </Text>
      <Avatar name={name || '?'} uri={photoUrl} size="sm" />
      <View style={styles.text}>
        <Text style={[typeScale.headline, { color: colors.text }]} numberOfLines={1}>{shown}</Text>
        {subtitle ? (
          <Text style={[typeScale.callout, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={[typeScale.callout, tabular, { color: colors.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
})
