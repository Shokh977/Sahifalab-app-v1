import { describe, expect, it } from '@jest/globals'
import { isOutsideList, progressFraction, showPinnedRow, statusLine } from '../src/features/bellashuv/challengeDetail'

const now = Date.parse('2026-10-18T12:00:00Z')

describe('statusLine', () => {
  it('describes each status', () => {
    expect(statusLine({ status: 'active', starts_at: '', ends_at: '2026-10-21T13:00:00Z' }, now)).toBe('Tugashiga 3 kun qoldi')
    expect(statusLine({ status: 'upcoming', starts_at: '2026-10-20T13:00:00Z', ends_at: '' }, now)).toBe('Boshlanishiga 2 kun')
    expect(statusLine({ status: 'ended', starts_at: '', ends_at: '' }, now)).toBe('Yakunlandi')
    expect(statusLine({ status: 'cancelled', starts_at: '', ends_at: '' }, now)).toBe('Bekor qilingan')
    expect(statusLine({ status: 'active', starts_at: '', ends_at: '2026-10-18T11:00:00Z' }, now)).toBe('Yakunlandi')
  })
})

describe('progressFraction', () => {
  const base = { target_value: null, progress_value: 0, required_days: null, qualifying_days: 0 }
  it('works for cumulative and consistency, null otherwise', () => {
    expect(progressFraction({ ...base, challenge_type: 'cumulative', target_value: 600, progress_value: 150 })).toBe(0.25)
    expect(progressFraction({ ...base, challenge_type: 'cumulative', target_value: 600, progress_value: 900 })).toBe(1)
    expect(progressFraction({ ...base, challenge_type: 'consistency', required_days: 10, qualifying_days: 4 })).toBe(0.4)
    expect(progressFraction({ ...base, challenge_type: 'sprint' })).toBeNull()
    expect(progressFraction({ ...base, challenge_type: 'team' })).toBeNull()
  })
})

describe('pinned own row', () => {
  const rows = [{ user_id: 1 }, { user_id: 2 }]
  it('knows when you are outside the returned rows', () => {
    expect(isOutsideList(rows, 9, 34)).toBe(true)
    expect(isOutsideList(rows, 2, 2)).toBe(false)
    expect(isOutsideList(rows, 9, null)).toBe(false)
  })
  it('shows only when your real row is not on screen', () => {
    expect(showPinnedRow({ ranked: false, inList: false, rowVisible: false })).toBe(false)
    expect(showPinnedRow({ ranked: true, inList: false, rowVisible: false })).toBe(true)
    expect(showPinnedRow({ ranked: true, inList: true, rowVisible: false })).toBe(true)
    expect(showPinnedRow({ ranked: true, inList: true, rowVisible: true })).toBe(false)
  })
})
