/**
 * The course the user opened last (its page or one of its lessons), kept
 * on this device. Bugun shows one course card, and this is the one; before
 * any course has been opened it's the unfinished course furthest along.
 */
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { pickCurrentCourse } from './today'

const KEY = 'sahifalab_last_course_v1'

interface LastCourseState {
  id: number | null
  loaded: boolean
  load: () => Promise<void>
  remember: (id: number) => void
}

export const useLastCourseStore = create<LastCourseState>((set, get) => ({
  id: null,
  loaded: false,
  load: async () => {
    if (get().loaded) return
    try {
      const raw = await AsyncStorage.getItem(KEY)
      const id = raw ? Number(raw) : NaN
      set({ id: Number.isFinite(id) && id > 0 ? id : get().id, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
  remember: id => {
    if (!Number.isFinite(id) || id <= 0 || get().id === id) return
    set({ id })
    AsyncStorage.setItem(KEY, String(id)).catch(() => {})
  },
}))

export const rememberCourse = (id: number) => useLastCourseStore.getState().remember(id)

/**
 * Bugun's one course: the last opened, if it's still unfinished; else the
 * unfinished course with the most progress; null when every course is done.
 */
export function pickPlanCourse<T extends { course_id: number; progress: number }>(enrolled: readonly T[], lastId: number | null): T | null {
  const last = lastId == null ? null : enrolled.find(e => e.course_id === lastId && e.progress < 1)
  return last ?? pickCurrentCourse(enrolled)
}
