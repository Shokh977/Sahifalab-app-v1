/**
 * "Bugungi reja" card model (plan redesign). Every task card has the same
 * anatomy — type label + icon, ONE metric (number + unit), a one-line
 * caption, a signal (bar / segments / week bars) and a meta line — so a
 * user reads the grid by position instead of reading every card. Pure; the
 * component (TodayPlan) only draws it. Tested in planCards.test.ts.
 *
 * Rules:
 *  - Built from data: Kartalar, Fokus, Savol (daily), the running
 *    competition(s) (Bellashuv), one card per enrolled course (Kurs). Any
 *    may be absent.
 *  - Exactly one "next" card (solid orange) while an unfinished task
 *    exists: the primary action's task if it's still unfinished, else the
 *    first unfinished daily task, else the first unfinished course. None
 *    when everything is done. Competitions are never next and never done.
 *  - Order: next → not done → done; within a group, build order.
 *  - Never a "—" metric: a value we don't have moves to the meta line and a
 *    number we do have takes its place; a card with no number is hidden.
 *  - Tahlil (weekly review) is not a task: full width below an even grid,
 *    or the half-width filler of an odd one, so the grid has no hole.
 */
import type { PlanType } from '../../design/tokens'
import { focusLabel } from './focusLabel'
import { quizClosesIn, uzText, type PlanKey } from './today'

export interface PlanCourseInput { id: number; title: string; progress: number; totalLessons: number }
export interface PlanCompetitionInput {
  id: string
  slug: string
  title: string
  rank: number | null
  participants: number
  startsAt: string
  endsAt: string
  /** false = a live one you can still join ("Qoʻshiling"). */
  joined: boolean
}

export interface PlanCardsInput {
  focus: { minutes: number; goal: number }
  quiz: {
    number: number
    state: 'not_started' | 'in_progress' | 'submitted'
    correct: number | null
    secondsLeft: number
    answered?: number
    rank?: number | null
  } | null
  /** Today's review queue; null = no decks, so no card. `reviewed` = studied today. */
  cards: { due: number; reviewed: number; estMinutes: number } | null
  courses: PlanCourseInput[]
  competitions: PlanCompetitionInput[]
  /** Last week's focus minutes, Monday → Sunday; null while unknown (card hidden). */
  review: { isNew: boolean; lastWeek: number[] | null } | null
  nowMs: number
}

export type PlanSignal =
  | { kind: 'bar'; value: number }
  | { kind: 'segments'; total: number; filled: number }
  | { kind: 'week'; minutes: number[] }

export type PlanStatus = 'done' | 'new' | 'next' | null

export interface PlanCard {
  /** Unique: 'cards' | 'focus' | 'quiz' | 'course:3' | 'competition:<id>' | 'review'. */
  key: string
  type: PlanType
  /** Shown uppercase. */
  label: string
  metric: string
  unit: string
  caption: string
  meta: string
  signal: PlanSignal
  status: PlanStatus
  done: boolean
  next: boolean
  /** Counted in "2 / 3" (daily tasks and courses). */
  counted: boolean
  /** Screen-reader label: type, metric, caption, status. */
  a11y: string
  /** Navigation target id (course id / competition slug). */
  ref?: string | number
}

export interface PlanLayout {
  /** Grid cards in display order (Tahlil included as the filler of an odd grid). */
  grid: PlanCard[]
  /** Tahlil below the grid at full width (even grid), or null. */
  wide: PlanCard | null
  done: number
  total: number
}

const DAY_MS = 86_400_000
export const WEEKDAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const
/** Above this many lessons, segments get too thin — the course shows a bar. */
export const MAX_SEGMENTS = 12

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

function leftLabel(endIso: string, nowMs: number): string {
  const ms = Date.parse(endIso) - nowMs
  if (!(ms > 0)) return 'Yakunlanmoqda'
  if (ms >= DAY_MS) return `${Math.floor(ms / DAY_MS)} kun qoldi`
  if (ms >= 3_600_000) return `${Math.floor(ms / 3_600_000)} soat qoldi`
  return `${Math.max(1, Math.ceil(ms / 60_000))} daqiqa qoldi`
}

function statusWord(s: PlanStatus): string | null {
  return s === 'done' ? 'bajarildi' : s === 'new' ? 'yangi' : s === 'next' ? 'keyingi' : null
}

function a11yOf(c: Omit<PlanCard, 'a11y'>, spokenMetric: string): string {
  return [c.label, spokenMetric, c.caption, statusWord(c.status)].filter(Boolean).join(', ')
}

type Draft = Omit<PlanCard, 'a11y' | 'next' | 'status'> & { status: PlanStatus; spoken: string }

function finish(d: Draft, next: boolean): PlanCard {
  const status: PlanStatus = next ? 'next' : d.done ? 'done' : d.status
  const { spoken, ...rest } = d
  const card = { ...rest, next, status }
  return { ...card, a11y: a11yOf(card, spoken) }
}

function cardsCard(c: NonNullable<PlanCardsInput['cards']>): Draft {
  const due = Math.max(0, Math.round(c.due))
  const reviewed = Math.max(0, Math.round(c.reviewed))
  const done = due === 0
  const shown = done ? reviewed : due
  return {
    key: 'cards', type: 'cards', label: 'Kartalar',
    metric: String(shown), unit: 'ta',
    caption: done ? 'Kartalar takrorlandi' : 'Takrorlash kerak',
    meta: done ? (reviewed > 0 ? 'Bugungi navbat tugadi' : 'Bugun takrorlash yoʻq') : `~${c.estMinutes} daqiqa`,
    signal: { kind: 'bar', value: done ? (reviewed > 0 ? 1 : 0) : clamp01(reviewed / (reviewed + due)) },
    status: null, done, counted: true,
    spoken: `${shown} ta karta`,
  }
}

function focusCard(f: PlanCardsInput['focus']): Draft {
  const label = focusLabel(f.minutes, f.goal)
  const minutes = Math.max(0, Math.floor(f.minutes))
  const goal = f.goal > 0 ? f.goal : 20
  return {
    key: 'focus', type: 'focus', label: 'Fokus',
    metric: String(minutes), unit: 'daq',
    caption: 'Kunlik fokus',
    meta: label.done ? `Maqsad ${goal} daq bajarildi` : `Maqsad ${goal} daq · yana ${goal - minutes}`,
    signal: { kind: 'bar', value: clamp01(minutes / goal) },
    status: null, done: label.done, counted: true,
    spoken: `${minutes} daqiqa`,
  }
}

function quizCard(q: NonNullable<PlanCardsInput['quiz']>): Draft {
  const caption = `5 Savol #${q.number}`
  const base = { key: 'quiz', type: 'quiz' as const, label: 'Savol', caption, counted: true }
  if (q.state === 'submitted') {
    const correct = Math.max(0, q.correct ?? 0)
    return {
      ...base, metric: `${correct}/5`, unit: 'toʻgʻri',
      meta: q.rank ? `#${q.rank}-oʻrin bugun` : 'Bugungi tur yakunlandi',
      signal: { kind: 'segments', total: 5, filled: Math.min(5, correct) },
      status: null, done: true, spoken: `5 tadan ${correct} ta toʻgʻri`,
    }
  }
  if (q.state === 'in_progress') {
    const answered = Math.max(0, q.answered ?? 0)
    return {
      ...base, metric: `${answered}/5`, unit: 'javob',
      meta: quizClosesIn(q.secondsLeft),
      signal: { kind: 'segments', total: 5, filled: 0 },
      status: null, done: false, spoken: `5 tadan ${answered} ta javob`,
    }
  }
  return {
    ...base, metric: '5', unit: 'savol',
    meta: quizClosesIn(q.secondsLeft),
    signal: { kind: 'segments', total: 5, filled: 0 },
    status: 'new', done: false, spoken: '5 ta savol',
  }
}

function courseCard(c: PlanCourseInput): Draft | null {
  const p = clamp01(c.progress)
  const pct = Math.round(p * 100)
  const done = p >= 1
  const base = { key: `course:${c.id}`, type: 'course' as const, label: 'Kurs', caption: uzText(c.title), ref: c.id, counted: true, status: null, done }
  if (c.totalLessons > 0) {
    const doneLessons = Math.min(c.totalLessons, Math.round(p * c.totalLessons))
    return {
      ...base, metric: `${doneLessons}/${c.totalLessons}`, unit: 'dars',
      meta: done ? 'Kurs tugatildi' : `${pct}% · keyingisi ${doneLessons + 1}-dars`,
      signal: c.totalLessons <= MAX_SEGMENTS
        ? { kind: 'segments', total: c.totalLessons, filled: doneLessons }
        : { kind: 'bar', value: p },
      spoken: `${c.totalLessons} darsdan ${doneLessons} tasi`,
    }
  }
  return {
    ...base, metric: String(pct), unit: '%',
    meta: done ? 'Kurs tugatildi' : 'Davom etish',
    signal: { kind: 'bar', value: p },
    spoken: `${pct} foiz`,
  }
}

function competitionCard(c: PlanCompetitionInput, nowMs: number): Draft {
  const start = Date.parse(c.startsAt)
  const end = Date.parse(c.endsAt)
  const elapsed = end > start ? clamp01((nowMs - start) / (end - start)) : 0
  const left = leftLabel(c.endsAt, nowMs)
  const ranked = c.joined && c.rank != null && c.rank > 0
  return {
    key: `competition:${c.id}`, type: 'competition', label: 'Bellashuv',
    metric: ranked ? `#${c.rank}` : String(Math.max(0, c.participants)),
    unit: ranked ? 'oʻrin' : 'kishi',
    caption: uzText(c.title),
    meta: !c.joined ? `Qoʻshiling · ${left}` : ranked ? `${c.participants} kishi · ${left}` : `Reyting hali yoʻq · ${left}`,
    signal: { kind: 'bar', value: elapsed },
    status: null, done: false, counted: false, ref: c.slug,
    spoken: ranked ? `${c.rank}-oʻrin` : `${c.participants} kishi`,
  }
}

function reviewCard(r: NonNullable<PlanCardsInput['review']>): Draft | null {
  if (!r.lastWeek || r.lastWeek.length !== 7) return null
  const minutes = r.lastWeek.map(m => Math.max(0, Math.round(m || 0)))
  const total = minutes.reduce((a, b) => a + b, 0)
  return {
    key: 'review', type: 'review', label: 'Tahlil',
    metric: String(total), unit: 'daq',
    caption: 'Haftalik sharh',
    meta: 'Oʻtgan hafta · jami fokus',
    signal: { kind: 'week', minutes },
    status: r.isNew ? 'new' : null, done: false, counted: false,
    spoken: `oʻtgan hafta ${total} daqiqa`,
  }
}

const DAILY: readonly string[] = ['cards', 'focus', 'quiz']

/** The "next" card's key: the primary action's task while unfinished, else
 *  the first unfinished daily task, else the first unfinished course. */
export function pickNext(drafts: readonly Draft[], preferred: PlanKey | null): string | null {
  const open = drafts.filter(d => d.counted && !d.done)
  if (preferred === 'course') {
    const course = open.find(d => d.type === 'course')
    if (course) return course.key
  } else if (preferred) {
    const hit = open.find(d => d.key === preferred)
    if (hit) return hit.key
  }
  return (open.find(d => DAILY.includes(d.key)) ?? open.find(d => d.type === 'course'))?.key ?? null
}

export function planCards(input: PlanCardsInput, preferred: PlanKey | null): PlanLayout {
  const drafts: Draft[] = []
  if (input.cards) drafts.push(cardsCard(input.cards))
  drafts.push(focusCard(input.focus))
  if (input.quiz) drafts.push(quizCard(input.quiz))
  for (const c of input.competitions) drafts.push(competitionCard(c, input.nowMs))
  for (const c of input.courses) {
    const d = courseCard(c)
    if (d) drafts.push(d)
  }

  const nextKey = pickNext(drafts, preferred)
  const cards = drafts.map(d => finish(d, d.key === nextKey))
  const grid = [
    ...cards.filter(c => c.next),
    ...cards.filter(c => !c.next && !c.done),
    ...cards.filter(c => c.done),
  ]

  const reviewDraft = input.review ? reviewCard(input.review) : null
  const review = reviewDraft ? finish(reviewDraft, false) : null
  const odd = grid.length % 2 === 1
  const counted = cards.filter(c => c.counted)
  return {
    grid: review && odd ? [...grid, review] : grid,
    wide: review && !odd ? review : null,
    done: counted.filter(c => c.done).length,
    total: counted.length,
  }
}

/** Index of the week's busiest day (the full-colour bar); -1 if all zero. */
export function peakDay(minutes: readonly number[]): number {
  let best = -1
  let max = 0
  minutes.forEach((m, i) => { if (m > max) { max = m; best = i } })
  return best
}
