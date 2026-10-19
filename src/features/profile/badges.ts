/**
 * One badge model for Profil and the Nishonlar page (redesign Phase 5):
 * the API's three groups (challenges, stages, achievements) plus the level
 * titles, merged into one list. Presentation only — every input badge
 * appears exactly once (tested in __tests__/badges.test.ts).
 */
import type { Badge, BadgeGroups } from '../../../lib/api'
import type { LevelInfo } from '../../../lib/levelTitles'

export type BadgeCategory = 'bellashuv' | 'bosqich' | 'yutuq' | 'unvon'

export const CATEGORY_ORDER: readonly BadgeCategory[] = ['bellashuv', 'bosqich', 'yutuq', 'unvon']

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  bellashuv: 'Bellashuv',
  bosqich: 'Bosqichlar',
  yutuq: 'Yutuqlar',
  unvon: 'Unvonlar',
}

export interface ProfileBadge {
  /** Unique across categories ("title:8" for level titles). */
  key: string
  category: BadgeCategory
  name: string
  description: string
  earned: boolean
  earnedAt: string | null
  /** The API badge, when this came from /profile/me/badges. */
  source: Badge | null
  /** Level for title badges. */
  level: number | null
}

const GROUP_CATEGORY: Record<keyof BadgeGroups['groups'], BadgeCategory> = {
  challenges: 'bellashuv',
  stages: 'bosqich',
  achievements: 'yutuq',
}

export function allBadges(groups: BadgeGroups['groups'] | null | undefined, level: number, titles: readonly LevelInfo[]): ProfileBadge[] {
  const out: ProfileBadge[] = []
  if (groups) {
    for (const g of Object.keys(GROUP_CATEGORY) as (keyof BadgeGroups['groups'])[]) {
      for (const b of groups[g] ?? []) {
        out.push({
          key: `${g}:${b.key}`,
          category: GROUP_CATEGORY[g],
          name: b.name,
          description: b.description,
          earned: b.earned,
          earnedAt: b.earned_at,
          source: b,
          level: null,
        })
      }
    }
  }
  for (const t of titles) {
    out.push({
      key: `title:${t.level}`,
      category: 'unvon',
      name: t.title,
      description: t.description,
      earned: level >= t.level,
      earnedAt: null,
      source: null,
      level: t.level,
    })
  }
  return out
}

const rankOf = (c: BadgeCategory) => CATEGORY_ORDER.indexOf(c)

/**
 * Earned first (newest first; titles, which carry no date, by level
 * descending), then locked by category, then by title level.
 */
export function earnedFirst(badges: readonly ProfileBadge[]): ProfileBadge[] {
  const earned = badges.filter(b => b.earned).sort((a, b) => {
    const ta = a.earnedAt ? Date.parse(a.earnedAt) : -Infinity
    const tb = b.earnedAt ? Date.parse(b.earnedAt) : -Infinity
    if (ta !== tb) return tb - ta
    return (b.level ?? 0) - (a.level ?? 0)
  })
  const locked = badges.filter(b => !b.earned).sort((a, b) =>
    rankOf(a.category) - rankOf(b.category) || (a.level ?? 0) - (b.level ?? 0))
  return [...earned, ...locked]
}

export function filterBy(badges: readonly ProfileBadge[], category: BadgeCategory | 'all'): ProfileBadge[] {
  return category === 'all' ? [...badges] : badges.filter(b => b.category === category)
}

export function summary(badges: readonly ProfileBadge[]): { earned: number; total: number; label: string } {
  const earned = badges.filter(b => b.earned).length
  return { earned, total: badges.length, label: `${earned} / ${badges.length}` }
}

/** The Profil preview: up to n earned badges, newest first. */
export function topEarned(badges: readonly ProfileBadge[], n = 8): ProfileBadge[] {
  return earnedFirst(badges).filter(b => b.earned).slice(0, n)
}

// ── Badge art without emoji (Phase 7.5 D2) ──────────────────────────────────

export type BadgeArtKind = 'tree' | 'night' | 'time' | 'competition' | 'team' | 'xp' | 'consistency' | 'other'

/** Line icon and tint per kind (icon names resolve to Lucide icons in the UI). */
export const BADGE_ART: Record<Exclude<BadgeArtKind, 'tree'>, { icon: 'moon' | 'timer' | 'trophy' | 'users' | 'zap' | 'calendarCheck' | 'star'; tint: 'violet' | 'blue' | 'gold' | 'teal' | 'pink' | 'orange' }> = {
  night: { icon: 'moon', tint: 'violet' },
  time: { icon: 'timer', tint: 'blue' },
  competition: { icon: 'trophy', tint: 'gold' },
  team: { icon: 'users', tint: 'teal' },
  xp: { icon: 'zap', tint: 'pink' },
  consistency: { icon: 'calendarCheck', tint: 'orange' },
  other: { icon: 'star', tint: 'orange' },
}

const TIME_ACHIEVEMENTS = new Set(['focus_1h', 'focus_5h', 'focus_50h', 'focus_100h', 'deep_work_master'])
const TEAM_ACHIEVEMENTS = new Set(['first_connection', 'social_5'])

/**
 * Which picture a badge gets. Tree stages keep their tree; challenge badges
 * are sorted by words in their name (the backend has no category for them);
 * achievements by key. Pure; tested in badges.test.ts.
 */
export function badgeArtKind(b: Pick<ProfileBadge, 'category' | 'name' | 'source'>): BadgeArtKind {
  const key = b.source?.key ?? ''
  if (b.category === 'bosqich' || key.startsWith('stage_')) return 'tree'
  if (b.category === 'bellashuv') {
    const name = b.name.toLowerCase()
    if (/\b(tun|tungi|kech|kechki|night)/.test(name)) return 'night'
    if (/(jamoa|guruh|team)/.test(name)) return 'team'
    if (/(kun|seriya|ketma-ket|streak)/.test(name)) return 'consistency'
    if (/(vaqt|sprint|time|soat|daqiqa)/.test(name)) return 'time'
    return 'competition'
  }
  if (b.category === 'yutuq') {
    if (TIME_ACHIEVEMENTS.has(key)) return 'time'
    if (key.startsWith('xp_')) return 'xp'
    if (TEAM_ACHIEVEMENTS.has(key)) return 'team'
  }
  return 'other'
}
