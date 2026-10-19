/**
 * Card — plain / pressable / hero, with a skeleton state.
 * Dark mode separates by surface colour; light mode adds the one soft shadow.
 */
import React from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../design/ThemeProvider'
import { radius, space } from '../../design/spacing'
import { Pressable } from './Pressable'
import { SkeletonBlock, SkeletonLine } from './Skeleton'

export type CardVariant = 'plain' | 'pressable' | 'hero'

export interface CardProps {
  variant?: CardVariant
  onPress?: () => void
  loading?: boolean
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

export function Card({ variant = 'plain', onPress, loading, accessibilityLabel, style, children }: CardProps) {
  const { colors, elevation } = useTheme()
  const hero = variant === 'hero'
  const frame: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surface,
      borderRadius: hero ? radius.xl : radius.lg,
      padding: hero ? space.lg : space.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevation,
    style,
  ]

  const content = loading ? (
    <View style={{ gap: space.sm }} accessibilityLabel="Yuklanmoqda">
      {hero && <SkeletonBlock height={space.huge * 2} borderRadius={radius.lg} />}
      <SkeletonLine width="60%" />
      <SkeletonLine width="85%" />
    </View>
  ) : children

  if ((variant === 'pressable' || (hero && onPress)) && !loading) {
    return (
      <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} style={frame}>
        {content}
      </Pressable>
    )
  }
  return <View style={frame} accessibilityLabel={accessibilityLabel}>{content}</View>
}
