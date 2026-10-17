import { describe, expect, it } from '@jest/globals'

// The level-up Lottie is hand-built (Phase 5); make sure it stays a valid,
// small, finite animation that react-native/lottie can load.
const anim = require('../assets/animations/level-up.json')

describe('level-up.json', () => {
  it('is a Lottie document with a finite frame range', () => {
    expect(typeof anim.v).toBe('string')
    expect(anim.fr).toBeGreaterThan(0)
    expect(anim.op).toBeGreaterThan(anim.ip)
    expect((anim.op - anim.ip) / anim.fr).toBeLessThanOrEqual(1.5)
    expect(anim.w).toBeGreaterThan(0)
    expect(anim.h).toBeGreaterThan(0)
  })

  it('has shape layers only, each with a transform and shapes', () => {
    expect(anim.layers.length).toBeGreaterThan(0)
    for (const l of anim.layers) {
      expect(l.ty).toBe(4)
      expect(l.ks).toBeDefined()
      expect(Array.isArray(l.shapes)).toBe(true)
    }
  })

  it('stays small', () => {
    expect(JSON.stringify(anim).length).toBeLessThan(40_000)
  })
})
