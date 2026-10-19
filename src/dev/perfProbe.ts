/**
 * Preview builds only (APP_VARIANT=preview): the JS-thread frame counter
 * behind the Phase 8 release measurements. A release APK has no Perf
 * Monitor, so this counts the same thing its "JS" line shows — frames the
 * JS thread missed at 60 fps — and logs one line per second to logcat
 * (tag ReactNativeJS): "PERF js t=<ms> frames=<n> dropped=<n>".
 */
const FRAME_MS = 1000 / 60
const WINDOW_MS = 1000

// Lazy, like app/_layout.tsx: expo-constants' init must not throw in Expo Go.
let appVariant: unknown
try { appVariant = require('expo-constants').default?.expoConfig?.extra?.appVariant } catch {}

export const isPreviewBuild = appVariant === 'preview'

let started = false

export function startPerfProbe(): void {
  if (!isPreviewBuild || started) return
  started = true
  let last = Date.now()
  let windowStart = last
  let frames = 0
  let dropped = 0
  const tick = () => {
    const now = Date.now()
    frames += 1
    dropped += Math.max(0, Math.round((now - last) / FRAME_MS) - 1)
    last = now
    if (now - windowStart >= WINDOW_MS) {
      console.log(`PERF js t=${now} frames=${frames} dropped=${dropped}`)
      windowStart = now
      frames = 0
      dropped = 0
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
