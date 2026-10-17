/**
 * Pure helpers for the 5 Savol play and result screens — tested in
 * __tests__/quizPlay.test.ts.
 */
import { uzText } from '../today/today'

/** Uzbek option letters: A, B, D, E (there is no C in the Uzbek order). */
const LETTERS = ['A', 'B', 'D', 'E'] as const
export function optionLetter(i: number): string {
  return LETTERS[i] ?? String(i + 1)
}

export interface AnsweredLike { question_id: number; correct: boolean }

/** First question without a locked answer (all answered → last index + 1). */
export function resumeIndex(questionIds: readonly number[], answered: readonly AnsweredLike[] | null | undefined): number {
  const done = new Set((answered ?? []).map(a => a.question_id))
  const i = questionIds.findIndex(id => !done.has(id))
  return i === -1 ? questionIds.length : i
}

export type SegmentState = 'correct' | 'wrong' | 'current' | 'todo' | 'answered'

/**
 * One state per question for the 5-segment bar. `answered` without a known
 * result (old backend, no reveal) reads as 'answered' (neutral fill).
 */
export function segmentStates(
  questionIds: readonly number[],
  results: ReadonlyMap<number, boolean | null>,
  current: number,
): SegmentState[] {
  return questionIds.map((id, i) => {
    if (results.has(id)) {
      const r = results.get(id)
      return r === true ? 'correct' : r === false ? 'wrong' : 'answered'
    }
    return i === current ? 'current' : 'todo'
  })
}

/** "5 SAVOL #67 · PUL VA IQTISOD" (the overline style uppercases it on screen too). */
export function quizOverline(quizNumber: number, theme: string | null | undefined): string {
  const t = theme ? uzText(theme).toLocaleUpperCase('uz') : ''
  return t ? `5 SAVOL #${quizNumber} · ${t}` : `5 SAVOL #${quizNumber}`
}

export function questionCounter(index: number, total: number): string {
  return `${Math.min(index + 1, total)}-savol / ${total}`
}

/** Local "HH:MM" when the next round opens = the current window's close. */
export function opensAt(secondsRemaining: number, nowMs: number): string {
  const d = new Date(nowMs + Math.max(0, secondsRemaining) * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function feedbackTitle(correct: boolean, tanga: number, correctAnswer: string | null): string {
  if (correct) return tanga > 0 ? `Toʻgʻri! +${tanga} tanga` : 'Toʻgʻri!'
  return correctAnswer ? `Notoʻgʻri. Toʻgʻri javob: ${correctAnswer}` : 'Notoʻgʻri.'
}

export function nextLabel(isLast: boolean): string {
  return isLast ? 'Natijani koʻrish' : 'Keyingi savol'
}

/** The request failed because the backend has no /answer yet (older deploy). */
export function isAnswerUnsupported(message: string | undefined): boolean {
  return !!message && /^(Not Found|HTTP 404)$/.test(message)
}
