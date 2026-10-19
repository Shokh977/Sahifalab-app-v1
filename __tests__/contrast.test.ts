import { describe, expect, it } from '@jest/globals'
import { accentFill, accentFillDeep, avatarColors, backgroundTokens, onAvatar, palette, textTokens, tintOf, type TintName } from '../src/design/tokens'
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

  // Phase 8: the deep fill carries small white text (the KEYINGI tile).
  it('white on the deep accent gradient is at least 4.5:1 everywhere', () => {
    for (const stop of accentFillDeep) expect(contrastRatio(p.onAccent, stop)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('avatar initials', () => {
  it.each(avatarColors.map(c => [c]))('white on %s is at least 4.5:1', bg => {
    expect(contrastRatio(onAvatar, bg)).toBeGreaterThanOrEqual(4.5)
  })
})

/** A translucent colour (rgba() or #RRGGBBAA) laid over an opaque #RRGGBB. */
function over(fg: string, bg: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  let rgb: number[]
  let a: number
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(fg)
  if (m) { rgb = [+m[1], +m[2], +m[3]]; a = +m[4] }
  else if (fg.length === 9) { rgb = [0, 1, 2].map(i => ch(fg, i)); a = ch(fg, 3) / 255 }
  else return fg
  return '#' + rgb.map((c, i) => Math.round(c * a + ch(bg, i) * (1 - a)).toString(16).padStart(2, '0')).join('')
}

// Phase 8: text on the soft chips (status chips, "Siz" rows, result chips),
// over every surface a chip sits on, and tint icons on their soft tiles.
describe.each(['dark', 'light'] as const)('%s chips and tiles', scheme => {
  const p = palette[scheme]
  const chips = [
    ['successText', 'greenSoft'],
    ['accentText', 'accentSoft'],
    ['goldChipText', 'goldChip'],
  ] as const
  const bases = ['bg', 'surface', 'surfaceRaised'] as const
  it.each(chips.flatMap(([fg, chip]) => bases.map(b => [fg, chip, b] as const)))(
    '%s on %s over %s is at least 4.5:1',
    (fg, chip, base) => {
      expect(contrastRatio(p[fg], over(p[chip], p[base]))).toBeGreaterThanOrEqual(4.5)
    },
  )

  const tints: TintName[] = ['green', 'blue', 'violet', 'gold', 'orange', 'teal', 'pink']
  it.each(tints.map(t => [t]))('%s icon on its soft tile is at least 3:1 (non-text)', t => {
    const { ink, soft } = tintOf(p, t, scheme)
    expect(contrastRatio(ink, over(soft, p.surface))).toBeGreaterThanOrEqual(3)
  })
})
