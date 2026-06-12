import { useState, useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'

// Same URL Android's ConnectivityManager uses — returns 204 in milliseconds, never sleeps.
// Do NOT ping the Railway backend here: it has a cold-start delay that triggers false offline.
const CONNECTIVITY_URL = 'https://clients3.google.com/generate_204'

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const check = async () => {
    try {
      const ctrl = new AbortController()
      const t    = setTimeout(() => ctrl.abort(), 6000)
      await fetch(CONNECTIVITY_URL, { method: 'HEAD', signal: ctrl.signal })
      clearTimeout(t)
      setIsOnline(true)
    } catch {
      setIsOnline(false)
    }
  }

  useEffect(() => {
    check()

    // Poll every 30 s
    intervalRef.current = setInterval(check, 30_000)

    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') check()
    })

    return () => {
      clearInterval(intervalRef.current)
      sub.remove()
    }
  }, [])

  return isOnline
}
