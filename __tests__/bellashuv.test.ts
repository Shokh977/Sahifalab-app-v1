import { describe, expect, it } from '@jest/globals'
import type { Challenge } from '../lib/api'
import {
  boardItems, runningCompetition, boardSections, chaseNote, myEntry, endedChip, endedCompetitions, endedMeta, hoursLabel, medalTone, otherCompetitions, pickMainCompetition, playersLine, rankingRows, timeLeft,
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

  it('shows a live competition you can still join before the next one', () => {
    const openLive = ch({ id: 'o', joined: false })
    const soon = ch({ id: 's', status: 'upcoming', joined: false, starts_at: '2026-10-20T00:00:00Z' })
    expect(pickMainCompetition([], [openLive, soon])).toEqual({ kind: 'live', challenge: openLive })
    const mineLive = ch({ id: 'm' })
    expect(pickMainCompetition([mineLive], [openLive])).toEqual({ kind: 'live', challenge: mineLive })
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

describe('endedChip / endedMeta', () => {
  it('shows the place, gold for a top-3 finish', () => {
    expect(endedChip(ch({ challenge_type: 'sprint', final_rank: 3 } as any))).toEqual({ label: '#3', gold: true })
    expect(endedChip(ch({ challenge_type: 'sprint', final_rank: 8 } as any))).toEqual({ label: '#8', gold: false })
    expect(endedChip(ch({ challenge_type: 'sprint', final_rank: null, rank: 5 } as any))).toEqual({ label: '#5', gold: false })
    expect(endedChip(ch({ challenge_type: 'sprint', final_rank: null, rank: null } as any))).toBeNull()
  })
  it('shows the team place', () => {
    expect(endedChip(ch({ challenge_type: 'team', team: 'A', is_winner: true } as any))).toEqual({ label: 'Jamoa 1-oʻrin', gold: true })
    expect(endedChip(ch({ challenge_type: 'team', team: 'B', is_winner: false } as any))).toEqual({ label: 'Jamoa 2-oʻrin', gold: false })
    expect(endedChip(ch({ challenge_type: 'team', team: null } as any))).toBeNull()
  })
  it('describes the field', () => {
    expect(endedMeta(ch({ challenge_type: 'team', participant_count: 99 } as any))).toBe('Jamoaviy · 99 ishtirokchi')
    expect(endedMeta(ch({ challenge_type: 'sprint', participant_count: 80 } as any))).toBe('80 ishtirokchi')
  })
})

describe('rankingRows', () => {
  const e = (rank: number, me = false) => ({ rank, is_me: me })
  it('splits the podium, #4-#5 and pins you below', () => {
    const r = rankingRows([1, 2, 3, 4, 5, 6, 7].map(n => e(n, n === 7)), [])
    expect(r.podium.map(x => x.rank)).toEqual([1, 2, 3])
    expect(r.rows.map(x => x.rank)).toEqual([4, 5])
    expect(r.pinned?.rank).toBe(7)
  })
  it('does not pin you when you are already shown', () => {
    expect(rankingRows([1, 2, 3, 4, 5].map(n => e(n, n === 4)), []).pinned).toBeNull()
    expect(rankingRows([1, 2, 3].map(n => e(n, n === 1)), []).pinned).toBeNull()
  })
  it('pins you from around_me when you are past the list', () => {
    expect(rankingRows([1, 2, 3, 4, 5].map(n => e(n)), [e(102), e(103, true), e(104)]).pinned?.rank).toBe(103)
    expect(rankingRows([1, 2].map(n => e(n)), undefined).pinned).toBeNull()
  })
})

describe('boardSections (full Reyting screen)', () => {
  const row = (rank: number, me = false) => ({ rank, score: 1000 - rank * 10, is_me: me })
  it('splits the podium from the rest and keeps everyone after #3', () => {
    const s = boardSections([row(5), row(1), row(4), row(2), row(3), row(6)], undefined)
    expect(s.podium.map(e => e.rank)).toEqual([1, 2, 3])
    expect(s.rest.map(e => e.rank)).toEqual([4, 5, 6])
    expect(s.pinned).toBeNull()
  })
  it('pins your row from around_me only when you are not in the list', () => {
    const around = [row(22), row(23, true), row(24)]
    expect(boardSections([row(1), row(2)], around).pinned?.rank).toBe(23)
    expect(boardSections([row(1), row(2, true)], around).pinned).toBeNull()
  })
})

describe('chaseNote', () => {
  it('names the place above and the XP gap', () => {
    expect(chaseNote({ rank: 23, score: 467 }, [{ rank: 22, score: 489 }])).toBe('#22 gacha 22 XP')
  })
  it('is at least 1 XP and empty without the row above', () => {
    expect(chaseNote({ rank: 5, score: 100 }, [{ rank: 4, score: 100 }])).toBe('#4 gacha 1 XP')
    expect(chaseNote({ rank: 5, score: 100 }, [])).toBeUndefined()
  })
})

describe('boardItems (Reyting list under the podium)', () => {
  const row = (rank: number, me = false) => ({ rank, telegram_id: rank, score: 5000 - rank * 10, is_me: me })
  const top = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1))
  const ranks = (items: ReturnType<typeof boardItems<ReturnType<typeof row>>>) =>
    items.map(i => (i.kind === 'gap' ? '···' : i.e.rank))

  it('shows everyone after the podium, the whole top 100', () => {
    expect(ranks(boardItems(top(14), undefined))).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    const list = top(100); list[59] = row(60, true)
    expect(ranks(boardItems(list, undefined))).toHaveLength(97)
  })
  it('you outside the list: ···, then your neighbours from around_me', () => {
    expect(ranks(boardItems(top(20), [row(55), row(56, true), row(57)])))
      .toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, '···', 55, 56, 57])
  })
  it('no ··· when you are right after the list', () => {
    expect(ranks(boardItems(top(20), [row(20), row(21, true), row(22)])))
      .toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22])
  })
  it('myEntry finds you in the list or around_me', () => {
    expect(myEntry([row(1)], [row(9, true)])?.rank).toBe(9)
    expect(myEntry([row(1)], undefined)).toBeNull()
  })
})

describe('runningCompetition (Bugun tile)', () => {
  const c = (over: Partial<Challenge>): Challenge => ({ id: 'x', status: 'active', joined: true, completed_at: null, is_winner: false, failed_at: null, is_featured: false, ends_at: '2026-11-01T00:00:00Z', ...over } as Challenge)
  it('picks a running one you joined, featured first, then ending soonest', () => {
    const a = c({ id: 'a', ends_at: '2026-11-05T00:00:00Z' })
    const b = c({ id: 'b', ends_at: '2026-11-02T00:00:00Z' })
    const f = c({ id: 'f', is_featured: true, ends_at: '2026-11-09T00:00:00Z' })
    expect(runningCompetition([a, b])?.id).toBe('b')
    expect(runningCompetition([a, b, f])?.id).toBe('f')
  })
  it('skips upcoming, ended and finished-for-you ones', () => {
    expect(runningCompetition([c({ status: 'upcoming' }), c({ status: 'ended' }), c({ completed_at: '2026-10-10' })])).toBeNull()
  })
})
