/**
 * Shared timing for the Skia cosmetics (banner scenes, avatar rings).
 * A cosmetic gets one clock: a shared value advanced by a frame callback
 * while it animates. Pausing (off screen, screen not focused) stops the
 * callback in place — the canvas is never rebuilt, so nothing flashes. Worklet helpers turn the clock into loops; with
 * `still` set they return the brightest keyframe, as Reduce Motion asks.
 */
import React, { useEffect } from 'react'
import { useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated'

export type Clock = SharedValue<number>
export const TAU = Math.PI * 2

/** Seconds since the clock started. */
export function secs(clock: Clock) {
  'worklet'
  return clock.value / 1000
}

/** lo ↔ hi ease-in-out loop over `period` s; `hi` when still. */
export function breathe(clock: Clock, period: number, lo: number, hi: number, still: boolean) {
  'worklet'
  if (still) return hi
  return lo + (hi - lo) * (0.5 - 0.5 * Math.cos((secs(clock) / period) * TAU))
}

/** cubic-bezier(x1, y1, x2, y2) at progress t (0–1), Newton's method on x. */
export function bezier(t: number, x1: number, y1: number, x2: number, y2: number) {
  'worklet'
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  let u = t
  for (let i = 0; i < 6; i++) {
    const x = ((ax * u + bx) * u + cx) * u - t
    const dx = (3 * ax * u + 2 * bx) * u + cx
    if (Math.abs(dx) < 1e-6) break
    u -= x / dx
  }
  u = Math.min(1, Math.max(0, u))
  return ((ay * u + by) * u + cy) * u
}

/**
 * A sweep that moves for `move` s then rests until `period` s: 0 → 1 while
 * moving (eased), −1 while resting.
 */
export function sweep(clock: Clock, period: number, move: number, ease: [number, number, number, number]) {
  'worklet'
  const t = secs(clock) % period
  if (t > move) return -1
  return bezier(t / move, ease[0], ease[1], ease[2], ease[3])
}

/** 0–1 progress through a looping particle life, offset by `delay` s. */
export function lifeProgress(clock: Clock, life: number, delay: number) {
  'worklet'
  const t = secs(clock) - delay
  return (((t % life) + life) % life) / life
}

type Render = (clock: Clock, still: boolean) => React.ReactElement

/**
 * Renders `render(clock, still)`. `still` (no animation at all: thumbnails,
 * Reduce Motion) draws the brightest keyframe. `paused` stops the clock
 * where it is without rebuilding anything, for a scene scrolled off screen
 * or on a screen that isn't focused.
 */
export function WithClock({ animated, paused = false, render }: { animated: boolean; paused?: boolean; render: Render }) {
  const reduceMotion = useReducedMotion()
  const still = !animated || reduceMotion
  const clock = useSharedValue(0)
  const last = useSharedValue(-1)
  const frame = useFrameCallback(info => {
    'worklet'
    // Advance by the real time between frames, so a resume continues smoothly.
    const t = info.timestamp
    if (last.value >= 0) clock.value += Math.min(t - last.value, 100)
    last.value = t
  }, false)
  useEffect(() => {
    const run = !still && !paused
    if (!run) last.set(-1)
    frame.setActive(run)
  }, [still, paused, frame, last])
  return render(clock, still)
}
