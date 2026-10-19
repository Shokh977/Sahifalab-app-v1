/**
 * iOS large title (Phase 8, first used by Reyting). `LargeTitle` sits at
 * the top of the scroll content; as it scrolls under the nav bar,
 * `LargeTitleBar` fades its small centred title and hairline in. Pulling
 * down past the top grows the large title slightly, like iOS. Both read
 * the same scroll offset (a Reanimated scroll handler), so nothing runs on
 * the JS thread while scrolling.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { largeTitle } from '../../design/motion'
import { iconSize, iconStroke, layout, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import type { HeaderAction } from './ScreenHeader'
import { Pressable } from './Pressable'

const PULL = 120
const PULL_SCALE = 1.08

export function LargeTitle({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const { colors } = useTheme()
  const style = useAnimatedStyle(() => {
    const y = scrollY.get()
    return {
      opacity: interpolate(y, [0, largeTitle.collapse], [1, 0], 'clamp'),
      transform: [{ scale: interpolate(y, [-PULL, 0], [PULL_SCALE, 1], 'clamp') }],
    }
  })
  return (
    <Animated.View style={[styles.large, style]}>
      <Text style={[typeScale.screenTitle, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
    </Animated.View>
  )
}

export function LargeTitleBar({ title, scrollY, backLabel, onBack, actions = [] }: {
  title: string
  scrollY: SharedValue<number>
  /** iOS back label: the previous screen's name. */
  backLabel: string
  onBack: () => void
  actions?: HeaderAction[]
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const small = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [largeTitle.collapse * 0.6, largeTitle.collapse], [0, 1], 'clamp'),
  }))
  const hairline = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, largeTitle.collapse], [0, 1], 'clamp'),
  }))

  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={styles.row}>
        <Pressable onPress={onBack} accessibilityLabel={`Orqaga: ${backLabel}`} style={styles.back}>
          <ChevronLeft size={iconSize.md} color={colors.accentText} strokeWidth={iconStroke} />
          <Text style={[typeScale.link, { color: colors.accentText }]} numberOfLines={1}>{backLabel}</Text>
        </Pressable>
        <Animated.View style={[styles.center, small]} pointerEvents="none">
          <Text style={[typeScale.headline, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        </Animated.View>
        <View style={styles.trailing}>
          {actions.slice(0, 2).map(a => (
            <Pressable key={a.accessibilityLabel} onPress={a.onPress} accessibilityLabel={a.accessibilityLabel} style={styles.icon}>
              <a.icon size={iconSize.md} color={colors.text} strokeWidth={iconStroke} />
            </Pressable>
          ))}
        </View>
      </View>
      <Animated.View style={[styles.hairline, { backgroundColor: colors.border }, hairline]} />
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { zIndex: 1 },
  row: { height: layout.minTouch, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xxs },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouch, paddingRight: space.xs, gap: space.xxs / 2 },
  center: { position: 'absolute', left: layout.minTouch * 2, right: layout.minTouch * 2, alignItems: 'center' },
  trailing: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  icon: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  hairline: { height: StyleSheet.hairlineWidth },
  large: { paddingHorizontal: layout.gutter, paddingTop: space.xxs, paddingBottom: space.sm, transformOrigin: 'left' },
})
