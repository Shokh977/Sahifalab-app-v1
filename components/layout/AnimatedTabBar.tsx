import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Timer, GraduationCap, Cards, Trophy } from 'phosphor-react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

const TAB_BAR_HEIGHT = 56
const DOT_WIDTH      = 4

type PhosphorIcon = React.ComponentType<{ size: number; color: string; weight: 'regular' | 'fill' }>

// "notifications" and "profile" are intentionally not listed here — both
// stay registered routes (see (tabs)/_layout.tsx) so the bell icon and every
// screen's top-bar avatar (ProfileAvatarButton) can still push to them, but
// neither is a tab button. Profil was removed from the bar in favor of
// Musobaqalar (step-22) — it's reachable from the avatar on every screen.
const TAB_CONFIG: Array<{ name: string; label: string; Icon: PhosphorIcon }> = [
  { name: 'index',       label: 'Bosh sahifa', Icon: House         as PhosphorIcon },
  { name: 'study',       label: "O'qish",       Icon: Timer         as PhosphorIcon },
  { name: 'courses',     label: 'Kurslar',      Icon: GraduationCap as PhosphorIcon },
  { name: 'flashcards',  label: 'Kartalar',     Icon: Cards         as PhosphorIcon },
  { name: 'musobaqalar', label: 'Bellashuv',    Icon: Trophy        as PhosphorIcon },
]

const TAB_COUNT = TAB_CONFIG.length

export function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const { c }       = useTheme()
  const insets      = useSafeAreaInsets()

  const screenWidth = Dimensions.get('window').width
  const tabWidth    = screenWidth / TAB_COUNT

  // Clamp so the sliding dot doesn't try to animate past the visible bar
  // when the active route is the hidden "notifications" screen.
  const clampedIndex = Math.min(state.index, TAB_COUNT - 1)

  const dotX = useRef(
    new Animated.Value(clampedIndex * tabWidth + tabWidth / 2 - DOT_WIDTH / 2)
  ).current

  useEffect(() => {
    Animated.timing(dotX, {
      toValue:         clampedIndex * tabWidth + tabWidth / 2 - DOT_WIDTH / 2,
      duration:        250,
      useNativeDriver: true,
    }).start()
  }, [clampedIndex, tabWidth])

  return (
    <View
      style={[
        styles.bar,
        {
          height:          TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom:   insets.bottom,
          backgroundColor: c.bgSecondary,
          borderTopColor:  c.borderSubtle,
        },
      ]}
    >
      {/* Sliding active-tab dot */}
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: c.accentPrimary, transform: [{ translateX: dotX }] },
        ]}
      />

      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG.find(t => t.name === route.name)
        if (!cfg) return null

        const isFocused = state.index === index
        const color     = isFocused ? c.accentPrimary : c.textDisabled

        return (
          <Pressable
            key={route.key}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              const event = navigation.emit({
                type: 'tabPress', target: route.key, canPreventDefault: true,
              })
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name)
            }}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityLabel={cfg.label}
          >
            <View style={{ position: 'relative' }}>
              <cfg.Icon size={24} color={color} weight={isFocused ? 'fill' : 'regular'} />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color,
                  fontFamily: isFocused
                    ? typography.fontFamily.medium
                    : typography.fontFamily.regular,
                },
              ]}
              numberOfLines={1}
            >
              {cfg.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}


const styles = StyleSheet.create({
  bar: {
    flexDirection:  'row',
    borderTopWidth: 1,
  },
  dot: {
    position:     'absolute',
    top:          0,
    width:        DOT_WIDTH,
    height:       DOT_WIDTH,
    borderRadius: DOT_WIDTH / 2,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     10,
    gap:            2,
  },
  label: {
    fontSize: 11,
  },
})
