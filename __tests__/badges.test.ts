import { describe, expect, it } from '@jest/globals'
import type { Badge } from '../lib/api'
import { allBadges, earnedFirst, filterBy, summary, topEarned } from '../src/features/profile/badges'

const b = (key: string, earned: boolean, earned_at: string | null = null): Badge => ({
  key, name: key, description: `${key} desc`, group: 'achievements', tier: null, earned, earned_at,
  challenge_color: null, challenge_cover_url: null, reward_xp: null,
})

const groups = {
  challenges: [b('ch_oct', true, '2026-10-10T00:00:00Z'), b('ch_sep', false)],
  stages: [b('stage_3', true, '2026-09-01T00:00:00Z'), b('stage_4', false)],
  achievements: [b('first_focus', true, '2026-10-15T00:00:00Z'), b('marathon', false)],
}
const titles = [1, 2, 3, 4].map(level => ({ level, title: `T${level}`, description: `d${level}` }))

describe('allBadges', () => {
  it('keeps every API badge and adds titles, none dropped or doubled', () => {
    const all = allBadges(groups, 2, titles)
    expect(all).toHaveLength(6 + 4)
    expect(new Set(all.map(x => x.key)).size).toBe(all.length)
    expect(all.filter(x => x.category === 'unvon').map(x => x.earned)).toEqual([true, true, false, false])
  })

  it('works without API data (titles only)', () => {
    expect(allBadges(null, 1, titles).map(x => x.key)).toEqual(['title:1', 'title:2', 'title:3', 'title:4'])
  })
})

describe('ordering and counts', () => {
  const all = allBadges(groups, 2, titles)

  it('puts earned first, newest first, then locked by category', () => {
    expect(earnedFirst(all).map(x => x.key)).toEqual([
      'achievements:first_focus', 'challenges:ch_oct', 'stages:stage_3', 'title:2', 'title:1',
      'challenges:ch_sep', 'stages:stage_4', 'achievements:marathon', 'title:3', 'title:4',
    ])
  })

  it('summarises, filters and picks the profile preview', () => {
    expect(summary(all)).toEqual({ earned: 5, total: 10, label: '5 / 10' })
    expect(filterBy(all, 'bosqich').map(x => x.key)).toEqual(['stages:stage_3', 'stages:stage_4'])
    expect(filterBy(all, 'all')).toHaveLength(10)
    expect(topEarned(all, 3).map(x => x.key)).toEqual(['achievements:first_focus', 'challenges:ch_oct', 'stages:stage_3'])
  })
})
