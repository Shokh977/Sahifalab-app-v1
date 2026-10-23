import { describe, expect, it } from '@jest/globals'
import {
  canAssist, ctaProminent, draftErrors, fillWrong, isReady, normalizeOption, toSubmitBody, type QuestionDraft,
} from '../src/features/questions/questionForm'

const draft = (over: Partial<QuestionDraft> = {}): QuestionDraft => ({
  question: 'Asal nima uchun buzilmaydi?',
  correct: 'Suv juda kam',
  wrong: ['Tuz bor', 'Sovuqda turadi', 'Spirt bor'],
  explanation: '',
  source: '',
  ...over,
})

describe('questionForm', () => {
  it('accepts a complete draft', () => {
    expect(draftErrors(draft())).toEqual({})
    expect(isReady(draft())).toBe(true)
  })

  it('flags a short or long question', () => {
    expect(draftErrors(draft({ question: 'Qisqa?' })).question).toBeTruthy()
    expect(draftErrors(draft({ question: 'x'.repeat(201) })).question).toBeTruthy()
    expect(draftErrors(draft({ question: '        a       ' })).question).toBeTruthy()
  })

  it('flags empty, long and repeated options', () => {
    expect(draftErrors(draft({ wrong: ['', 'b', 'c'] })).wrong0).toBe('Toʻldiring')
    expect(draftErrors(draft({ wrong: ['x'.repeat(81), 'b', 'c'] })).wrong0).toBeTruthy()
    expect(draftErrors(draft({ wrong: ['suv juda kam.', 'b', 'c'] })).wrong0).toBe('Boshqa javob bilan bir xil')
    expect(draftErrors(draft({ correct: "Oʻzbek", wrong: ["O'zbek", 'b', 'c'] })).wrong0).toBe('Boshqa javob bilan bir xil')
  })

  it('normalises apostrophes, case and punctuation', () => {
    expect(normalizeOption("  O`zbekiston. ")).toBe(normalizeOption('oʻzbekiston'))
  })

  it('offers the AI assist only once the question and answer are there', () => {
    expect(canAssist(draft({ correct: '' }))).toBe(false)
    expect(canAssist(draft({ question: 'Qisqa' }))).toBe(false)
    expect(canAssist(draft({ wrong: ['', '', ''] }))).toBe(true)
  })

  it('fills only empty wrong answers, never what the user typed', () => {
    expect(fillWrong(['Meniki', '', ''], ['A', 'B', 'C'])).toEqual(['Meniki', 'A', 'B'])
    expect(fillWrong(['', '', ''], ['A'])).toEqual(['A', '', ''])
  })

  it('submits the correct answer first, trimmed, with optional notes as null', () => {
    const body = toSubmitBody(draft({ correct: '  Suv juda kam ' }), true, false)
    expect(body.options[0]).toBe('Suv juda kam')
    expect(body.correct_index).toBe(0)
    expect(body.explanation).toBeNull()
    expect(body.is_anonymous).toBe(true)
  })

  it('makes the results CTA louder on a strong round or a credited question', () => {
    expect(ctaProminent(5, [])).toBe(true)
    expect(ctaProminent(2, ['Dilnoza'])).toBe(true)
    expect(ctaProminent(3, undefined)).toBe(false)
  })
})
