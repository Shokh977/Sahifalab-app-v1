import { useState, useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { API_URL } from '../lib/constants'

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const check = async () => {
    try {
      const ctrl = new AbortController()
      const t    = setTimeout(() => ctrl.abort(), 4000)
      // Any HTTP response (even 404) means the server is reachable.
      // Only a network-level failure or timeout means we're offline.
      const res = await fetch(`${API_URL}/api/connections/`, { method: 'HEAD', signal: ctrl.signal })
      clearTimeout(t)
      setIsOnline(res.status < 500)
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
