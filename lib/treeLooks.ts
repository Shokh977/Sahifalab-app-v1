/* ============================================================
   Sahifalab — MagicTree colour looks (Claude Design "rang
   ko'rinishlari"). A look changes only colours, never the shape:
   per stage the 6 canopy colours, plus trunk, soil, blossom,
   gold-leaf and sparkle colours. "tabiiy" is today's tree.
   ============================================================ */
import { stagePalettes, type StageNumber, type StagePalette } from './treeTheme'

export type TreeLook = 'tabiiy' | 'sakura' | 'kumush' | 'oltin'

export interface TreeLookColors {
  trunk: readonly [string, string, string]
  soil: readonly [string, string]
  blossomPetal: string
  blossomCenter: string
  goldLeaf: string
  sparkle: string
}

const LOOK_STAGES: Record<Exclude<TreeLook, 'tabiiy'>, readonly StagePalette[]> = {
  sakura: [
    { base: '#6e4a40', mid: '#8b6052', hi: '#ae7f70', rim: '#d3a698', accent: '#ffd6e4', glow: '#ffc9dc' },
    { base: '#b45f7c', mid: '#d3889f', hi: '#eeb5c4', rim: '#fad8e1', accent: '#fff0f5', glow: '#ffd3e1' },
    { base: '#ad5876', mid: '#cd7f99', hi: '#ebaebf', rim: '#f8d3dd', accent: '#fff0f5', glow: '#ffcfdf' },
    { base: '#a65270', mid: '#c77793', hi: '#e8a8ba', rim: '#f6ced9', accent: '#ffeef3', glow: '#ffcadb' },
    { base: '#a24d6c', mid: '#c5728f', hi: '#e8a5b8', rim: '#f8d1dc', accent: '#ffffff', glow: '#ffd7e3' },
    { base: '#93415f', mid: '#bd6487', hi: '#eda9c0', rim: '#ffdbe9', accent: '#f3c8ff', glow: '#f7c4e6' },
    { base: '#9c4767', mid: '#c46c8d', hi: '#f0b3c6', rim: '#ffe2ec', accent: '#ffffff', glow: '#ffc6da' },
    { base: '#8b3b5a', mid: '#b45d7e', hi: '#f6d8c8', rim: '#ffe9cf', accent: '#ffd8a6', glow: '#ffd6c8' },
    { base: '#823860', mid: '#ab5888', hi: '#edb8da', rim: '#dccaff', accent: '#cfb8ff', glow: '#ebceff' },
    { base: '#873a5e', mid: '#b25c82', hi: '#ffe6ee', rim: '#fff3da', accent: '#ffd98e', glow: '#ffd0df' },
  ],
  kumush: [
    { base: '#5d6472', mid: '#7a8291', hi: '#a2aab8', rim: '#c9d0dc', accent: '#e9f1ff', glow: '#d3e2fb' },
    { base: '#6c7b93', mid: '#8d9bb1', hi: '#b8c4d4', rim: '#dde5ef', accent: '#f4f8ff', glow: '#d9e5f6' },
    { base: '#67768f', mid: '#8896ad', hi: '#b3bfd0', rim: '#d9e2ed', accent: '#f4f8ff', glow: '#d5e3f6' },
    { base: '#62728c', mid: '#8392aa', hi: '#aebccd', rim: '#d6dfeb', accent: '#eff5ff', glow: '#d1e0f4' },
    { base: '#5e6f8a', mid: '#8090a9', hi: '#acbacd', rim: '#d5dfec', accent: '#ffffff', glow: '#dae6f7' },
    { base: '#52688a', mid: '#7790b3', hi: '#aec6e4', rim: '#dcefff', accent: '#c4eaff', glow: '#bddcfd' },
    { base: '#5a6b88', mid: '#7d8eaa', hi: '#b2c1d6', rim: '#e0e9f4', accent: '#f6f9ff', glow: '#d2ddee' },
    { base: '#4f6080', mid: '#7385a3', hi: '#dde3eb', rim: '#f4f7fa', accent: '#eaf0f7', glow: '#dce5f0' },
    { base: '#4a5d82', mid: '#6d82a8', hi: '#c0d0ec', rim: '#cdc6ff', accent: '#c9bdff', glow: '#c8d8fc' },
    { base: '#4d5f83', mid: '#7286a9', hi: '#f1f4f9', rim: '#ffffff', accent: '#e2f3ff', glow: '#c6defc' },
  ],
  oltin: [
    { base: '#6e4c24', mid: '#8c6532', hi: '#b48a4c', rim: '#d9b472', accent: '#ffe6ae', glow: '#ffd98e' },
    { base: '#946a22', mid: '#c29a42', hi: '#e2c46e', rim: '#f2dc9c', accent: '#fff3d0', glow: '#ffe7b0' },
    { base: '#8e6420', mid: '#bd943e', hi: '#dfbf68', rim: '#f0d998', accent: '#fff2cc', glow: '#ffe3a8' },
    { base: '#885e1c', mid: '#b88e3a', hi: '#dcba62', rim: '#eed694', accent: '#fff0c6', glow: '#ffe0a0' },
    { base: '#845a1a', mid: '#b58a37', hi: '#dbb862', rim: '#efd798', accent: '#fff7e2', glow: '#ffe6b0' },
    { base: '#7b5016', mid: '#ae8233', hi: '#e8c875', rim: '#fcefc2', accent: '#fff4cc', glow: '#ffd987' },
    { base: '#805418', mid: '#b38735', hi: '#e4c26e', rim: '#f8e6b0', accent: '#fff6e0', glow: '#ffdf9e' },
    { base: '#744912', mid: '#a97c2e', hi: '#f1d98c', rim: '#fdf2cc', accent: '#ffe7a8', glow: '#ffd47e' },
    { base: '#6c430f', mid: '#a1752a', hi: '#f4df9c', rim: '#ffe8d2', accent: '#ffedc0', glow: '#ffcf74' },
    { base: '#69400d', mid: '#a07228', hi: '#fbefc6', rim: '#fffaf0', accent: '#ffe39a', glow: '#ffcc6a' },
  ],
}

const LOOK_COLORS: Record<TreeLook, TreeLookColors> = {
  tabiiy: {
    trunk: ['#9a7250', '#6f4f36', '#533a27'], soil: ['#5a4632', '#2f2419'],
    blossomPetal: '#ff9ecb', blossomCenter: '#fff0f6', goldLeaf: '#ffd86a', sparkle: '#ffe6a0',
  },
  sakura: {
    trunk: ['#958076', '#6e5a52', '#4f3f3a'], soil: ['#5a4844', '#2e2423'],
    blossomPetal: '#ffe1ec', blossomCenter: '#fffafc', goldLeaf: '#f7d9b0', sparkle: '#fff0f6',
  },
  kumush: {
    trunk: ['#8c929e', '#646b79', '#474d59'], soil: ['#4f5562', '#262a33'],
    blossomPetal: '#f2f7ff', blossomCenter: '#ffffff', goldLeaf: '#e4ecf6', sparkle: '#f2f9ff',
  },
  oltin: {
    trunk: ['#6b5238', '#4a3825', '#2e2317'], soil: ['#4a3a28', '#231a10'],
    blossomPetal: '#fff6e4', blossomCenter: '#ffffff', goldLeaf: '#fff0c2', sparkle: '#fff3cf',
  },
}

export function treeLookPalette(look: TreeLook, stage: StageNumber): StagePalette {
  return look === 'tabiiy' ? stagePalettes[stage] : LOOK_STAGES[look][stage - 1]
}

export function treeLookColors(look: TreeLook): TreeLookColors {
  return LOOK_COLORS[look]
}
