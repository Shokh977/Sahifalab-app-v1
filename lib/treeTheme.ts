/* ============================================================
   Sahifalab — Tree Design Tokens
   Mirrors tokens.css exactly — keep CSS variable names traceable.
   ============================================================ */

// ── Brand accents (theme-independent) ────────────────────────────────────────
// --brand / --brand-soft / --magic / --gold / --gold-soft / --blossom / --violet
export const treeColors = {
  brand:      '#46c08a',
  brandSoft:  '#6fd6a8',
  magic:      '#58b6ff',
  gold:       '#f0b53f',
  goldSoft:   '#ffd47a',
  blossom:    '#ff8fc0',
  violet:     '#9d7bff',
} as const

// ── Radius ────────────────────────────────────────────────────────────────────
// --r-xs / --r-sm / --r-md / --r-lg / --r-xl
export const treeRadius = { xs: 8, sm: 12, md: 18, lg: 26, xl: 36 } as const

// ── App sky moods (inside phone screens) ─────────────────────────────────────
// mirrors [data-mood="night|dusk|day"] block in tokens.css
export const skyMoods = {
  night: {
    skyTop:  '#0f1b30',
    skyMid:  '#1b3056',
    skyBot:  '#2c4a76',
    skyGlow: '#ffe9b8',
    skyHaze: 'rgba(143,212,255,0.16)',
    skyInk:  '#eaf3ff',
    skyInk2: '#adc4e6',
    orb:     '#fff2cf',
    orbRing: 'rgba(255,233,184,0.30)',
  },
  dusk: {
    skyTop:  '#2a1d3e',
    skyMid:  '#6b3b63',
    skyBot:  '#c66b66',
    skyGlow: '#ffd2a0',
    skyHaze: 'rgba(255,196,150,0.18)',
    skyInk:  '#fdeaf2',
    skyInk2: '#e7b9c8',
    orb:     '#ffd9a8',
    orbRing: 'rgba(255,200,150,0.34)',
  },
  day: {
    skyTop:  '#8ec9ff',
    skyMid:  '#bfe3ff',
    skyBot:  '#e9f6ff',
    skyGlow: '#fff3c0',
    skyHaze: 'rgba(255,255,255,0.5)',
    skyInk:  '#173049',
    skyInk2: '#4a6886',
    orb:     '#fff6d8',
    orbRing: 'rgba(255,240,180,0.55)',
  },
} as const

// ── Doc chrome themes ─────────────────────────────────────────────────────────
// mirrors :root[data-theme="dark|light"] in tokens.css
export const docThemes = {
  dark: {
    bg:    '#0a1120',
    bg2:   '#0f1a2e',
    bg3:   '#15243d',
    bg4:   '#1c2f4d',
    line:  'rgba(150,180,225,0.12)',
    line2: 'rgba(150,180,225,0.20)',
    ink:   '#eaf1ff',
    ink2:  '#9fb2cf',
    ink3:  '#64789a',
  },
  light: {
    bg:    '#eef3fb',
    bg2:   '#ffffff',
    bg3:   '#f4f8ff',
    bg4:   '#e9f1fc',
    line:  'rgba(28,52,92,0.12)',
    line2: 'rgba(28,52,92,0.20)',
    ink:   '#14233c',
    ink2:  '#46597a',
    ink3:  '#8094b4',
  },
} as const

// ── Per-stage palettes (mirrors PAL in trees.js) ──────────────────────────────
export const stagePalettes = {
  1:  { base:'#6b4a2e', mid:'#86603c', hi:'#a87b4e', rim:'#caa06a', accent:'#ffd98a', glow:'#ffcf7a' },
  2:  { base:'#3f8f5b', mid:'#57b46f', hi:'#86d98c', rim:'#b6f0ad', accent:'#d8ffc4', glow:'#aef0a0' },
  3:  { base:'#358a55', mid:'#4fae67', hi:'#7fd483', rim:'#aeeaa0', accent:'#d2ffbf', glow:'#9fe89a' },
  4:  { base:'#2e8050', mid:'#46a262', hi:'#74cb7c', rim:'#a3e398', accent:'#cdf7bb', glow:'#92e08f' },
  5:  { base:'#2a8052', mid:'#41a266', hi:'#6fcb80', rim:'#9fe39c', accent:'#ffd0e6', glow:'#ffe39a' },
  6:  { base:'#1f7d68', mid:'#33a487', hi:'#5fd6b6', rim:'#9bf0dc', accent:'#9fe0ff', glow:'#8fe6ff' },
  7:  { base:'#2d8a5e', mid:'#46ad72', hi:'#74d493', rim:'#a6e8b6', accent:'#ff9ecb', glow:'#ffc6e4' },
  8:  { base:'#266b4e', mid:'#3f9468', hi:'#cdd99a', rim:'#ffe39a', accent:'#ffcf6a', glow:'#ffd97a' },
  9:  { base:'#1f7a72', mid:'#2fa39a', hi:'#69d8d0', rim:'#b9a8ff', accent:'#b89dff', glow:'#9fd4ff' },
  10: { base:'#1d7a64', mid:'#2fa07f', hi:'#ffe08a', rim:'#bfe6ff', accent:'#ffd86a', glow:'#9fdcff' },
} as const

export type SkyMood    = keyof typeof skyMoods
export type TreeState  = 'alive' | 'frozen' | 'dead'
export type TreeSize   = 'hero' | 'card' | 'thumb' | 'badge' | 'micro'
export type StageNumber = 1|2|3|4|5|6|7|8|9|10
export type StagePalette = { base: string; mid: string; hi: string; rim: string; accent: string; glow: string }

// ── Stage metadata (mirrors STAGES in trees.js) ───────────────────────────────
// These are the offline/cold-start fallback values — identical to the
// canonical seed in migrations/072_streak_stages_consolidation.sql. The
// SERVER is the source of truth for thresholds/names/XP once fetched (see
// applyServerStages() below); these hardcoded values only matter before that
// fetch resolves (first paint, or fully offline). `bonusXp` starts null and
// is filled in once the server stage list has loaded.
export const TREE_STAGES = [
  { id:1  as StageNumber, name:"O'zgarish urug'i",    short:"Urug'",       days:'1-kun',   blurb:"Issiq, sehrli tuproqda yorqin urug' yotadi.",       streakDays:0,   bonusXp: null as number | null },
  { id:2  as StageNumber, name:"Kichik ko'chat",       short:"Ko'chat",     days:'3-kun',   blurb:'Birinchi yashil novdalar nurga intiladi.',           streakDays:3,   bonusXp: null as number | null },
  { id:3  as StageNumber, name:'Yosh nihol',           short:'Nihol',       days:'7-kun',   blurb:"Nozik poya va birinchi barglar paydo bo'ladi.",      streakDays:7,   bonusXp: null as number | null },
  { id:4  as StageNumber, name:"O'suvchi daraxt",      short:"O'suvchi",    days:'14-kun',  blurb:'Haqiqiy tana, shoxlar va yosh toj.',                 streakDays:14,  bonusXp: null as number | null },
  { id:5  as StageNumber, name:'Gullayotgan daraxt',   short:'Gullayotgan', days:'30-kun',  blurb:'Yashil barglar orasida maysalarda kichik gullar.',   streakDays:30,  bonusXp: null as number | null },
  { id:6  as StageNumber, name:'Sehrli daraxt',        short:'Sehrli',      days:'50-kun',  blurb:"Barglar porlaydi; muloyim ko'k nur uyg'onadi.",      streakDays:50,  bonusXp: null as number | null },
  { id:7  as StageNumber, name:'Gullab-yashnagan',     short:'Yashnagan',   days:'75-kun',  blurb:'Gullar ochiladi va kapalaklar tashrif buyuradi.',    streakDays:75,  bonusXp: null as number | null },
  { id:8  as StageNumber, name:'Qadimiy bilim',        short:'Qadimiy',     days:'120-kun', blurb:'Oltin barglar va xotiradagi sehrli belgilar.',       streakDays:120, bonusXp: null as number | null },
  { id:9  as StageNumber, name:'Samoviy daraxt',       short:'Samoviy',     days:'200-kun', blurb:"Suzuvchi nurlar osmon tojini o'rab turadi.",         streakDays:200, bonusXp: null as number | null },
  { id:10 as StageNumber, name:'Abadiy dunyo daraxti', short:'Abadiy',      days:'365-kun', blurb:'Afsonaviy dunyo daraxti — porloq va abadiy.',        streakDays:365, bonusXp: null as number | null },
]

// The canonical, hardcoded fallback day-thresholds — used only for the
// divergence check below (so the check still works after TREE_STAGES itself
// has been overwritten with server values).
const FALLBACK_STREAK_DAYS: Record<StageNumber, number> = {
  1: 0, 2: 3, 3: 7, 4: 14, 5: 30, 6: 50, 7: 75, 8: 120, 9: 200, 10: 365,
}
const FALLBACK_NAMES: Record<StageNumber, string> = {
  1: "O'zgarish urug'i", 2: "Kichik ko'chat", 3: 'Yosh nihol', 4: "O'suvchi daraxt",
  5: 'Gullayotgan daraxt', 6: 'Sehrli daraxt', 7: 'Gullab-yashnagan', 8: 'Qadimiy bilim',
  9: 'Samoviy daraxt', 10: 'Abadiy dunyo daraxti',
}

export interface ServerStageDef {
  stage_number: number
  title: string
  description: string
  required_days: number
  bonus_xp: number
}

/**
 * Overwrites TREE_STAGES in place with server-provided thresholds/names/XP
 * (fetched from GET /api/focus/stages, see stores/streakStagesStore.ts).
 * TREE_STAGES stays a `const` binding — only its elements' properties are
 * mutated — so every existing call site that reads TREE_STAGES[i] or calls
 * stageFromStreak() picks up the server values automatically with no changes
 * needed at the call site.
 *
 * Stage 1 is a deliberate exception: the server's required_days for stage 1
 * is 1 (the award threshold — a zero-streak user must not receive stage-1
 * XP), but the client's VISUAL threshold for showing the stage-1 tree stays
 * 0 (a brand-new user's tree renders as a seed immediately). Do not "fix"
 * this into matching — see migration 072's comment block for the full
 * reasoning.
 */
export function applyServerStages(serverStages: ServerStageDef[]): void {
  for (const s of serverStages) {
    const idx = TREE_STAGES.findIndex(t => t.id === s.stage_number)
    if (idx === -1) continue
    const local = TREE_STAGES[idx]

    if (__DEV__) {
      const expectedDays = s.stage_number === 1 ? 0 : FALLBACK_STREAK_DAYS[s.stage_number as StageNumber]
      if (expectedDays !== undefined && s.stage_number !== 1 && s.required_days !== expectedDays) {
        console.warn(
          `[treeTheme] DIVERGENCE stage_${s.stage_number}: client fallback streakDays=${expectedDays} vs server required_days=${s.required_days}`,
        )
      }
      const expectedName = FALLBACK_NAMES[s.stage_number as StageNumber]
      if (expectedName && s.title !== expectedName) {
        console.warn(
          `[treeTheme] DIVERGENCE stage_${s.stage_number}: client fallback name="${expectedName}" vs server title="${s.title}"`,
        )
      }
    }

    TREE_STAGES[idx] = {
      ...local,
      name:       s.title,
      blurb:      s.description || local.blurb,
      days:       `${s.required_days}-kun`,
      // Stage 1 keeps its visual threshold at 0 even though the server's
      // award threshold is 1 — see function doc comment.
      streakDays: s.stage_number === 1 ? 0 : s.required_days,
      bonusXp:    s.bonus_xp,
    }
  }
}

// ── Streak → stage mapping (replaces old treeStageFromStreak with 10 stages) ──
// Reads TREE_STAGES directly (sorted by streakDays descending) so it always
// reflects whichever values are currently active — hardcoded fallback until
// applyServerStages() has run, server values after.
export function stageFromStreak(streak: number): StageNumber {
  const sorted = [...TREE_STAGES].sort((a, b) => b.streakDays - a.streakDays)
  for (const s of sorted) {
    if (streak >= s.streakDays) return s.id
  }
  return 1
}
