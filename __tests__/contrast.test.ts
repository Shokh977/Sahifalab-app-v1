import { describe, expect, it } from '@jest/globals'
import { accentFill, avatarColors, backgroundTokens, onAvatar, palette, textTokens } from '../src/design/tokens'
import { contrastRatio, meetsAA } from '../src/design/contrast'

/** Midpoint of two #RRGGBB colours (the gradient's centre). */
function mix(a: string, b: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2].map(i => Math.round((ch(a, i) + ch(b, i)) / 2).toString(16).padStart(2, '0')).join('')
}

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

  // Phase 7.5 B1: white on the orange gradient is large-text only (18 px
  // extra bold or a 24 px+ number), so the bar is WCAG's 3:1 — met from the
  // middle of the gradient (where a label sits) to the bottom. The top stop
  // alone is 2.74:1; nothing is drawn on the top edge.
  it('white on the accent gradient meets the large-text 3:1 where text sits', () => {
    expect(contrastRatio(p.onAccent, mix(accentFill[0], accentFill[1]))).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(p.onAccent, accentFill[1])).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(3)
  })
})

describe('avatar initials', () => {
  it.each(avatarColors.map(c => [c]))('white on %s is at least 4.5:1', bg => {
    expect(contrastRatio(onAvatar, bg)).toBeGreaterThanOrEqual(4.5)
  })
})
