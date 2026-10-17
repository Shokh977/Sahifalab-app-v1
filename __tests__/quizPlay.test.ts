import { describe, expect, it } from '@jest/globals'
import {
  feedbackTitle, isAnswerUnsupported, nextLabel, opensAt, optionLetter, questionCounter, quizOverline,
  resumeIndex, segmentStates,
} from '../src/features/quiz/quizPlay'

describe('quizPlay', () => {
  it('uses the Uzbek option letters', () => {
    expect([0, 1, 2, 3].map(optionLetter)).toEqual(['A', 'B', 'D', 'E'])
  })

  it('resumes at the first unanswered question', () => {
    const ids = [10, 11, 12, 13, 14]
    expect(resumeIndex(ids, null)).toBe(0)
    expect(resumeIndex(ids, [{ question_id: 10, correct: true }, { question_id: 11, correct: false }, { question_id: 12, correct: true }])).toBe(3)
    expect(resumeIndex(ids, ids.map(id => ({ question_id: id, correct: true })))).toBe(5)
  })

  it('maps results to segment states', () => {
    const results = new Map<number, boolean | null>([[10, true], [11, false], [12, null]])
    expect(segmentStates([10, 11, 12, 13, 14], results, 3)).toEqual(['correct', 'wrong', 'answered', 'current', 'todo'])
  })

  it('builds the overline and counter', () => {
    expect(quizOverline(67, "Pul va iqtisod")).toBe('5 SAVOL #67 · PUL VA IQTISOD')
    expect(quizOverline(67, "O'zbek tili")).toBe('5 SAVOL #67 · OʻZBEK TILI')
    expect(quizOverline(3, '')).toBe('5 SAVOL #3')
    expect(questionCounter(2, 5)).toBe('3-savol / 5')
  })

  it('formats the opening time in local time', () => {
    const now = new Date(2026, 9, 17, 22, 10).getTime()
    expect(opensAt(6 * 3600 + 50 * 60, now)).toBe('05:00')
    expect(opensAt(-1, now)).toBe('22:10')
  })

  it('writes feedback and next labels', () => {
    expect(feedbackTitle(true, 1, null)).toBe('Toʻgʻri! +1 tanga')
    expect(feedbackTitle(true, 0, null)).toBe('Toʻgʻri!')
    expect(feedbackTitle(false, 1, 'Toshkent')).toBe('Notoʻgʻri. Toʻgʻri javob: Toshkent')
    expect(nextLabel(false)).toBe('Keyingi savol')
    expect(nextLabel(true)).toBe('Natijani koʻrish')
  })

  it('detects a backend without /answer', () => {
    expect(isAnswerUnsupported('Not Found')).toBe(true)
    expect(isAnswerUnsupported('HTTP 404')).toBe(true)
    expect(isAnswerUnsupported('already submitted')).toBe(false)
    expect(isAnswerUnsupported(undefined)).toBe(false)
  })
})
