import { describe, expect, it } from '@jest/globals'
import { backgroundTokens, palette, textTokens } from '../src/design/tokens'
import { contrastRatio, meetsAA } from '../src/design/contrast'

describe('contrast helpers', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
    expect(meetsAA('#767676', '#FFFFFF')).toBe(true)   // 4.54
    expect(meetsAA('#777777', '#FFFFFF')).toBe(false)  // 4.48
  })
})

// Spec section 4: every text-on-background pair passes AA (4.5:1) in both
// themes. textFaint is decoration/disabled only, so it is not a text token.
describe.each(['dark', 'light'] as const)('%s palette', scheme => {
  const p = palette[scheme]
  it.each(textTokens.flatMap(fg => backgroundTokens.map(bg => [fg, bg] as const)))(
    '%s on %s is at least 4.5:1',
    (fg, bg) => {
      expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('onAccent text on the accent fill is at least 4.5:1', () => {
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5)
  })
})
