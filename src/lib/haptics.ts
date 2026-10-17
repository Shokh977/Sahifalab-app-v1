/**
 * Haptics for the redesign (spec section 5): light on primary buttons,
 * success on goals and correct streaks, error on wrong answers, heavy for
 * the level-up moment, selection for pickers. Nothing on tab switch or
 * scroll — callers decide, this only plays.
 *
 * Always safe to call: a no-op on web, when expo-haptics is unavailable, or
 * when the device call fails. Reduce motion does NOT silence haptics.
 */
import { Platform } from 'react-native'

type HapticsModule = typeof import('expo-haptics')

let mod: HapticsModule | null = null
try {
  mod = Platform.OS === 'web' ? null : (require('expo-haptics') as HapticsModule)
} catch {
  mod = null
}

function run(fn: (h: HapticsModule) => Promise<unknown>): void {
  if (!mod) return
  try {
    fn(mod).catch(() => {})
  } catch {
    // device without a haptic engine, or the native module missing
  }
}

export const haptics = {
  light:     () => run(h => h.impactAsync(h.ImpactFeedbackStyle.Light)),
  heavy:     () => run(h => h.impactAsync(h.ImpactFeedbackStyle.Heavy)),
  selection: () => run(h => h.selectionAsync()),
  success:   () => run(h => h.notificationAsync(h.NotificationFeedbackType.Success)),
  error:     () => run(h => h.notificationAsync(h.NotificationFeedbackType.Error)),
}

export type HapticKind = keyof typeof haptics

/** For tests: whether a native haptics module was found. */
export const hapticsAvailable = () => mod !== null
