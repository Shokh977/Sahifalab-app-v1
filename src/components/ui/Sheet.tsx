/**
 * Sheet — bottom sheet with a grabber. Rises with springs.nav (no bounce)
 * over the scrim; drag down to close, handing the fling velocity to the
 * closing spring; a short drag springs back. Interruptible: a drag mid-
 * animation starts from the current position.
 *
 * Not here yet: scaling the screen behind to 0.93 (needs a root-level
 * wrapper; added with the first iOS-style sheet screen).
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable as RNPressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing, sheetDrag, springs } from '../../design/motion'
import { layout, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'

export interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

const GRABBER = { width: 36, height: 5 }

export function Sheet({ visible, onClose, title, children, style }: SheetProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { height: screenH } = useWindowDimensions()
  const reduceMotion = useReducedMotion()
  const [mounted, setMounted] = useState(visible)
  const [sheetH, setSheetH] = useState(0)
  const y = useSharedValue(screenH)          // 0 = open, sheetH = closed
  const start = useSharedValue(0)

  const unmount = useCallback(() => setMounted(false), [])
  const offscreen = sheetH || screenH

  // Open: mount first; the layout pass below measures and springs in.
  if (visible && !mounted) setMounted(true)

  useEffect(() => {
    if (!mounted || !sheetH) return
    if (visible) {
      y.set(reduceMotion ? withTiming(0, { duration: durations.fade, easing: easing.standard }) : withSpring(0, springs.nav))
    } else {
      const done = (finished?: boolean) => { 'worklet'; if (finished) scheduleOnRN(unmount) }
      y.set(reduceMotion
        ? withTiming(sheetH, { duration: durations.fade, easing: easing.exit }, done)
        : withSpring(sheetH, springs.nav, done))
    }
  }, [visible, mounted, sheetH, reduceMotion, y, unmount])

  const pan = Gesture.Pan()
    .onStart(() => { start.set(y.get()) })
    .onUpdate(e => {
      // Down follows the finger; up is resisted.
      const next = start.get() + e.translationY
      y.set(next < 0 ? next / 4 : next)
    })
    .onEnd(e => {
      const closing = y.get() > sheetH * sheetDrag.dismissFraction || e.velocityY > sheetDrag.dismissVelocity
      if (closing) {
        // Start the close with the fling's speed; the parent then sets
        // visible=false and the effect's spring picks up this velocity.
        y.set(withSpring(sheetH, { ...springs.nav, velocity: e.velocityY }))
        scheduleOnRN(onClose)
      } else {
        y.set(withSpring(0, { ...springs.nav, velocity: e.velocityY }))
      }
    })

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }))
  const scrim = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, offscreen], [1, 0], 'clamp'),
  }))

  if (!mounted) return null

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrim]}>
          <RNPressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Yopish" accessibilityRole="button" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            onLayout={e => {
              const h = e.nativeEvent.layout.height
              if (!sheetH) y.set(h)
              setSheetH(h)
            }}
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.md, maxHeight: screenH - insets.top - layout.minTouch },
              panel,
              style,
            ]}
          >
            <View style={styles.grabberArea}>
              <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            </View>
            {title ? <Text numberOfLines={2} style={[typeScale.title2, styles.title, { color: colors.text }]} accessibilityRole="header">{title}</Text> : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: layout.gutter,
  },
  grabberArea: { alignItems: 'center', paddingVertical: space.xs },
  grabber: { ...GRABBER, borderRadius: radius.full },
  title: { marginBottom: space.sm },
})
