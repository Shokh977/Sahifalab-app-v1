import { create } from 'zustand'
import { courses as coursesApi, lessons as lessonsApi, enrollments as enrollmentsApi } from '../lib/api'
import type { Course, Category, EnrollmentCheck } from '../lib/api'

// ── Module-level course list cache (survives tab switches, cleared on app restart) ──
const LIST_CACHE_TTL = 2 * 60 * 1000
const _listCache = new Map<string, { courses: Course[]; total: number; fetchedAt: number }>()

export function getCachedCourseList(key: string): { courses: Course[]; total: number } | null {
  const entry = _listCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > LIST_CACHE_TTL) { _listCache.delete(key); return null }
  return { courses: entry.courses, total: entry.total }
}

export function setCachedCourseList(key: string, courses: Course[], total: number) {
  _listCache.set(key, { courses, total, fetchedAt: Date.now() })
}

interface CourseStore {
  // catalog
  catalog:      Course[]
  catalogTotal: number
  catalogPage:  number
  catalogLoading: boolean
  categories:   Category[]

  // enrollment cache: courseId → check result
  enrollmentCache: Record<number, EnrollmentCheck>

  // progress cache: courseId → Set of completed lesson ids
  progressCache: Record<number, Set<number>>

  loadCatalog:     (reset?: boolean) => Promise<void>
  loadMoreCatalog: () => Promise<void>
  loadCategories:  () => Promise<void>
  checkEnrollment: (courseId: number) => Promise<EnrollmentCheck>
  enroll:          (courseId: number) => Promise<void>
  loadProgress:    (courseId: number) => Promise<Set<number>>
  markComplete:    (courseId: number, lessonId: number) => Promise<{ certificate_issued: boolean }>
}

const PAGE = 20

export const useCourseStore = create<CourseStore>((set, get) => ({
  catalog:         [],
  catalogTotal:    0,
  catalogPage:     0,
  catalogLoading:  false,
  categories:      [],
  enrollmentCache: {},
  progressCache:   {},

  async loadCatalog(reset = true) {
    if (get().catalogLoading) return
    const offset = reset ? 0 : get().catalogPage * PAGE
    set({ catalogLoading: true })
    try {
      const res = await coursesApi.list({ limit: PAGE, offset })
      set(s => ({
        catalog:      reset ? res.courses : [...s.catalog, ...res.courses],
        catalogTotal: res.total,
        catalogPage:  reset ? 1 : s.catalogPage + 1,
      }))
    } catch {}
    finally { set({ catalogLoading: false }) }
  },

  async loadMoreCatalog() {
    const { catalog, catalogTotal, catalogPage, catalogLoading } = get()
    if (catalogLoading || catalog.length >= catalogTotal) return
    await get().loadCatalog(false)
  },

  async loadCategories() {
    if (get().categories.length) return
    try {
      const cats = await coursesApi.getCategories()
      set({ categories: cats })
    } catch {}
  },

  async checkEnrollment(courseId) {
    const cached = get().enrollmentCache[courseId]
    if (cached) return cached
    const result = await enrollmentsApi.check(courseId)
    set(s => ({ enrollmentCache: { ...s.enrollmentCache, [courseId]: result } }))
    return result
  },

  async enroll(courseId) {
    await enrollmentsApi.enroll(courseId)
    set(s => ({
      enrollmentCache: { ...s.enrollmentCache, [courseId]: { enrolled: true, owner: false } },
    }))
  },

  async loadProgress(courseId) {
    const cached = get().progressCache[courseId]
    if (cached) return cached
    const { completed_lesson_ids } = await lessonsApi.getProgress(courseId)
    const s = new Set(completed_lesson_ids)
    set(prev => ({ progressCache: { ...prev.progressCache, [courseId]: s } }))
    return s
  },

  async markComplete(courseId, lessonId) {
    const result = await lessonsApi.complete(lessonId)
    set(prev => {
      const existing = prev.progressCache[courseId] ?? new Set<number>()
      const updated  = new Set(existing)
      updated.add(lessonId)
      return { progressCache: { ...prev.progressCache, [courseId]: updated } }
    })
    return result
  },
}))
