/**
 * Avatar initials (Phase 7.5 A5): the first letters of the first two words,
 * or the first two letters of a single word ("Sanjar" → "SA"). Letters
 * only — the ʻ in Oʻ/Gʻ, apostrophes, digits and emoji are skipped, and a
 * word without letters doesn't count. Blank → "?".
 */
const LETTER = /[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]/u

function letters(word: string): string[] {
  return Array.from(word).filter(ch => LETTER.test(ch))
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).map(letters).filter(w => w.length > 0)
  if (words.length === 0) return '?'
  const out = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2).join('')
  return out.toUpperCase()
}
