/**
 * colorUtils.ts — generic hex color helpers shared across unrelated features
 * (deck rows, badge tiles, challenge covers). Moved out of components/
 * flashcards/DeckCard.tsx (Kartalar redesign) since darkenHex never had
 * anything deck-specific about it — it's a plain HSL-lightness darken.
 */
export function darkenHex(hex: string, amount = 20): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else                h = ((r - g) / d + 4) / 6
    }
    l = Math.max(0, l - amount / 100)
    if (s === 0) {
      const v = Math.round(l * 255).toString(16).padStart(2, '0')
      return `#${v}${v}${v}`
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (pp: number, qq: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return pp + (qq - pp) * 6 * t
      if (t < 1 / 2) return qq
      if (t < 2 / 3) return pp + (qq - pp) * (2 / 3 - t) * 6
      return pp
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
    return '#' + toHex(hue2rgb(p, q, h + 1 / 3)) + toHex(hue2rgb(p, q, h)) + toHex(hue2rgb(p, q, h - 1 / 3))
  } catch { return hex }
}
