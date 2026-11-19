/**
 * Bottom tab bar — redesign Phase 4a, plus Fokus rejimi.
 * Bugun · Fokus · Kurslar · Kartalar · Bellashuv. A pill behind the active
 * icon moves with springs.nav (no bounce); the active icon and label use
 * accentText. No haptic on tab switch (spec section 5).
 *
 * Fokus rejimi (src/features/focusMode): the tabs the user didn't keep fade
 * and shrink away, and the bar tightens into a floating capsule around the
 * rest (design "A · Kapsula"). One shared value `p` (0 = the normal bar,
 * 1 = the capsule) drives every position, so the morph is one spring. A
 * 1.5 px accent ring on the capsule is the mode's only sign. Reduce Motion:
 * it changes in place.
 *
 * "profile" and "notifications" stay registered routes (see
 * (tabs)/_layout.tsx) so the avatar and the bell can push to them, but
 * they are not tab buttons; the pill index is clamped for them.
 */
import React, { useEffect, useRef, useState } from 'react'
import { BackHandler, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Extrapolation, interpolate, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring,
  type SharedValue,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import { useTheme } from '../../src/design/ThemeProvider'
import { springs } from '../../src/design/motion'
import { iconSize, iconStroke, radius, space, tabBar } from '../../src/design/spacing'
import { type as typeScale } from '../../src/design/typography'
import { useFocusModeStore, type FocusTab } from '../../src/features/focusMode/focusModeStore'
import { TAB_META, capsule } from '../../src/features/focusMode/tabMeta'

const TAB_COUNT = TAB_META.length
const PILL_TOP = space.xs - 2
const RING_WIDTH = 1.5

export function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, scheme, elevation } = useTheme()
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const reduceMotion = useReducedMotion()
  const { on, keep, allowOnce } = useFocusModeStore(useShallow(s => ({ on: s.on, keep: s.keep, allowOnce: s.allowOnce })))
  // The bar's own width (not the window's): correct in split screen too.
  const [barWidth, setBarWidth] = useState(windowWidth)

  // Never flush with the screen edge: the capsule needs air below it.
  const bottomPad = Math.max(insets.bottom, space.xs)
  const tabWidth = barWidth / TAB_COUNT
  const n = keep.length
  const itemW = capsule.itemW(n)
  const capsuleW = capsule.width(n)
  const capsuleX = (barWidth - capsuleW) / 2
  const keptCenter = (k: number) => capsuleX + capsule.pad + k * (itemW + capsule.gap) + itemW / 2

  const activeName = state.routes[state.index]?.name as FocusTab | undefined
  // The active route may be a hidden one (profile, notifications): keep the
  // pill on the last tab it was on rather than sliding past the bar.
  const visibleIndex = TAB_META.findIndex(t => t.name === activeName)
  const lastIndex = useRef(Math.max(0, visibleIndex))
  useEffect(() => { if (visibleIndex >= 0) lastIndex.current = visibleIndex }, [visibleIndex])
  // eslint-disable-next-line react-hooks/refs -- last visible tab, read only when a hidden route is active
  const pillIndex = visibleIndex >= 0 ? visibleIndex : lastIndex.current
  const keptIndex = keep.indexOf(TAB_META[pillIndex].name)

  // ── Fokus rejimi: off a hidden tab (cold start on Bugun, a stray link) ──
  // "Baribir ochish" lets one hidden tab open; the pass ends once you leave it.
  const prevActive = useRef(activeName)
  useEffect(() => {
    const left = prevActive.current === allowOnce && activeName !== allowOnce
    prevActive.current = activeName
    if (allowOnce && left) { useFocusModeStore.getState().setAllowOnce(null); return }
    if (!on || !activeName || !TAB_META.some(t => t.name === activeName)) return
    if (!keep.includes(activeName) && activeName !== allowOnce) navigation.navigate('study')
  }, [on, keep, activeName, allowOnce, navigation])

  // ── Fokus rejimi: Android back ──
  // Tabs go "back" to their first tab, Bugun, which the mode hides: the bar
  // then bounced to Fokus and Bugun flashed in between. While the mode is
  // on, back from a tab goes to Fokus, and back on Fokus leaves the app.
  // Re-registered on every tab change so it runs before react-navigation's
  // own listener (the newest listener is asked first); a screen pushed over
  // the tabs (navigator not focused) is left to react-navigation.
  useEffect(() => {
    if (!on || Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigation.isFocused()) return false
      if (activeName !== 'study') { navigation.navigate('study'); return true }
      BackHandler.exitApp()
      return true
    })
    return () => sub.remove()
  }, [on, activeName, navigation])

  // ── Shared values ──
  const p = useSharedValue(on ? 1 : 0)
  useEffect(() => {
    p.set(reduceMotion ? (on ? 1 : 0) : withSpring(on ? 1 : 0, springs.morph))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, reduceMotion])

  // Pill position, as the normal bar's x and the capsule's x: springs only
  // when the tab changes; a width change just moves it into place.
  const normalX = (i: number) => i * tabWidth + (tabWidth - tabBar.pillWidth) / 2
  const capsuleItemX = (k: number) => keptCenter(Math.max(0, k)) - (itemW - 4) / 2
  const x0 = useSharedValue(normalX(pillIndex))
  const x1 = useSharedValue(capsuleItemX(keptIndex))
  const prevIndex = useRef(pillIndex)
  useEffect(() => {
    const moved = prevIndex.current !== pillIndex
    prevIndex.current = pillIndex
    const spring = moved && !reduceMotion
    x0.set(spring ? withSpring(normalX(pillIndex), springs.nav) : normalX(pillIndex))
    x1.set(spring ? withSpring(capsuleItemX(keptIndex), springs.nav) : capsuleItemX(keptIndex))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillIndex, keptIndex, tabWidth, capsuleX, itemW, reduceMotion])

  // ── Styles ──
  const capsuleBg = scheme === 'light' ? colors.surface : colors.surfaceRaised
  const regionStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [colors.tabBar, colors.bg]),
  }))
  const containerStyle = useAnimatedStyle(() => {
    const k = interpolate(p.get(), [0.25, 1], [0, 1], Extrapolation.CLAMP)
    return {
      left: interpolate(k, [0, 1], [0, capsuleX]),
      width: interpolate(k, [0, 1], [barWidth, capsuleW]),
      height: interpolate(k, [0, 1], [tabBar.height + bottomPad, tabBar.height]),
      borderRadius: interpolate(k, [0, 1], [0, tabBar.height / 2]),
      backgroundColor: interpolateColor(k, [0, 1], [colors.tabBar, capsuleBg]),
    }
  })
  const topLineStyle = useAnimatedStyle(() => ({ opacity: 1 - p.get() }))
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.get(), [0.75, 1], [0, 1], Extrapolation.CLAMP),
  }))
  const activeOnCapsule = keptIndex >= 0
  const pillStyle = useAnimatedStyle(() => {
    const k = interpolate(p.get(), [0.25, 1], [0, 1], Extrapolation.CLAMP)
    return {
      transform: [{ translateX: interpolate(k, [0, 1], [x0.get(), x1.get()]) }],
      top: interpolate(k, [0, 1], [PILL_TOP, capsule.pad]),
      width: interpolate(k, [0, 1], [tabBar.pillWidth, itemW - 4]),
      height: interpolate(k, [0, 1], [tabBar.pillHeight, capsule.itemH]),
      opacity: activeOnCapsule ? 1 : 1 - k,
    }
  })

  return (
    <Animated.View
      accessibilityRole="tablist"
      accessibilityLabel={on ? 'Asosiy menyu · Fokus rejimi yoqilgan' : 'Asosiy menyu'}
      onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
      style={[styles.region, { height: tabBar.height + bottomPad }, regionStyle]}
    >
      <Animated.View style={[styles.container, on && elevation, containerStyle]}>
        <Animated.View style={[styles.topLine, { backgroundColor: colors.border }, topLineStyle]} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.ring, { borderColor: colors.accent + '80', borderRadius: tabBar.height / 2 }, ringStyle]}
        />
      </Animated.View>

      <Animated.View style={[styles.pill, { backgroundColor: colors.accentSoft }, pillStyle]} />

      {state.routes.map((route, index) => {
        const i = TAB_META.findIndex(tab => tab.name === route.name)
        if (i < 0) return null
        const cfg = TAB_META[i]
        const focused = state.index === index
        const color = focused ? colors.accentText : colors.textMuted
        const k = keep.indexOf(cfg.name)
        const hidden = on && k < 0
        return (
          <TabItem
            key={route.key}
            p={p}
            from={{ center: (i + 0.5) * tabWidth, width: tabWidth }}
            to={k >= 0 ? { center: keptCenter(k), width: itemW } : null}
            hidden={hidden}
          >
            <Pressable
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
          </TabItem>
        )
      })}
    </Animated.View>
  )
}

/**
 * One tab button, placed by `p`: from its slot in the five-tab bar to its
 * slot in the capsule (`to`), or, when Fokus rejimi hides it (`to` null),
 * fading and shrinking where it stands.
 */
function TabItem({ p, from, to, hidden, children }: {
  p: SharedValue<number>
  from: { center: number; width: number }
  to: { center: number; width: number } | null
  hidden: boolean
  children: React.ReactNode
}) {
  const style = useAnimatedStyle(() => {
    const k = interpolate(p.get(), [0.25, 1], [0, 1], Extrapolation.CLAMP)
    if (!to) {
      const f = interpolate(p.get(), [0, 0.45], [0, 1], Extrapolation.CLAMP)
      return { left: from.center - from.width / 2, width: from.width, opacity: 1 - f, transform: [{ scale: 1 - 0.2 * f }] }
    }
    const center = interpolate(k, [0, 1], [from.center, to.center])
    const width = interpolate(k, [0, 1], [from.width, to.width])
    return { left: center - width / 2, width, opacity: 1, transform: [{ scale: 1 }] }
  })
  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
      style={[styles.item, style]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  region: { width: '100%' },
  container: { position: 'absolute', top: 0 },
  topLine: { position: 'absolute', left: 0, right: 0, top: 0, height: StyleSheet.hairlineWidth },
  ring: { borderWidth: RING_WIDTH },
  pill: { position: 'absolute', left: 0, borderRadius: radius.full },
  item: { position: 'absolute', top: 0, height: tabBar.height },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: PILL_TOP + space.xxs + 1, gap: space.xxs + 2 },
})
