import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  PRESET, TRIAL_GRACE_MS, TRIAL_MS, focusAccess, hiddenSectionOf, normaliseKeep, openGuarded, sectionOf,
  todayMs, useFocusModeStore,
} from '../src/features/focusMode/focusModeStore'

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

const initial = useFocusModeStore.getState()
beforeEach(async () => {
  useFocusModeStore.setState(initial, true)
  await AsyncStorage.clear()
  jest.useRealTimers()
})

describe('normaliseKeep', () => {
  it('always keeps Fokus and orders tabs as in the bar', () => {
    expect(normaliseKeep(['musobaqalar', 'courses'])).toEqual(['study', 'courses', 'musobaqalar'])
  })
  it('falls back to the preset outside 2–4 tabs', () => {
    expect(normaliseKeep([])).toEqual(PRESET)
    expect(normaliseKeep(['index', 'courses', 'flashcards', 'musobaqalar'])).toEqual(PRESET)
    expect(normaliseKeep(['nope'])).toEqual(PRESET)
  })
})

describe('focusAccess', () => {
  const now = 1_000_000_000
  it('Pro always has it', () => {
    expect(focusAccess({ trialStartedAt: null, trialUsed: true }, true, now)).toBe('pro')
  })
  it('free: untried, running, spent', () => {
    expect(focusAccess({ trialStartedAt: null, trialUsed: false }, false, now)).toBe('free')
    expect(focusAccess({ trialStartedAt: now - 1000, trialUsed: false }, false, now)).toBe('trialActive')
    expect(focusAccess({ trialStartedAt: now - TRIAL_MS, trialUsed: false }, false, now)).toBe('trialUsed')
    expect(focusAccess({ trialStartedAt: null, trialUsed: true }, false, now)).toBe('trialUsed')
  })
})

describe('trial', () => {
  it('turning off in the first 10 minutes keeps the try', () => {
    const st = useFocusModeStore.getState()
    st.enable(PRESET, { trial: true })
    expect(useFocusModeStore.getState().trialStartedAt).not.toBeNull()
    st.disable()
    const s = useFocusModeStore.getState()
    expect(s.trialStartedAt).toBeNull()
    expect(s.trialUsed).toBe(false)
  })
  it('turning off later spends it', () => {
    jest.useFakeTimers().setSystemTime(1_000_000_000)
    useFocusModeStore.getState().enable(PRESET, { trial: true })
    jest.setSystemTime(1_000_000_000 + TRIAL_GRACE_MS + 1)
    useFocusModeStore.getState().disable()
    expect(useFocusModeStore.getState().trialUsed).toBe(true)
  })
  it('enforce turns the mode off when the day is over, not for Pro', () => {
    useFocusModeStore.getState().enable(PRESET, { trial: true })
    const started = useFocusModeStore.getState().trialStartedAt!
    useFocusModeStore.getState().enforce(true, started + TRIAL_MS + 1)
    expect(useFocusModeStore.getState().on).toBe(true)
    useFocusModeStore.getState().enforce(false, started + TRIAL_MS + 1)
    const s = useFocusModeStore.getState()
    expect(s.on).toBe(false)
    expect(s.trialUsed).toBe(true)
  })
  it('enforce leaves a lapsed-Pro user without a trial off', () => {
    useFocusModeStore.getState().enable(PRESET)
    useFocusModeStore.getState().enforce(false)
    expect(useFocusModeStore.getState().on).toBe(false)
  })
})

describe('time today', () => {
  it('adds the running stretch to the closed ones', () => {
    const day = (() => { const d = new Date(2026, 10, 19, 12); return d.getTime() })()
    const s = { on: true, onSince: day - 30 * 60000, day: `2026-11-19`, dayMs: 10 * 60000 }
    expect(todayMs(s, day)).toBe(40 * 60000)
    expect(todayMs({ ...s, on: false, onSince: null }, day)).toBe(10 * 60000)
  })
})

describe('sections', () => {
  it('maps routes to their tab', () => {
    expect(sectionOf('/(tabs)')).toBe('index')
    expect(sectionOf('/(screens)/course/12')).toBe('courses')
    expect(sectionOf('/(screens)/flashcard-deck/3')).toBe('flashcards')
    expect(sectionOf('/(screens)/daily-quiz-results')).toBe('musobaqalar')
    expect(sectionOf('/(screens)/challenge/spring')).toBe('musobaqalar')
    expect(sectionOf('/(tabs)/study')).toBe('study')
    expect(sectionOf('/(screens)/profile/5')).toBeNull()
    expect(sectionOf('/(screens)/pro')).toBeNull()
  })
  it('only hides what the user didn’t keep, only while on', () => {
    expect(hiddenSectionOf('/(screens)/course/1')).toBeNull()
    useFocusModeStore.getState().enable(['study', 'musobaqalar'])
    expect(hiddenSectionOf('/(screens)/course/1')).toBe('courses')
    expect(hiddenSectionOf('/(screens)/challenge/x')).toBeNull()
  })
  it('openGuarded opens, or asks first', () => {
    const open = jest.fn()
    openGuarded('/(screens)/course/1', open)
    expect(open).toHaveBeenCalledWith('/(screens)/course/1')
    useFocusModeStore.getState().enable(PRESET)
    open.mockClear()
    openGuarded('/(screens)/course/1', open)
    expect(open).not.toHaveBeenCalled()
    expect(useFocusModeStore.getState().blocked).toEqual({ route: '/(screens)/course/1', section: 'courses' })
  })
})

describe('persistence', () => {
  it('survives a restart', async () => {
    useFocusModeStore.getState().enable(['study', 'flashcards', 'musobaqalar'])
    useFocusModeStore.getState().markIntroSeen()
    await new Promise(r => setTimeout(r, 0))
    useFocusModeStore.setState(initial, true)
    await useFocusModeStore.getState().load()
    const s = useFocusModeStore.getState()
    expect(s.on).toBe(true)
    expect(s.keep).toEqual(['study', 'flashcards', 'musobaqalar'])
    expect(s.introSeen).toBe(true)
  })
})
