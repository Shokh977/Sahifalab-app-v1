import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Same key app/(screens)/course/[id].tsx and app/(screens)/saved.tsx already
// read/write — device-local only, no backend favorites API exists. Keep this
// literal in sync with those two if it ever changes.
const WISHLIST_KEY = 'wishlist_course_ids'

async function readWishlist(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(WISHLIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/** Local, device-only saved-course ids — mirrors the pattern already used by
 * the course detail screen's heart button and the Saved screen's favorites
 * row. Kept as a small hook here rather than a Zustand store since it's read
 * by exactly one new screen; if a third screen needs it, promote it. */
export function useWishlist() {
  const [ids, setIds] = useState<Set<number>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    readWishlist().then(list => { setIds(new Set(list)); setLoaded(true) })
  }, [])

  const toggle = useCallback(async (courseId: number) => {
    const current = await readWishlist()
    const isSaved = current.includes(courseId)
    const next = isSaved ? current.filter(i => i !== courseId) : [...current, courseId]
    await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
    setIds(new Set(next))
    return !isSaved
  }, [])

  return { ids, loaded, toggle }
}
