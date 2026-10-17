/**
 * Pure helpers for the Bellashuv screen — tested in __tests__/bellashuv.test.ts.
 */
import type { Challenge } from '../../../lib/api'

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
 * The one competition card: your live competition (featured first, then
 * the one ending soonest); otherwise the next to start (joined first, then
 * featured, then soonest). Live ones you haven't joined are rows, not the card.
 */
export function pickMainCompetition(mine: readonly Challenge[], open: readonly Challenge[]): MainCompetition {
  const live = mine.filter(c => isLive(c) && !isFinishedForMe(c))
  if (live.length > 0) {
    const sorted = [...live].sort((a, b) =>
      Number(b.is_featured) - Number(a.is_featured) || Date.parse(a.ends_at) - Date.parse(b.ends_at))
    return { kind: 'live', challenge: sorted[0] }
  }
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

/** One-line result for a finished competition (moved from the old screen). */
export function endedResultText(ch: Challenge, fmtValue: (v: number) => string, unit: string): string {
  if (ch.challenge_type === 'team') return ch.is_winner ? 'Gʻolib guruh! 🏆' : 'Yakunlandi'
  if (ch.challenge_type === 'sprint') {
    if (ch.is_winner) return `Gʻolib · #${ch.final_rank}-oʻrin`
    return ch.final_rank != null ? `#${ch.final_rank}-oʻrin` : 'Yakunlandi'
  }
  if (ch.challenge_type === 'consistency') {
    return ch.completed_at
      ? `Seriya yakunlandi · ${ch.qualifying_days} kun`
      : `${ch.qualifying_days}/${ch.required_days ?? 0} kun`
  }
  return `${fmtValue(ch.progress_value)}/${fmtValue(ch.target_value ?? 0)} ${unit}`
}
