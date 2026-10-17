import { describe, expect, it } from '@jest/globals'
import type { Challenge } from '../lib/api'
import {
  endedCompetitions, hoursLabel, medalTone, otherCompetitions, pickMainCompetition, playersLine, timeLeft,
} from '../src/features/bellashuv/bellashuv'

const ch = (over: Partial<Challenge>): Challenge => ({
  id: 'x', slug: 'x', title: 'X', status: 'active', joined: true, is_featured: false,
  starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-30T00:00:00Z',
  completed_at: null, is_winner: false, failed_at: null,
  ...over,
} as unknown as Challenge)

describe('pickMainCompetition', () => {
  it('prefers my live competition, featured then ending soonest', () => {
    const a = ch({ id: 'a', ends_at: '2026-10-25T00:00:00Z' })
    const b = ch({ id: 'b', ends_at: '2026-10-20T00:00:00Z' })
    const f = ch({ id: 'f', is_featured: true, ends_at: '2026-11-20T00:00:00Z' })
    expect(pickMainCompetition([a, b], [])).toEqual({ kind: 'live', challenge: b })
    expect(pickMainCompetition([a, b, f], [])).toEqual({ kind: 'live', challenge: f })
  })

  it('skips finished ones and falls back to the next upcoming', () => {
    const done = ch({ id: 'd', completed_at: '2026-10-10T00:00:00Z' })
    const soon = ch({ id: 's', status: 'upcoming', joined: false, starts_at: '2026-10-20T00:00:00Z' })
    const later = ch({ id: 'l', status: 'upcoming', joined: true, starts_at: '2026-11-01T00:00:00Z' })
    expect(pickMainCompetition([done], [soon])).toEqual({ kind: 'next', challenge: soon })
    expect(pickMainCompetition([done, later], [soon])).toEqual({ kind: 'next', challenge: later })   // joined first
    expect(pickMainCompetition([done], [])).toBeNull()
  })
})

describe('competition lists', () => {
  it('lists the rest as rows and the finished ones newest first', () => {
    const main = ch({ id: 'm' })
    const openLive = ch({ id: 'o', joined: false })
    const up = ch({ id: 'u', status: 'upcoming' })
    const old = ch({ id: 'e1', status: 'ended', ends_at: '2026-09-01T00:00:00Z' })
    const newer = ch({ id: 'e2', status: 'ended', ends_at: '2026-10-01T00:00:00Z' })
    const picked = pickMainCompetition([main, old, newer], [openLive, up])
    expect(otherCompetitions([main, old, newer], [openLive, up], picked).map(c => c.id)).toEqual(['o', 'u'])
    expect(endedCompetitions([main, old, newer]).map(c => c.id)).toEqual(['e2', 'e1'])
  })
})

describe('labels', () => {
  const now = Date.parse('2026-10-17T12:00:00Z')
  it('timeLeft', () => {
    expect(timeLeft('2026-10-20T13:00:00Z', now)).toBe('3 kun qoldi')
    expect(timeLeft('2026-10-17T17:30:00Z', now)).toBe('5 soat qoldi')
    expect(timeLeft('2026-10-17T12:11:10Z', now)).toBe('12 daqiqa qoldi')
    expect(timeLeft('2026-10-17T11:00:00Z', now)).toBe('Yakunlandi')
  })
  it('hoursLabel', () => {
    expect(hoursLabel(180)).toBe('3 soat')
    expect(hoursLabel(210)).toBe('3,5 soat')
    expect(hoursLabel(0)).toBe('0 soat')
  })
  it('medalTone', () => {
    expect([1, 2, 3, 4].map(medalTone)).toEqual(['medalGold', 'medalSilver', 'medalBronze', null])
  })
  it('playersLine', () => {
    expect(playersLine(35, 2)).toBe('35 kishi oʻynadi · 2 ta doʻstingiz ham')
    expect(playersLine(35, 0)).toBe('35 kishi oʻynadi')
    expect(playersLine(0, 0)).toBe('Hali hech kim oʻynamadi — birinchi boʻling')
    expect(playersLine(undefined, undefined)).toBeNull()
  })
})
