import { useSyncExternalStore } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

// Same URL Android's ConnectivityManager uses — returns 204 in milliseconds, never sleeps.
// Do NOT ping the Railway backend here: it has a cold-start delay that triggers false offline.
const CONNECTIVITY_URL = 'https://clients3.google.com/generate_204'
const POLL_MS = 30_000

/**
 * One shared connectivity check for the whole app. Every screen used to run
 * its own copy of this hook — its own 30 s poll and its own request on
 * mount — so the root, Bugun and the offline banner fired three pings at
 * once on every screen change. Now there's one poll while anyone listens,
 * and a mounting screen gets the current answer immediately instead of
 * waiting for a request.
 */
let online = true
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
let appStateSub: { remove: () => void } | undefined
let checking = false

async function check() {
  if (checking) return
  checking = true
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 6000)
  let next = online
  try {
    await fetch(CONNECTIVITY_URL, { method: 'HEAD', signal: ctrl.signal })
    next = true
  } catch {
    next = false
  } finally {
    clearTimeout(t)
    checking = false
  }
  if (next !== online) {
    online = next
    listeners.forEach(l => l())
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    check()
    timer = setInterval(check, POLL_MS)
    appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => { if (s === 'active') check() })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      appStateSub?.remove()
      timer = undefined
      appStateSub = undefined
    }
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => online, () => true)
}
