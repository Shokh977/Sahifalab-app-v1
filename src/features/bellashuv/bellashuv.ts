/**
 * Pure helpers for the Bellashuv screen — tested in __tests__/bellashuv.test.ts.
 */
import type { Challenge } from '../../../lib/api'
import { groupDigits } from '../courses/courses'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const isLive = (c: Challenge) => c.status === 'active'
const isFinishedForMe = (c: Challenge) =>
  c.status === 'ended' || c.status === 'cancelled' || !!c.completed_at || !!c.is_winner || !!c.failed_at

export type MainCompetition =
  | { kind: 'live'; challenge: Challenge }
  | { kind: 'next'; challenge: Challenge }
  | null

/**
 * The hero (Phase 7.5 D1: "the live competition, or the next one if none is
 * live"): your live competition; else a live one you can still join (it
 * shows "Qoʻshilish"); each featured first, then ending soonest. Otherwise
 * the next to start (joined first, then featured, then soonest).
 */
export function pickMainCompetition(mine: readonly Challenge[], open: readonly Challenge[]): MainCompetition {
  const byFeatured = (list: Challenge[]) => [...list].sort((a, b) =>
    Number(b.is_featured) - Number(a.is_featured) || Date.parse(a.ends_at) - Date.parse(b.ends_at))
  const live = mine.filter(c => isLive(c) && !isFinishedForMe(c))
  if (live.length > 0) return { kind: 'live', challenge: byFeatured(live)[0] }
  const openLive = open.filter(c => isLive(c) && !c.joined)
  if (openLive.length > 0) return { kind: 'live', challenge: byFeatured(openLive)[0] }
  const upcoming = [...mine, ...open].filter(c => c.status === 'upcoming')
  if (upcoming.length === 0) return null
  const sorted = [...upcoming].sort((a, b) =>
    Number(b.joined) - Number(a.joined)
    || Number(b.is_featured) - Number(a.is_featured)
    || Date.parse(a.starts_at) - Date.parse(b.starts_at))
  return { kind: 'next', challenge: sorted[0] }
}

/** Live or upcoming competitions other than the main card, for compact rows. */
export function otherCompetitions(
  mine: readonly Challenge[], open: readonly Challenge[], main: MainCompetition,
): Challenge[] {
  const seen = new Set<string>(main ? [main.challenge.id] : [])
  const out: Challenge[] = []
  for (const c of [...mine, ...open]) {
    if (seen.has(c.id) || isFinishedForMe(c)) continue
    if (c.status !== 'active' && c.status !== 'upcoming') continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}

/** Ended, completed, won or failed — newest first. */
export function endedCompetitions(mine: readonly Challenge[]): Challenge[] {
  return mine.filter(isFinishedForMe).sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))
}

/** "3 kun qoldi" / "5 soat qoldi" / "12 daqiqa qoldi" / "Yakunlandi". */
export function timeLeft(endsAt: string, nowMs: number): string {
  const ms = Date.parse(endsAt) - nowMs
  if (ms <= 0) return 'Yakunlandi'
  if (ms >= DAY) return `${Math.floor(ms / DAY)} kun qoldi`
  if (ms >= HOUR) return `${Math.floor(ms / HOUR)} soat qoldi`
  return `${Math.max(1, Math.ceil(ms / 60_000))} daqiqa qoldi`
}

/** Focus minutes → "3,5 soat" (Uzbek decimal comma, no ",0"). */
export function hoursLabel(minutes: number): string {
  const h = Math.round((Math.max(0, minutes) / 60) * 10) / 10
  const s = Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',')
  return `${s} soat`
}

export type MedalTone = 'medalGold' | 'medalSilver' | 'medalBronze' | null

export function medalTone(rank: number): MedalTone {
  return rank === 1 ? 'medalGold' : rank === 2 ? 'medalSilver' : rank === 3 ? 'medalBronze' : null
}

/** "35 kishi oʻynadi · 2 ta doʻstingiz ham" — null when the backend didn't send counts. */
export function playersLine(players: number | null | undefined, friends: number | null | undefined): string | null {
  if (players == null) return null
  if (players === 0) return 'Hali hech kim oʻynamadi — birinchi boʻling'
  const base = `${players} kishi oʻynadi`
  return friends ? `${base} · ${friends} ta doʻstingiz ham` : base
}

/**
 * The result chip on a finished competition (Phase 7.5 D1): "#3" or
 * "Jamoa 1-oʻrin"; gold for a top-3 finish (or the winning team). null when
 * there's no place to show.
 */
export function endedChip(ch: Challenge): { label: string; gold: boolean } | null {
  if (ch.challenge_type === 'team') {
    if (!ch.team) return null
    const place = ch.is_winner ? 1 : 2
    return { label: `Jamoa ${place}-oʻrin`, gold: place === 1 }
  }
  const rank = ch.final_rank ?? ch.rank
  if (rank == null || rank < 1) return null
  return { label: `#${rank}`, gold: rank <= 3 }
}

/** "Jamoaviy · 99 ishtirokchi" / "80 ishtirokchi". */
export function endedMeta(ch: Challenge): string {
  const n = `${ch.participant_count} ishtirokchi`
  return ch.challenge_type === 'team' ? `Jamoaviy · ${n}` : n
}

/**
 * The weekly card's rows (Phase 7.5 D1): the top 3 go to the podium, #4 and
 * #5 are rows, and your row is pinned below when you're not among them
 * (from the list, or the backend's around_me past the list).
 */
export function rankingRows<T extends { rank: number; is_me?: boolean }>(
  entries: readonly T[], around: readonly T[] | undefined,
): { podium: T[]; rows: T[]; pinned: T | null } {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank)
  const podium = sorted.filter(e => e.rank <= 3).slice(0, 3)
  const rows = sorted.filter(e => e.rank > 3 && e.rank <= 5).slice(0, 2)
  const shown = [...podium, ...rows]
  const me = sorted.find(e => e.is_me) ?? around?.find(e => e.is_me) ?? null
  return { podium, rows, pinned: me && !shown.includes(me) ? me : null }
}

/**
 * The full Reyting screen (Phase 8): the top 3 for the podium, everyone
 * after them as rows, and your row pinned below when you're not in the
 * list (from around_me).
 */
export function boardSections<T extends { rank: number; is_me?: boolean }>(
  entries: readonly T[], around: readonly T[] | undefined,
): { podium: T[]; rest: T[]; pinned: T | null } {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank)
  const me = sorted.find(e => e.is_me) ? null : around?.find(e => e.is_me) ?? null
  return { podium: sorted.filter(e => e.rank <= 3).slice(0, 3), rest: sorted.filter(e => e.rank > 3), pinned: me }
}

/** "#22 gacha 22 XP": the XP to the place above yours, from any rows you have. */
export function chaseNote<T extends { rank: number; score: number }>(me: T, pool: readonly T[]): string | undefined {
  const above = pool.find(e => e.rank === me.rank - 1)
  return above ? `#${above.rank} gacha ${groupDigits(Math.max(1, above.score - me.score))} XP` : undefined
}
