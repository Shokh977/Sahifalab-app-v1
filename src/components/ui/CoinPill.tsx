/**
 * CoinPill — the v2 header pill (Phase 7.5 C1): 36 px tall, surface with a
 * 1 px border, the gradient gold coin and the compact amount ("1.7K") in
 * 15/700 tabular. Pressable when onPress is given.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { controlHeight, layout, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { formatCompact } from '../../lib/formatCompact'
import { CoinIcon } from './CoinIcon'
import { Pressable } from './Pressable'

export interface CoinPillProps {
  amount: number
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

const HEIGHT = controlHeight.sm - space.xxs
const SLOP = (layout.minTouch - HEIGHT) / 2

export function CoinPill({ amount, onPress, style }: CoinPillProps) {
  const { colors } = useTheme()
  const label = `${amount} tanga`
  const body = (
    <>
      <CoinIcon />
      <Text style={[typeScale.coin, tabular, { color: colors.text }]}>{formatCompact(amount)}</Text>
    </>
  )
  const frame = [styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }, style]

  if (!onPress) return <View style={frame} accessibilityLabel={label}>{body}</View>
  return (
    <Pressable onPress={onPress} hitSlop={SLOP} accessibilityLabel={label} style={frame}>
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 2,
    paddingLeft: space.xs,
    paddingRight: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
})
