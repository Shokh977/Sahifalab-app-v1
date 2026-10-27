import { describe, expect, it } from '@jest/globals'
import { contrastRatio } from '../src/design/contrast'
import { THEMES, THEME_IDS, themePalette } from '../src/design/themes'
import type { Scheme } from '../src/design/tokens'
import { NAME_STYLE_IDS, inkColors, nameInk } from '../src/features/profile/names/nameStyles'

const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
const hex = (rgb: number[]) => '#' + rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')

/** Midpoint of two #RRGGBB colours (a gradient's centre). */
function mix(a: string, b: string): string {
  return hex([0, 1, 2].map(i => (ch(a, i) + ch(b, i)) / 2))
}

/** A translucent colour (rgba() or #RRGGBBAA) laid over an opaque #RRGGBB. */
function over(fg: string, bg: string): string {
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(fg)
  let rgb: number[]
  let a: number
  if (m) { rgb = [+m[1], +m[2], +m[3]]; a = +m[4] }
  else if (fg.length === 9) { rgb = [0, 1, 2].map(i => ch(fg, i)); a = ch(fg, 3) / 255 }
  else return fg
  return hex(rgb.map((c, i) => c * a + ch(bg, i) * (1 - a)))
}

// Every theme in every mode it renders in: Standart follows the setting,
// the others are fixed.
const cases = THEME_IDS.flatMap(id =>
  (THEMES[id].mode ? [THEMES[id].mode] : ['light', 'dark'] as Scheme[]).map(scheme => [id, scheme as Scheme] as const),
)

// 9-qadam §1: a name colour (each gradient stop, the gradient midpoint, the
// sheen) reads at 4.5:1 on the card surface, the raised surface and the
// "Siz" row (accentSoft over the surface). Glow is not counted.
describe.each(cases)('%s (%s)', (id, scheme) => {
  const p = themePalette(id, scheme)
  const grounds = {
    surface: p.surface,
    surfaceRaised: p.surfaceRaised,
    accentSoft: over(p.accentSoft, p.surface),
  }
  it.each(NAME_STYLE_IDS.filter(s => s !== 'oddiy').map(s => [s]))('%s is at least 4.5:1', style => {
    const ink = nameInk(style, scheme)
    const colors = inkColors(ink)
    if (ink.kind === 'gradient') colors.push(mix(ink.colors[0], ink.colors[1]))
    for (const [ground, bg] of Object.entries(grounds)) {
      for (const c of colors) {
        const r = contrastRatio(c, bg)
        if (r < 4.5) throw new Error(`${style} ${c} on ${ground} ${bg}: ${r.toFixed(2)}`)
        expect(r).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
