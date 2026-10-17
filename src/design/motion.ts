/**
 * Motion tokens (redesign spec section 5). Reanimated 4.5 supports
 * `withSpring({ duration, dampingRatio })` natively, so the springs are used
 * exactly as specified (no damping/stiffness conversion).
 */
import { Easing } from 'react-native-reanimated'

export const springs = {
  nav: { duration: 500, dampingRatio: 1 },    // push/pop, sheets, tab indicator: no bounce
  ui:  { duration: 350, dampingRatio: 0.85 }, // toggles, chips, press release, cards settling
  pop: { duration: 450, dampingRatio: 0.6 },  // celebrations only
}

/** Control points of the curves below, for animation APIs outside
 *  Reanimated (e.g. react-navigation's tab transition takes RN Easing). */
export const bezier = {
  standard: [0.32, 0.72, 0, 1] as const,
  exit: [0.3, 0, 1, 1] as const,
}

export const easing = {
  standard: Easing.bezier(...bezier.standard),  // iOS-like curve for all timing animations
  exit: Easing.bezier(...bezier.exit),
}

export const durations = { fast: 150, fade: 220, slow: 360, celebrate: 700 }
export const press = { scale: 0.97, opacity: 0.9 }
export const stagger = { step: 30, maxItems: 5 }

/** Skeleton shimmer cycle (the only idle loop besides the running timer). */
export const shimmer = { duration: 1200 }

/** Toast stays this long before it leaves. */
export const toast = { hold: 3000 }

/** Sheet drag: close past this fraction of its height or this fling speed (px/s). */
export const sheetDrag = { dismissFraction: 0.3, dismissVelocity: 800 }

/** Streak tick (section 5 signature moment): flame peak, tree pop delay. */
export const streakTick = { flamePeak: 1.35, treePeak: 1.08, treeDelay: 380 }

/** Wrong answer: ±6 px, twice, in 240 ms (section 5). */
export const shake = { distance: 6, duration: 240 }
