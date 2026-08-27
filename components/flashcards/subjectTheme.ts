/**
 * subjectTheme.ts — Kartalar redesign.
 *
 * Two independent things live here:
 *   1. useKartalarColors() — a small palette scoped to the Kartalar screen
 *      family, distinct from (not a replacement for) the app-wide theme in
 *      lib/constants.ts. The redesign spec calls for specific refined values
 *      (e.g. dark surface #191C22 vs the app-wide #16161A, accent #F0A32B vs
 *      #F5A623) that are a deliberate visual refresh for this one screen —
 *      changing the global tokens would ripple into every other screen,
 *      which nothing in this task asked for.
 *   2. subjectStyle() — maps a deck's real `category` (lib/types.ts's
 *      DeckCategory: english/ielts/business/arabic/programming/medical/
 *      other — there is no "Korean" category in this app's data model,
 *      despite the illustrative example in the design brief) to a color +
 *      short glyph, used by SubjectTile/DeckRow/PublicSetRow for the accent
 *      spine and subject tile. Falls back to the title's first two letters
 *      for 'other'/unrecognised categories, per spec.
 *
 * CategoryIcon is kept here (moved from the now-deleted DeckCard.tsx) purely
 * for public-deck/[id].tsx's existing hero header, which is out of this
 * redesign's scope (only the Kartalar screen body is being rebuilt).
 */
import React from 'react'
import {
  Globe, GraduationCap, Briefcase, BookOpen, Code, Heart, Cards,
} from 'phosphor-react-native'
import type { DeckCategory } from '../../lib/types'

// ── Kartalar-scoped palette ──────────────────────────────────────────────────

export interface KartalarColors {
  screenBg:        string
  surface:         string
  surfaceRaised:   string
  tabBarBg:        string
  segmentTrackBg:  string
  hairline:        string
  textPrimary:     string
  textMuted:       string
  textMutedStrong: string
  accent:          string
  onAccent:        string
  accentTint:      string
  green:           string
  greenTint:       string
  progressTrack:   string
  destructive:     string
  isDark:          boolean
}

const KARTALAR_LIGHT: KartalarColors = {
  screenBg:        '#F6F5F1',
  surface:         '#FFFFFF',
  surfaceRaised:   '#FFFFFF',
  tabBarBg:        '#FFFFFF',
  segmentTrackBg:  '#EAE8E2',
  hairline:        'rgba(0,0,0,.07)',
  textPrimary:     '#14161A',
  textMuted:       '#8A9098',
  textMutedStrong: '#9AA0A6',
  accent:          '#D9832B',
  onAccent:        '#FFFFFF',
  accentTint:      '#FFF1D8',
  green:           '#2FA84F',
  greenTint:       '#E8F7EC',
  progressTrack:   '#EDEAE3',
  destructive:     '#D0563F',
  isDark:          false,
}

const KARTALAR_DARK: KartalarColors = {
  screenBg:        '#0E0F12',
  surface:         '#191C22',
  surfaceRaised:   '#2A2F38',
  tabBarBg:        '#131519',
  segmentTrackBg:  '#191C22',
  hairline:        'rgba(255,255,255,.07)',
  textPrimary:     '#F2F3F5',
  textMuted:       '#8A9098',
  textMutedStrong: '#9AA1AC',
  accent:          '#F0A32B',
  onAccent:        '#1B1608',
  accentTint:      'rgba(240,163,43,.16)',
  green:           '#5FD37E',
  greenTint:       'rgba(55,180,87,.16)',
  progressTrack:   '#2B2F36',
  destructive:     '#E06A55',
  isDark:          true,
}

export function kartalarColorsFor(theme: 'light' | 'dark'): KartalarColors {
  return theme === 'dark' ? KARTALAR_DARK : KARTALAR_LIGHT
}

// Card shadow is present in light mode only (spec: "none" in dark) — a plain
// style object, not a color, so it's exposed as a helper rather than a token.
export function kartalarCardShadow(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {}
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }
}

export function kartalarRaisedShadow(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {}
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }
}

// ── Subject color + glyph map ────────────────────────────────────────────────

export interface SubjectStyle {
  color: string
  tint:  string
  glyph: string
}

const SUBJECT_MAP: Record<Exclude<DeckCategory, 'other'>, { light: string; dark: string; lightTint: string; darkTint: string; glyph: string }> = {
  english:     { light: '#2F80ED', dark: '#7FB1F7', lightTint: '#EEF5FF', darkTint: 'rgba(47,128,237,.16)',  glyph: 'EN'    },
  ielts:       { light: '#D9832B', dark: '#F0A32B', lightTint: '#FFF1D8', darkTint: 'rgba(240,163,43,.16)',  glyph: 'IELTS' },
  business:    { light: '#2FA84F', dark: '#5FD37E', lightTint: '#E8F7EC', darkTint: 'rgba(55,180,87,.16)',   glyph: 'BIZ'   },
  arabic:      { light: '#8B5CF6', dark: '#B497FF', lightTint: '#F1EAFE', darkTint: 'rgba(139,92,246,.16)',  glyph: 'AR'    },
  programming: { light: '#0E9488', dark: '#5EEAD4', lightTint: '#E3F7F5', darkTint: 'rgba(14,148,136,.18)',  glyph: 'DEV'   },
  medical:     { light: '#DB5A8C', dark: '#F296C0', lightTint: '#FCEBF2', darkTint: 'rgba(219,90,140,.18)',  glyph: 'MED'   },
}

const FALLBACK = {
  light: '#5C636B', dark: '#9AA1AC',
  lightTint: 'rgba(92,99,107,.08)', darkTint: 'rgba(154,161,172,.14)',
}

function titleGlyph(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

/** category is the deck's real DeckCategory field (nullable in the data);
 * title is used only as the glyph fallback for 'other'/unrecognised categories. */
export function subjectStyle(category: string | null | undefined, title: string, theme: 'light' | 'dark'): SubjectStyle {
  const entry = category && category in SUBJECT_MAP ? SUBJECT_MAP[category as Exclude<DeckCategory, 'other'>] : null
  if (entry) {
    return {
      color: theme === 'dark' ? entry.dark : entry.light,
      tint:  theme === 'dark' ? entry.darkTint : entry.lightTint,
      glyph: entry.glyph,
    }
  }
  return {
    color: theme === 'dark' ? FALLBACK.dark : FALLBACK.light,
    tint:  theme === 'dark' ? FALLBACK.darkTint : FALLBACK.lightTint,
    glyph: titleGlyph(title),
  }
}

// ── CategoryIcon — kept only for public-deck/[id].tsx's existing header ─────

export function CategoryIcon({ category, size = 28 }: { category: string | null; size?: number }) {
  const color = 'rgba(255,255,255,0.90)'
  switch (category) {
    case 'english':     return React.createElement(Globe, { size, color })
    case 'ielts':       return React.createElement(GraduationCap, { size, color })
    case 'business':    return React.createElement(Briefcase, { size, color })
    case 'arabic':      return React.createElement(BookOpen, { size, color })
    case 'programming': return React.createElement(Code, { size, color })
    case 'medical':     return React.createElement(Heart, { size, color })
    default:            return React.createElement(Cards, { size, color })
  }
}
