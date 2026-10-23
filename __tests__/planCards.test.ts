import { describe, expect, it } from '@jest/globals'
import { nextTileKey } from '../src/features/today/today'
import { peakDay, planCards, type PlanCardsInput } from '../src/features/today/planCards'
import { planPreviews } from '../src/features/today/planPreviews'

const NOW = Date.parse('2026-10-23T09:00:00Z')
const previews = Object.fromEntries(planPreviews(NOW).map(p => [p.name, p]))
const run = (name: string) => planCards(previews[name].input, previews[name].next)

describe('planCards: anatomy and honesty', () => {
  it('every task card has a label, a numeric metric, a unit, a caption and a meta line — never "—"', () => {
    for (const p of planPreviews(NOW)) {
      const { grid, wide } = planCards(p.input, p.next)
      for (const c of [...grid, ...(wide ? [wide] : [])]) {
        expect(c.label).toBeTruthy()
        expect(c.metric).toMatch(/\d/)
        expect(c.metric).not.toContain('—')
        expect(c.unit).toBeTruthy()
        expect(c.caption).toBeTruthy()
        expect(c.meta).toBeTruthy()
      }
    }
  })

  it('reads the right numbers per type', () => {
    const { grid } = run('5 ta (1 kurs)')
    const by = Object.fromEntries(grid.map(c => [c.type, c]))
    expect(by.focus).toMatchObject({ metric: '12', unit: 'daq', caption: 'Kunlik fokus' })
    expect(by.focus.signal).toEqual({ kind: 'bar', value: 12 / 25 })
    expect(by.cards).toMatchObject({ metric: '48', unit: 'ta' })
    expect(by.cards.signal).toEqual({ kind: 'bar', value: 22 / 70 })
    expect(by.quiz).toMatchObject({ metric: '5', unit: 'savol', caption: '5 Savol #214', status: 'new' })
    expect(by.course).toMatchObject({ metric: '3/10', unit: 'dars' })
    expect(by.course.signal).toEqual({ kind: 'segments', total: 10, filled: 3 })
    expect(by.competition).toMatchObject({ metric: '#7', unit: 'oʻrin', meta: '93 kishi · 5 kun qoldi' })
  })

  it('a tournament without a rank shows its participants, and says why in the meta', () => {
    const c = run('Reyting yoʻq').grid.find(x => x.type === 'competition')!
    expect(c).toMatchObject({ metric: '93', unit: 'kishi' })
    expect(c.meta).toMatch(/^Reyting hali yoʻq/)
  })

  it('a long course falls back to a bar instead of 24 thin segments', () => {
    const c = run('Uzun kurs nomi').grid.find(x => x.type === 'course')!
    expect(c.signal.kind).toBe('bar')
    expect(c.metric).toBe('13/24')
  })

  it('a11y label combines type, metric, caption and status', () => {
    const allDone = run('Hammasi bajarildi')
    const focus = allDone.grid.find(c => c.type === 'focus')!
    expect(focus.a11y).toBe('Fokus, 40 daqiqa, Kunlik fokus, bajarildi')
  })
})

describe('planCards: the one orange card', () => {
  it('exactly one next card while anything is unfinished, sorted first', () => {
    for (const name of ['4 ta vazifa', '5 ta (1 kurs)', 'Reyting yoʻq', 'Uzun kurs nomi']) {
      const { grid } = run(name)
      expect(grid.filter(c => c.next)).toHaveLength(1)
      expect(grid[0].next).toBe(true)
      expect(grid[0].status).toBe('next')
    }
  })

  it('none when every task is done (the tournament is never a task)', () => {
    const { grid, done, total } = run('Hammasi bajarildi')
    expect(grid.some(c => c.next)).toBe(false)
    expect(done).toBe(total)
    expect(grid.find(c => c.type === 'competition')?.done).toBe(false)
  })

  it('falls back to the first unfinished daily task when the preferred one is done', () => {
    const input: PlanCardsInput = { ...previews['4 ta vazifa'].input, focus: { minutes: 30, goal: 25 } }
    expect(planCards(input, 'focus').grid[0].key).toBe('cards')
    expect(planCards(input, nextTileKey('none')).grid[0].key).toBe('cards')
  })

  it('order: next → unfinished → done', () => {
    const input: PlanCardsInput = { ...previews['4 ta vazifa'].input, focus: { minutes: 30, goal: 25 } }
    const keys = planCards(input, 'quiz').grid.map(c => c.key)
    expect(keys[0]).toBe('quiz')
    expect(keys.indexOf('focus')).toBe(keys.length - 1)
  })
})

describe('planCards: Tahlil fills the grid', () => {
  it('full width below an even grid', () => {
    const r = run('4 ta vazifa')
    expect(r.grid).toHaveLength(4)
    expect(r.wide?.key).toBe('review')
  })

  it('half width in the empty cell of an odd grid', () => {
    const r = run('5 ta (1 kurs)')
    expect(r.grid).toHaveLength(6)
    expect(r.grid[5].key).toBe('review')
    expect(r.wide).toBeNull()
  })

  it('adding or removing a course or tournament never leaves a hole', () => {
    const base = previews['5 ta (1 kurs)'].input
    for (const competitions of [[], base.competitions]) {
      for (const courses of [[], base.courses, [...base.courses, { id: 4, title: 'Fizika', progress: 0.1, totalLessons: 8 }]]) {
        const r = planCards({ ...base, competitions, courses }, 'focus')
        expect(r.grid.length % 2).toBe(0)
      }
    }
  })

  it('is never counted, never done, never orange; hidden while its week is unknown', () => {
    const r = run('4 ta vazifa')
    expect(r.wide).toMatchObject({ next: false, done: false, counted: false, metric: '175', unit: 'daq' })
    expect(r.total).toBe(3)
    const unknown = planCards({ ...previews['4 ta vazifa'].input, review: { isNew: false, lastWeek: null } }, 'cards')
    expect(unknown.wide).toBeNull()
    expect(unknown.grid.some(c => c.type === 'review')).toBe(false)
  })

  it('the busiest day is the peak bar', () => {
    expect(peakDay([35, 50, 20, 0, 45, 25, 0])).toBe(1)
    expect(peakDay([0, 0, 0, 0, 0, 0, 0])).toBe(-1)
  })
})
