/**
 * Pure helpers for the competition detail screen — tested in
 * __tests__/challengeDetail.test.ts.
 */
import type { Challenge, ChallengeLeaderboardEntry } from '../../../lib/api'
import { timeLeft } from './bellashuv'

/** "Tugashiga 3 kun qoldi" / "Boshlanishiga 2 kun" / "Yakunlandi" / "Bekor qilingan". */
export function statusLine(c: Pick<Challenge, 'status' | 'starts_at' | 'ends_at'>, nowMs: number): string {
  if (c.status === 'cancelled') return 'Bekor qilingan'
  if (c.status === 'ended') return 'Yakunlandi'
  if (c.status === 'upcoming') return `Boshlanishiga ${timeLeft(c.starts_at, nowMs).replace(' qoldi', '')}`
  const left = timeLeft(c.ends_at, nowMs)
  return left === 'Yakunlandi' ? left : `Tugashiga ${left}`
}

/** 0–1 progress toward the goal, or null when the type has no fixed goal. */
export function progressFraction(c: Pick<Challenge, 'challenge_type' | 'target_value' | 'progress_value' | 'required_days' | 'qualifying_days'>): number | null {
  if (c.challenge_type === 'consistency') {
    return c.required_days ? Math.min(1, c.qualifying_days / c.required_days) : null
  }
  if (c.challenge_type === 'cumulative' && c.target_value) {
    return Math.min(1, Math.max(0, c.progress_value / c.target_value))
  }
  return null
}

/** Ranked, but not among the rows the API returned (top 20). */
export function isOutsideList(
  rows: readonly Pick<ChallengeLeaderboardEntry, 'user_id'>[], myId: number | null | undefined, myRank: number | null | undefined,
): boolean {
  if (myId == null || myRank == null) return false
  return !rows.some(r => r.user_id === myId)
}

/**
 * The pinned own row shows when you're ranked and your real row isn't on
 * screen: either it isn't in the list at all, or it has scrolled away.
 */
export function showPinnedRow(opts: {
  ranked: boolean
  inList: boolean
  rowVisible: boolean
}): boolean {
  if (!opts.ranked) return false
  if (!opts.inList) return true
  return !opts.rowVisible
}

const FALLBACK_BAND = '#F5A623'

/** The admin's colour (#RRGGBB / #RGB) or the default orange. Pure. */
export function bandColor(hex: string | null | undefined): string {
  const h = (hex ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(h)) return h.toUpperCase()
  if (/^#[0-9a-f]{3}$/i.test(h)) return `#${h.slice(1).split('').map(ch => ch + ch).join('')}`.toUpperCase()
  return FALLBACK_BAND
}

/** White or near-black text, whichever reads better on the band colour
 *  (WCAG relative luminance, crossover at L ≈ 0.4 — white text on a light
 *  yellow band was unreadable). Pure. */
export function textOnBand(hex: string): { text: string; muted: string; chip: string } {
  const c = bandColor(hex)
  const ch = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  return L > 0.4
    ? { text: '#1A1612', muted: 'rgba(26,22,18,0.72)', chip: 'rgba(0,0,0,0.12)' }
    : { text: '#FFFFFF', muted: 'rgba(255,255,255,0.82)', chip: 'rgba(0,0,0,0.22)' }
}
