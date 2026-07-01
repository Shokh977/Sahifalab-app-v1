import type { DeckCategory } from './types'

export const DECK_CATEGORIES: { key: DeckCategory; label: string }[] = [
  { key: 'english',     label: 'Ingliz tili' },
  { key: 'ielts',       label: 'IELTS/CEFR' },
  { key: 'business',    label: 'Biznes' },
  { key: 'arabic',      label: 'Arab tili' },
  { key: 'programming', label: 'Dasturlash' },
  { key: 'medical',     label: 'Tibbiyot' },
  { key: 'other',       label: 'Boshqa' },
]

const LABEL_MAP: Record<string, string> = Object.fromEntries(DECK_CATEGORIES.map(c => [c.key, c.label]))

export function categoryLabel(key: string | null | undefined): string {
  if (!key) return ''
  return LABEL_MAP[key] ?? key
}
