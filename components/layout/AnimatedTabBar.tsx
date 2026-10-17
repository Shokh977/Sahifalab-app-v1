/**
 * Bottom tab bar — redesign Phase 4a.
 * Bugun · Fokus · Kurslar · Kartalar · Bellashuv. A pill behind the active
 * icon moves with springs.nav (no bounce); the active icon and label use
 * accentText. No haptic on tab switch (spec section 5).
 *
 * "profile" and "notifications" stay registered routes (see
 * (tabs)/_layout.tsx) so the avatar and the bell can push to them, but
 * they are not tab buttons; the pill index is clamped for them.
 */
import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'
import { GraduationCap, Home, Layers, Timer, Trophy, type LucideIcon } from 'lucide-react-native'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import { useTheme } from '../../src/design/ThemeProvider'
import { springs } from '../../src/design/motion'
import { iconSize, iconStroke, radius, space, tabBar } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'

const TAB_CONFIG: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: 'index',       label: 'Bugun',     Icon: Home },
  { name: 'study',       label: 'Fokus',     Icon: Timer },
  { name: 'courses',     label: 'Kurslar',   Icon: GraduationCap },
  { name: 'flashcards',  label: 'Kartalar',  Icon: Layers },
  { name: 'musobaqalar', label: 'Bellashuv', Icon: Trophy },
]

const TAB_COUNT = TAB_CONFIG.length
const PILL_TOP = space.xs - 2

export function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const reduceMotion = useReducedMotion()
  // The bar's own width (not the window's): correct in split screen too.
  const [barWidth, setBarWidth] = useState(windowWidth)

  const tabWidth = barWidth / TAB_COUNT
  // The active route may be a hidden one (profile, notifications): keep the
  // pill on the last tab it was on rather than sliding past the bar.
  const visibleIndex = TAB_CONFIG.findIndex(t => t.name === state.routes[state.index]?.name)
  const lastIndex = useRef(Math.max(0, visibleIndex))
  useEffect(() => { if (visibleIndex >= 0) lastIndex.current = visibleIndex }, [visibleIndex])
  // eslint-disable-next-line react-hooks/refs -- last visible tab, read only when a hidden route is active
  const pillIndex = visibleIndex >= 0 ? visibleIndex : lastIndex.current

  const pillX = (i: number) => i * tabWidth + (tabWidth - tabBar.pillWidth) / 2
  const x = useSharedValue(pillX(pillIndex))

  useEffect(() => {
    const to = pillX(pillIndex)
    x.set(reduceMotion ? to : withSpring(to, springs.nav))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillIndex, tabWidth, reduceMotion])

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          height: tabBar.height + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
      ]}
    >
      <Animated.View style={[styles.pill, { backgroundColor: colors.accentSoft }, pillStyle]} />

      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG.find(tab => tab.name === route.name)
        if (!cfg) return null
        const focused = state.index === index
        const color = focused ? colors.accentText : colors.textMuted

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={cfg.label}
          >
            <cfg.Icon size={iconSize.sm} color={color} strokeWidth={iconStroke} />
            <Text style={[typeScale.caption, { color }]} numberOfLines={1}>{cfg.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    width: tabBar.pillWidth,
    height: tabBar.pillHeight,
    borderRadius: radius.full,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: PILL_TOP + space.xxs + 1, gap: space.xxs + 2 },
})
