import { GraduationCap, Home, Layers, Timer, Trophy, type LucideIcon } from 'lucide-react-native'
import type { FocusTab } from './focusModeStore'

/** The five tab buttons, in bar order. */
export const TAB_META: { name: FocusTab; label: string; Icon: LucideIcon }[] = [
  { name: 'index',       label: 'Bugun',     Icon: Home },
  { name: 'study',       label: 'Fokus',     Icon: Timer },
  { name: 'courses',     label: 'Kurslar',   Icon: GraduationCap },
  { name: 'flashcards',  label: 'Kartalar',  Icon: Layers },
  { name: 'musobaqalar', label: 'Bellashuv', Icon: Trophy },
]

export const tabMeta = (name: FocusTab) => TAB_META.find(t => t.name === name)!

/**
 * Fokus rejimi's floating capsule (design "Kapsula 2–4"): items 80 × 48
 * (76 with four), 4 apart, 4 inside the capsule; the capsule is the bar's
 * height and hugs its items.
 */
export const capsule = {
  pad: 4,
  gap: 4,
  itemH: 48,
  itemW: (n: number) => (n >= 4 ? 76 : 80),
  width: (n: number) => n * (n >= 4 ? 76 : 80) + (n - 1) * 4 + 4 * 2,
} as const
