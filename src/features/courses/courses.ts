/**
 * Kurslar helpers (redesign Phase 7): price and meta copy, the social-proof
 * thresholds, which course to feature, which category chips to show and
 * when the catalogue is big enough for sort tabs and filters.
 */
import type { Category, Course, Lesson } from '../../../lib/api'

/** Ratings show from this many ratings; below it the course reads "Yangi". */
export const MIN_RATINGS = 5
/** Student counts show from this many students. */
export const MIN_STUDENTS = 20
/** Sort tabs and the filter sheet appear only above this many courses. */
export const BROWSE_TOOLS_MIN = 8
/** Continue rows on the Kurslar tab. */
export const CONTINUE_MAX = 3

/** 149000 → "149 000" (no-break spaces, independent of the device locale). */
export function groupDigits(n: number): string {
  return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

export function isFree(c: Pick<Course, 'is_paid' | 'price'>): boolean {
  return !c.is_paid || c.price <= 0
}

export function priceLabel(c: Pick<Course, 'is_paid' | 'price'>): string {
  return isFree(c) ? 'Bepul' : `${groupDigits(c.price)} soʻm`
}

export interface SocialProof {
  /** "4.8", or null under MIN_RATINGS. */
  rating: string | null
  /** True when there are too few ratings to show one. */
  isNew: boolean
  /** "120 oʻquvchi", or null under MIN_STUDENTS. */
  students: string | null
}

export function socialProof(c: Pick<Course, 'rating' | 'ratings_count' | 'enrolled_count'>): SocialProof {
  const count = c.ratings_count ?? 0
  const rated = count >= MIN_RATINGS && (c.rating ?? 0) > 0
  return {
    rating: rated ? (c.rating as number).toFixed(1) : null,
    isNew: !rated,
    students: (c.enrolled_count ?? 0) >= MIN_STUDENTS ? `${groupDigits(c.enrolled_count)} oʻquvchi` : null,
  }
}

export function durationLabel(minutes: number): string | null {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} daqiqa`
  return `${Math.round(minutes / 60)} soat`
}

/** "12 dars · 3 soat · ★ 4.8 · 120 oʻquvchi", or "… · Yangi". */
export function courseMeta(c: Pick<Course, 'total_lessons' | 'total_duration_minutes' | 'rating' | 'ratings_count' | 'enrolled_count'>): string {
  const proof = socialProof(c)
  const parts: string[] = []
  if (c.total_lessons > 0) parts.push(`${c.total_lessons} dars`)
  const dur = durationLabel(c.total_duration_minutes)
  if (dur) parts.push(dur)
  parts.push(proof.rating ? `★ ${proof.rating}` : 'Yangi')
  if (proof.students) parts.push(proof.students)
  return parts.join(' · ')
}

/** The most-enrolled course with a cover that the user isn't enrolled in. */
export function pickFeatured(list: readonly Course[], enrolledIds: ReadonlySet<number>): Course | null {
  let best: Course | null = null
  for (const c of list) {
    if (!c.thumbnail_url || enrolledIds.has(c.id)) continue
    if (!best || c.enrolled_count > best.enrolled_count) best = c
  }
  return best
}

/**
 * Category chips: with the whole catalogue loaded, only categories that
 * have a course; otherwise all of them (a page can't prove a category empty).
 */
export function categoriesWithCourses(categories: readonly Category[], list: readonly Course[], complete: boolean): Category[] {
  if (!complete) return [...categories]
  const used = new Set(list.map(c => c.categories?.slug).filter(Boolean))
  return categories.filter(cat => used.has(cat.slug))
}

export function showBrowseTools(total: number): boolean {
  return total > BROWSE_TOOLS_MIN
}

/** Enrolled, unfinished courses, most progress first. */
export function continueCourses<T extends { progress: number; courses: Course | null }>(enrolled: readonly T[]): T[] {
  return enrolled
    .filter(e => e.courses && e.progress < 1)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, CONTINUE_MAX)
}

export function progressLabel(progress: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return pct > 0 ? `${pct}% tugallandi` : 'Hali boshlanmagan'
}

// Free ("preview") video lessons can be watched before enrolling. The lessons
// list carries no video URLs, so this checks the type only; the URL comes
// from GET /lessons/{id} when the preview starts.
const NON_VIDEO_TYPES = new Set(['material', 'quiz', 'live', 'text', 'reading'])
export function isPreviewable(l: Pick<Lesson, 'is_free' | 'lesson_type'>): boolean {
  return l.is_free && !NON_VIDEO_TYPES.has(l.lesson_type)
}
