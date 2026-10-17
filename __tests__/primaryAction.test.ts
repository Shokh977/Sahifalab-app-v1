import { describe, expect, it } from '@jest/globals'
import { getPrimaryAction, type TodayState } from '../src/features/today/primaryAction'

const base: TodayState = {
  todayMinutes: 12,
  goalMinutes: 20,
  streakDays: 5,
  streakState: 'active',
  freezeCount: 0,
  hour: 10,
  quiz: { state: 'not_started', theme: 'Pul va iqtisod' },
  dueCards: 6,
  course: { id: 7, title: 'Ingliz tili' },
}

describe('getPrimaryAction — focus goal not met', () => {
  it('continues focus with the minutes left', () => {
    const a = getPrimaryAction(base)
    expect(a).toEqual({
      target: 'focus', label: 'Fokusni davom ettirish',
      caption: 'Seriyani saqlash uchun yana 8 daqiqa', tone: 'default', minutesLeft: 8,
    })
  })

  it('says "boshlash" at 0 minutes', () => {
    expect(getPrimaryAction({ ...base, todayMinutes: 0 }).label).toBe('Fokusni boshlash')
  })

  it('first day: no streak, nothing done', () => {
    const a = getPrimaryAction({ ...base, todayMinutes: 0, streakDays: 0, hour: 21 })
    expect(a.caption).toBe('Birinchi maqsadingiz — 20 daqiqa')
    expect(a.tone).toBe('default')
    expect(a.minutesLeft).toBe(20)
  })

  it('after 20:00 warns, with freezes', () => {
    const a = getPrimaryAction({ ...base, hour: 20, freezeCount: 2 })
    expect(a.caption).toBe('Seriya xavf ostida: yana 8 daqiqa. Muzlatish: 2 ta')
    expect(a.tone).toBe('warning')
  })

  it('at_risk warns before 20:00, without freezes', () => {
    const a = getPrimaryAction({ ...base, streakState: 'at_risk', hour: 9 })
    expect(a.caption).toBe('Seriya xavf ostida: yana 8 daqiqa')
  })

  it('falls back to a 20-minute goal when the goal is 0', () => {
    expect(getPrimaryAction({ ...base, goalMinutes: 0, todayMinutes: 5 }).minutesLeft).toBe(15)
  })
})

describe('getPrimaryAction — goal met', () => {
  const met = { ...base, todayMinutes: 20 }

  it('plays the quiz with today’s theme', () => {
    expect(getPrimaryAction(met)).toEqual({
      target: 'quiz', label: '5 Savolni oʻynash', caption: 'Bugungi mavzu: Pul va iqtisod', tone: 'default',
    })
  })

  it('also resumes an in-progress quiz', () => {
    expect(getPrimaryAction({ ...met, quiz: { state: 'in_progress', theme: null } })).toMatchObject({
      target: 'quiz', caption: 'Bugungi 5 savol',
    })
  })

  it('reviews due cards once the quiz is submitted', () => {
    expect(getPrimaryAction({ ...met, quiz: { state: 'submitted', theme: 'x' } })).toEqual({
      target: 'review', label: 'Kartalarni takrorlash · 6 ta', caption: 'Taxminan 1 daqiqa', tone: 'default',
    })
  })

  it('reviews when the quiz status is unknown', () => {
    expect(getPrimaryAction({ ...met, quiz: null, dueCards: 30 })).toMatchObject({
      target: 'review', caption: 'Taxminan 4 daqiqa',
    })
  })

  it('continues the course when nothing else is left', () => {
    expect(getPrimaryAction({ ...met, quiz: null, dueCards: 0 })).toEqual({
      target: 'course', label: 'Kursni davom ettirish', caption: 'Ingliz tili', tone: 'default',
    })
  })

  it('shows only the caption when everything is done', () => {
    expect(getPrimaryAction({ ...met, quiz: { state: 'submitted', theme: null }, dueCards: 0, course: null })).toEqual({
      target: 'none', label: null, caption: 'Bugungi reja bajarildi', tone: 'success',
    })
  })
})
