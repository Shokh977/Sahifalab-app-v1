import { describe, expect, it } from '@jest/globals'
import {
  categoriesWithCourses, continueCourses, courseMeta, groupDigits, pickFeatured, priceLabel,
  progressLabel, showBrowseTools, socialProof,
} from '../src/features/courses/courses'
import type { Category, Course } from '../lib/api'

const NB = '\u00A0'

function course(over: Partial<Course> = {}): Course {
  return {
    id: 1, teacher_id: 9, category_id: null, title: 'Kurs', slug: 'kurs', description: null,
    thumbnail_url: 'https://x/1.jpg', price: 149000, is_paid: true, is_published: true,
    level: 'beginner', language: 'uz', total_lessons: 12, total_duration_minutes: 180,
    enrolled_count: 0, rating: null, ratings_count: 0, created_at: '2026-01-01', categories: null,
    ...over,
  }
}

describe('price', () => {
  it('groups digits without the device locale', () => {
    expect(groupDigits(149000)).toBe(`149${NB}000`)
    expect(groupDigits(1250000)).toBe(`1${NB}250${NB}000`)
    expect(groupDigits(900)).toBe('900')
  })
  it('labels free courses Bepul', () => {
    expect(priceLabel(course())).toBe(`149${NB}000 soʻm`)
    expect(priceLabel(course({ is_paid: false }))).toBe('Bepul')
    expect(priceLabel(course({ price: 0 }))).toBe('Bepul')
  })
})

describe('socialProof', () => {
  it('hides ratings under 5 and calls the course new', () => {
    expect(socialProof(course({ rating: 5, ratings_count: 4 }))).toEqual({ rating: null, isNew: true, students: null })
    expect(socialProof(course({ rating: 4.76, ratings_count: 5 })).rating).toBe('4.8')
  })
  it('hides student counts under 20', () => {
    expect(socialProof(course({ enrolled_count: 19 })).students).toBeNull()
    expect(socialProof(course({ enrolled_count: 1200 })).students).toBe(`1${NB}200 oʻquvchi`)
  })
  it('treats a missing ratings_count as none', () => {
    expect(socialProof(course({ rating: 4.9, ratings_count: undefined })).isNew).toBe(true)
  })
})

describe('courseMeta', () => {
  it('joins lessons, duration and proof', () => {
    expect(courseMeta(course({ rating: 4.8, ratings_count: 10, enrolled_count: 120 })))
      .toBe('12 dars · 3 soat · ★ 4.8 · 120 oʻquvchi')
    expect(courseMeta(course({ total_duration_minutes: 45 }))).toBe('12 dars · 45 daqiqa · Yangi')
    expect(courseMeta(course({ total_lessons: 0, total_duration_minutes: 0 }))).toBe('Yangi')
  })
})

describe('pickFeatured', () => {
  it('takes the most enrolled course with a cover the user does not own', () => {
    const list = [
      course({ id: 1, enrolled_count: 50 }),
      course({ id: 2, enrolled_count: 90 }),
      course({ id: 3, enrolled_count: 200, thumbnail_url: null }),
    ]
    expect(pickFeatured(list, new Set())?.id).toBe(2)
    expect(pickFeatured(list, new Set([2]))?.id).toBe(1)
    expect(pickFeatured([course({ thumbnail_url: null })], new Set())).toBeNull()
  })
})

describe('categoriesWithCourses', () => {
  const cats: Category[] = [
    { id: 1, name: 'IT', slug: 'it', icon: null, sort_order: 1 },
    { id: 2, name: 'Til', slug: 'til', icon: null, sort_order: 2 },
  ]
  it('keeps only used categories when the list is complete', () => {
    const list = [course({ categories: { name: 'IT', slug: 'it', icon: null } })]
    expect(categoriesWithCourses(cats, list, true).map(c => c.slug)).toEqual(['it'])
    expect(categoriesWithCourses(cats, list, false)).toHaveLength(2)
  })
})

describe('browse tools and continue', () => {
  it('shows sort tabs and filters only above 8 courses', () => {
    expect(showBrowseTools(8)).toBe(false)
    expect(showBrowseTools(9)).toBe(true)
  })
  it('lists unfinished enrolled courses, most progress first, at most 3', () => {
    const e = (id: number, progress: number) => ({ course_id: id, progress, courses: course({ id }) })
    const out = continueCourses([e(1, 0.2), e(2, 1), e(3, 0.7), e(4, 0), e(5, 0.5), { course_id: 6, progress: 0.9, courses: null }])
    expect(out.map(x => x.course_id)).toEqual([3, 5, 1])
  })
  it('labels progress', () => {
    expect(progressLabel(0)).toBe('Hali boshlanmagan')
    expect(progressLabel(0.456)).toBe('46% tugallandi')
  })
})
