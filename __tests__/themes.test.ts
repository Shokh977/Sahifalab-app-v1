import { describe, expect, it } from '@jest/globals'
import { backgroundTokens, palette, textTokens, tintOf, type TintName } from '../src/design/tokens'
import { THEMES, THEME_IDS, themeFills, themePalette, themePlanNext, themeScheme } from '../src/design/themes'
import { contrastRatio } from '../src/design/contrast'

// The app themes (Mavzu): every text pair passes AA in every theme, the
// accent's content reads, and progress fills read on the track. Standart is
// the existing palette, already covered by contrast.test.ts.
const themed = THEME_IDS.filter(id => id !== 'standart')

function over(fg: string, bg: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(fg)
  let rgb: number[]
  let a: number
  if (m) { rgb = [+m[1], +m[2], +m[3]]; a = +m[4] }
  else if (fg.length === 9) { rgb = [0, 1, 2].map(i => ch(fg, i)); a = ch(fg, 3) / 255 }
  else return fg
  return '#' + rgb.map((c, i) => Math.round(c * a + ch(bg, i) * (1 - a)).toString(16).padStart(2, '0')).join('')
}

describe('Standart is the current app', () => {
  it.each(['light', 'dark'] as const)('%s palette is untouched', scheme => {
    expect(themePalette('standart', scheme)).toBe(palette[scheme])
  })
})

describe.each(themed)('%s theme', id => {
  const scheme = themeScheme(id, 'light')
  const p = themePalette(id, 'light')

  it('has a fixed mode', () => {
    expect(THEMES[id].mode).toBe(scheme)
    expect(themePalette(id, 'dark')).toEqual(p)
  })

  it.each(textTokens.flatMap(fg => backgroundTokens.map(bg => [fg, bg] as const)))(
    '%s on %s is at least 4.5:1',
    (fg, bg) => {
      expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5)
    },
  )

  const chips: ['successText' | 'accentText' | 'goldChipText', 'greenSoft' | 'accentSoft' | 'goldChip'][] = [
    ['successText', 'greenSoft'], ['accentText', 'accentSoft'], ['goldChipText', 'goldChip'],
  ]
  it.each(chips)(
    '%s on %s over every surface is at least 4.5:1',
    (fg, chip) => {
      for (const base of ['bg', 'surface', 'surfaceRaised'] as const) {
        expect(contrastRatio(p[fg], over(p[chip], p[base]))).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  it('onAccent reads on the accent and the deep fill (4.5:1) and on the fill (large text, 3:1)', () => {
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5)
    for (const stop of themeFills(id).accentFillDeep) expect(contrastRatio(p.onAccent, stop)).toBeGreaterThanOrEqual(4.5)
    for (const stop of themeFills(id).accentFill) expect(contrastRatio(p.onAccent, stop)).toBeGreaterThanOrEqual(3)
  })

  it('the progress fill end reads on the track (3:1, UI)', () => {
    expect(contrastRatio(themeFills(id).progressFill[1], p.track)).toBeGreaterThanOrEqual(3)
  })

  it('the next plan tile content reads', () => {
    const n = themePlanNext(id, 'light')
    expect(contrastRatio(n.ink, n.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(n.playIcon, n.playBg)).toBeGreaterThanOrEqual(3)
  })

  const tints: TintName[] = ['green', 'blue', 'violet', 'gold', 'orange', 'teal', 'pink']
  it.each(tints.map(t => [t]))('%s icon on its soft tile is at least 3:1 (non-text)', t => {
    const { ink, soft } = tintOf(p, t, scheme)
    expect(contrastRatio(ink, over(soft, p.surface))).toBeGreaterThanOrEqual(3)
  })
})
