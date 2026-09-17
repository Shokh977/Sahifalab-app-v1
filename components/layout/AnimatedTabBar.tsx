import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Home, Timer, GraduationCap, Layers, Trophy } from 'lucide-react-native'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../hooks/useTheme'
import { typography } from '../../lib/constants'

const TAB_BAR_HEIGHT = 56
const TICK_WIDTH = 16
const TICK_HEIGHT = 3

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>

// "notifications" and "profile" are intentionally not listed here — both
// stay registered routes (see (tabs)/_layout.tsx) so the bell icon and every
// screen's top-bar avatar (ProfileAvatarButton) can still push to them, but
// neither is a tab button. Profil was removed from the bar in favor of
// Musobaqalar (step-22) — it's reachable from the avatar on every screen.
//
// Icons are lucide (a single consistent stroke set, per the Kurslar design
// spec) — was previously phosphor-react-native, toggling weight="fill" on
// focus, which the same spec calls out as "no filled/outlined mixing".
const TAB_CONFIG: Array<{ name: string; label: string; Icon: LucideIcon }> = [
  { name: 'index',       label: 'Bosh sahifa', Icon: Home },
  { name: 'study',       label: "O'qish",      Icon: Timer },
  { name: 'courses',     label: 'Kurslar',     Icon: GraduationCap },
  { name: 'flashcards',  label: 'Kartalar',    Icon: Layers },
  { name: 'musobaqalar', label: 'Bellashuv',   Icon: Trophy },
]

const TAB_COUNT = TAB_CONFIG.length

export function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  // Main app theme, not premiumTheme — premiumTheme is explicitly scoped to
  // Reyting/Kurslar screens only (see its own doc comment). This bar is
  // global, always-on chrome that sits directly above the system nav bar,
  // whose background is synced to `c.bgPrimary` (see _layout.tsx's SystemUI
  // effect) — using premiumTheme's warmer-tinted colors here instead made
  // the tab bar visibly a different tone from the system bar right below it.
  const { c }       = useTheme()
  const insets      = useSafeAreaInsets()

  const screenWidth = Dimensions.get('window').width
  const tabWidth    = screenWidth / TAB_COUNT

  // Clamp so the sliding tick doesn't try to animate past the visible bar
  // when the active route is the hidden "notifications" screen.
  const clampedIndex = Math.min(state.index, TAB_COUNT - 1)

  const tickX = useRef(
    new Animated.Value(clampedIndex * tabWidth + tabWidth / 2 - TICK_WIDTH / 2)
  ).current

  useEffect(() => {
    Animated.timing(tickX, {
      toValue:         clampedIndex * tabWidth + tabWidth / 2 - TICK_WIDTH / 2,
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
          backgroundColor: c.bgPrimary,
          borderTopColor:  c.border,
        },
      ]}
    >
      {/* Sliding active-tab tick */}
      <Animated.View
        style={[
          styles.tick,
          { backgroundColor: c.accentPrimary, transform: [{ translateX: tickX }] },
        ]}
      />

      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG.find(tab => tab.name === route.name)
        if (!cfg) return null

        const isFocused = state.index === index
        const color     = isFocused ? c.accentPrimary : c.textTertiary

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
            <cfg.Icon size={21} color={color} strokeWidth={1.8} />
            <Text
              style={[
                styles.label,
                { color, fontFamily: typography.fontFamily.bold },
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
  tick: {
    position:     'absolute',
    top:          9,
    width:        TICK_WIDTH,
    height:       TICK_HEIGHT,
    borderRadius: TICK_HEIGHT / 2,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     12,
    gap:            4,
  },
  label: {
    fontSize: 9.5,
  },
})
