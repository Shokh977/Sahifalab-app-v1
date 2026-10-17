import { describe, expect, it, jest } from '@jest/globals'

describe('haptics', () => {
  it('never throws when the native module rejects', async () => {
    jest.resetModules()
    jest.doMock('expo-haptics', () => ({
      ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
      NotificationFeedbackType: { Success: 'success', Error: 'error' },
      impactAsync: () => Promise.reject(new Error('no haptic engine')),
      notificationAsync: () => Promise.reject(new Error('no haptic engine')),
      selectionAsync: () => { throw new Error('sync failure') },
    }))
    const { haptics } = require('../src/lib/haptics')
    for (const kind of ['light', 'heavy', 'selection', 'success', 'error'] as const) {
      expect(() => haptics[kind]()).not.toThrow()
    }
    await new Promise(r => setTimeout(r, 0)) // let rejected promises settle
  })

  it('is a no-op when expo-haptics cannot be loaded', () => {
    jest.resetModules()
    jest.doMock('expo-haptics', () => { throw new Error('module missing') })
    const { haptics, hapticsAvailable } = require('../src/lib/haptics')
    expect(hapticsAvailable()).toBe(false)
    expect(() => haptics.success()).not.toThrow()
  })
})
