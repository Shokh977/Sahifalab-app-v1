/**
 * Toast — success / error / info with an icon (state is never colour
 * alone). Enters from the top with a fade, leaves the same way, after
 * toast.hold. Mount one <ToastHost /> and call showToast() from anywhere.
 */
import React, { useEffect } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react-native'
import { create } from 'zustand'
import { useTheme } from '../../design/ThemeProvider'
import { durations, easing, toast as toastTiming } from '../../design/motion'
import { iconSize, iconStroke, layout, radius, space } from '../../design/spacing'
import { type as typeScale } from '../../design/typography'
import { haptics } from '../../lib/haptics'

export type ToastKind = 'success' | 'error' | 'info'

interface ToastItem { id: number; kind: ToastKind; message: string }

const useToastStore = create<{ current: ToastItem | null; seq: number }>(() => ({ current: null, seq: 0 }))

export function showToast(kind: ToastKind, message: string) {
  const seq = useToastStore.getState().seq + 1
  useToastStore.setState({ current: { id: seq, kind, message }, seq })
  if (kind === 'success') haptics.success()
  else if (kind === 'error') haptics.error()
}

export function hideToast() {
  useToastStore.setState({ current: null })
}

const ICONS: Record<ToastKind, LucideIcon> = { success: CircleCheck, error: CircleAlert, info: Info }

export function Toast({ kind, message, style }: { kind: ToastKind; message: string; style?: StyleProp<ViewStyle> }) {
  const { colors, elevation } = useTheme()
  const Icon = ICONS[kind]
  const tint = kind === 'success' ? colors.successText : kind === 'error' ? colors.dangerText : colors.text
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, elevation, style]}
    >
      <Icon size={iconSize.sm} color={tint} strokeWidth={iconStroke} />
      <Text style={[typeScale.callout, styles.text, { color: colors.text }]} numberOfLines={2}>{message}</Text>
    </View>
  )
}

const enter = FadeInUp.duration(durations.fade).easing(easing.standard).reduceMotion(ReduceMotion.System)
const exit = FadeOutUp.duration(durations.fade).easing(easing.exit).reduceMotion(ReduceMotion.System)

export function ToastHost() {
  const current = useToastStore(s => s.current)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (!current) return
    const t = setTimeout(hideToast, toastTiming.hold)
    return () => clearTimeout(t)
  }, [current])

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.xs }]}>
      {current && (
        <Animated.View key={current.id} entering={enter} exiting={exit}>
          <Toast kind={current.kind} message={current.message} />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: layout.gutter, right: layout.gutter },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  text: { flex: 1 },
})
