/**
 * getPrimaryAction — the one button on Bugun (spec section 7, Phase 2).
 * Pure: every branch is covered in __tests__/primaryAction.test.ts.
 */
import { uzText } from './today'
import { estMinutes } from '../flashcards/queueMath'

export type PrimaryTarget = 'focus' | 'quiz' | 'review' | 'course' | 'none'

export interface TodayState {
  todayMinutes: number
  goalMinutes: number
  streakDays: number
  streakState?: 'active' | 'at_risk' | 'frozen_today' | 'lost'
  freezeCount: number
  /** Local hour 0–23. */
  hour: number
  /** null when today's quiz status isn't known (or there is no quiz). */
  quiz: { state: 'not_started' | 'in_progress' | 'submitted'; theme: string | null; answered?: number } | null
  dueCards: number
  course: { id: number; title: string } | null
}

export interface PrimaryAction {
  target: PrimaryTarget
  /** null: no button, the caption stands alone. */
  label: string | null
  caption: string
  /** Caption colour: warning when the streak is at risk, success when all done. */
  tone: 'default' | 'warning' | 'success'
  /** Focus: minutes still needed for the goal (the timer preset). */
  minutesLeft?: number
}

/** "Davom etish · 3/5" — a 5 Savol round left part-way. */
export function resumeLabel(answered: number, total = 5): string {
  return `Davom etish · ${Math.min(answered, total)}/${total}`
}

/** From this hour an unmet goal puts the streak at risk. */
export const STREAK_RISK_HOUR = 20

export function getPrimaryAction(s: TodayState): PrimaryAction {
  const goal = s.goalMinutes > 0 ? s.goalMinutes : 20
  const today = Math.max(0, s.todayMinutes)

  if (today < goal) {
    const left = goal - today
    const firstDay = s.streakDays === 0 && today === 0
    const atRisk = !firstDay && (s.streakState === 'at_risk' || s.hour >= STREAK_RISK_HOUR)
    const caption = firstDay
      ? `Birinchi maqsadingiz — ${goal} daqiqa`
      : atRisk
        ? s.freezeCount > 0
          ? `Seriya xavf ostida: yana ${left} daqiqa. Muzlatish: ${s.freezeCount} ta`
          : `Seriya xavf ostida: yana ${left} daqiqa`
        : `Seriyani saqlash uchun yana ${left} daqiqa`
    return {
      target: 'focus',
      label: today === 0 ? 'Fokusni boshlash' : 'Fokusni davom ettirish',
      caption,
      tone: atRisk ? 'warning' : 'default',
      minutesLeft: left,
    }
  }

  if (s.quiz && s.quiz.state !== 'submitted') {
    const answered = s.quiz.state === 'in_progress' ? s.quiz.answered ?? 0 : 0
    return {
      target: 'quiz',
      label: answered > 0 ? resumeLabel(answered) : '5 Savolni oʻynash',
      caption: s.quiz.theme ? `Bugungi mavzu: ${uzText(s.quiz.theme)}` : 'Bugungi 5 savol',
      tone: 'default',
    }
  }

  if (s.dueCards > 0) {
    return {
      target: 'review',
      label: `Kartalarni takrorlash · ${s.dueCards} ta`,
      caption: `Taxminan ${estMinutes(s.dueCards)} daqiqa`,
      tone: 'default',
    }
  }

  if (s.course) {
    return { target: 'course', label: 'Kursni davom ettirish', caption: uzText(s.course.title), tone: 'default' }
  }

  return { target: 'none', label: null, caption: 'Bugungi reja bajarildi', tone: 'success' }
}
