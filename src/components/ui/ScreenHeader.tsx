/**
 * ScreenHeader — back (48×48 target), title, up to two trailing actions;
 * pads for the top safe area.
 */
import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../design/ThemeProvider'
import { iconSize, iconStroke, layout, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { Pressable } from './Pressable'

export interface HeaderAction {
  icon: LucideIcon
  onPress: () => void
  accessibilityLabel: string
}

export interface ScreenHeaderProps {
  title?: string
  /** Defaults to router.back(); pass `false` to hide the back button. */
  onBack?: (() => void) | false
  actions?: HeaderAction[]
  /** Skip the safe-area inset (header inside a sheet or modal). */
  noInset?: boolean
  style?: StyleProp<ViewStyle>
}

export function ScreenHeader({ title, onBack, actions = [], noInset, style }: ScreenHeaderProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const back = onBack === false ? null : onBack ?? (() => router.back())

  return (
    <View style={[styles.bar, { paddingTop: noInset ? 0 : insets.top, backgroundColor: colors.bg }, style]}>
      <View style={styles.side}>
        {back && (
          <Pressable onPress={back} accessibilityLabel="Orqaga" style={styles.icon}>
            <ChevronLeft size={iconSize.md} color={colors.text} strokeWidth={iconStroke} />
          </Pressable>
        )}
      </View>
      <Text
        style={[typeScale.headline, styles.title, { color: colors.text }]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View style={[styles.side, styles.trailing]}>
        {actions.slice(0, 2).map(a => (
          <Pressable key={a.accessibilityLabel} onPress={a.onPress} accessibilityLabel={a.accessibilityLabel} style={styles.icon}>
            <a.icon size={iconSize.md} color={colors.text} strokeWidth={iconStroke} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xxs },
  // Two icon slots wide on both sides so the title stays centred.
  side: { width: layout.minTouch * 2, flexDirection: 'row' },
  trailing: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  icon: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
})
