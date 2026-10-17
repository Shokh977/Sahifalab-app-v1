/**
 * CoinPill — coin icon + compact tabular amount ("1.5K"). Coin colour is
 * reserved for coins (spec section 4). Pressable when onPress is given.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Coins } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { controlHeight, iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { tabular, type as typeScale } from '../../design/typography'
import { formatCompact } from '../../lib/formatCompact'
import { Pressable } from './Pressable'

export interface CoinPillProps {
  amount: number
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

const HEIGHT = controlHeight.sm - space.xs
const SLOP = (layout.minTouch - HEIGHT) / 2

export function CoinPill({ amount, onPress, style }: CoinPillProps) {
  const { colors } = useTheme()
  const label = `${amount} tanga`
  const body = (
    <>
      <Coins size={iconSize.sm - 4} color={colors.coin} strokeWidth={iconStroke} />
      <Text style={[typeScale.callout, tabular, { color: colors.coin }]}>{formatCompact(amount)}</Text>
    </>
  )
  const frame = [styles.pill, { backgroundColor: colors.surfaceRaised }, style]

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
    gap: space.xxs,
    paddingHorizontal: space.sm - 2,
    borderRadius: radius.full,
  },
})
