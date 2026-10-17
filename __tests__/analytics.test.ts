import { describe, expect, it } from '@jest/globals'
import { buildBatches, buildEvent, enqueue, MAX_PER_REQUEST, type QueuedEvent } from '../lib/analytics'

describe('buildEvent', () => {
  it('stamps surface and client time, and keeps defined props', () => {
    const ev = buildEvent('course_view', { courseId: 12, source: undefined, ok: true }, 12, 1_700_000_000_000)
    expect(ev).toEqual({
      event_type: 'course_view',
      target_id:  12,
      meta:       { surface: 'app', client_ts: 1_700_000_000_000, courseId: 12, ok: true },
    })
  })

  it('defaults target_id to 0 and coerces bad ids', () => {
    expect(buildEvent('app_open').target_id).toBe(0)
    expect(buildEvent('app_open', {}, NaN).target_id).toBe(0)
    expect(buildEvent('app_open', {}, 7.9).target_id).toBe(7)
  })
})

describe('buildBatches', () => {
  const make = (n: number): QueuedEvent[] =>
    Array.from({ length: n }, (_, i) => buildEvent('quiz_answer', { index: i }, 0, i))

  it('returns no batches for an empty queue', () => {
    expect(buildBatches([])).toEqual([])
  })

  it('splits at the backend cap and keeps order', () => {
    const batches = buildBatches(make(MAX_PER_REQUEST * 2 + 3))
    expect(batches.map(b => b.length)).toEqual([MAX_PER_REQUEST, MAX_PER_REQUEST, 3])
    expect(batches[1][0].meta.index).toBe(MAX_PER_REQUEST)
  })
})

describe('enqueue', () => {
  it('drops the oldest events past the cap', () => {
    let q: QueuedEvent[] = []
    for (let i = 0; i < 5; i++) q = enqueue(q, buildEvent('app_open', { i }), 3)
    expect(q.map(e => e.meta.i)).toEqual([2, 3, 4])
  })
})
