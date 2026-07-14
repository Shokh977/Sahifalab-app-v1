// lib/badges.ts — Trofey Xonasi (step-24) badge display helpers.
// The backend never sends icon art (icon_url is always null — badges are
// drawn locally, same convention as level emoji in levelTitles.ts). This
// file is the single place badge_key/tier → emoji/color mapping lives.

const STAGE_EMOJI: Record<string, string> = {
  stage_1: '🌰', stage_2: '🌱', stage_3: '🌿', stage_4: '🌳', stage_5: '🌸',
  stage_6: '✨', stage_7: '🦋', stage_8: '📜', stage_9: '☁️', stage_10: '🌟',
}

const ACH_EMOJI: Record<string, string> = {
  first_lesson: '📖', course_graduate: '🎓', three_courses: '📗', five_courses: '📘', ten_courses: '📚',
  focus_1h: '⏱️', focus_5h: '⏳', deep_work_master: '🧠', focus_50h: '🔬', focus_100h: '🏆',
  xp_100: '⚡', xp_1000: '💫', xp_5000: '🌠', xp_10000: '☄️',
  first_connection: '🤝', social_5: '👥',
  popular_creator: '🎴',
}

export function getBadgeEmoji(key: string): string {
  if (key.startsWith('stage_')) return STAGE_EMOJI[key] ?? '🌳'
  return ACH_EMOJI[key] ?? '🏅'
}

const TIER_COLORS: Record<string, string> = {
  bronze:   '#cd7f32',
  silver:   '#c0c0c0',
  gold:     '#FFD700',
  platinum: '#a78bfa',
  diamond:  '#60a5fa',
  legend:   '#f472b6',
}

export function getTierColor(tier: string | null | undefined): string {
  return (tier && TIER_COLORS[tier]) || '#F5A623'
}

const TIER_RANK: Record<string, number> = {
  legend: 6, diamond: 5, platinum: 4, gold: 3, silver: 2, bronze: 1,
}

export function isStageBadge(key: string): boolean {
  return key.startsWith('stage_')
}

export function stageNum(key: string): number {
  return parseInt(key.replace('stage_', ''), 10) || 0
}

/**
 * Picks the header-row badges (step-24 Part 4): challenge badges first,
 * then the highest tree stage, then the "rarest" other achievement (proxied
 * by tier, since true earn-rate rarity isn't cheap to compute per profile
 * view — see badge_service.get_top_badges_map's docstring for the same
 * tradeoff on the backend side).
 */
export function pickTopBadges(
  groups: { challenges: import('./api').Badge[]; stages: import('./api').Badge[]; achievements: import('./api').Badge[] },
  max = 4,
): { shown: import('./api').Badge[]; remaining: number } {
  const challenges = groups.challenges.filter(b => b.earned)
  const stages = groups.stages.filter(b => b.earned).sort((a, b) => stageNum(b.key) - stageNum(a.key))
  const achievements = groups.achievements.filter(b => b.earned)
    .sort((a, b) => (TIER_RANK[b.tier ?? ''] ?? 0) - (TIER_RANK[a.tier ?? ''] ?? 0))
  const ordered = [...challenges, ...stages, ...achievements]
  return { shown: ordered.slice(0, max), remaining: Math.max(0, ordered.length - max) }
}
