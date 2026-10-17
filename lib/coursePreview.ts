/**
 * Course rows already fetched by list screens, kept so course detail can
 * paint its header (cover, title, teacher) before its own requests return.
 * Filled from lib/api.ts (courses.list, courses.get, enrollments.mine).
 * Rows may be partial; read them for display only.
 */
import type { Course } from './api'

const MAX = 300
const cache = new Map<number, Course>()

export function rememberCourses(rows: readonly (Course | null | undefined)[]): void {
  for (const row of rows) {
    if (!row || typeof row.id !== 'number') continue
    cache.delete(row.id)               // re-insert so the newest stays longest
    cache.set(row.id, row)
  }
  while (cache.size > MAX) cache.delete(cache.keys().next().value as number)
}

export function getCoursePreview(id: number): Course | null {
  return cache.get(id) ?? null
}

export function clearCoursePreviews(): void {
  cache.clear()
}
