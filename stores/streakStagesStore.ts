import { create } from 'zustand'
import { focusStages, type StreakStage } from '../lib/api'
import { applyServerStages } from '../lib/treeTheme'

// Fetches the 10 canonical stage definitions + this user's live progress from
// the server (single source of truth — see migrations/072_streak_stages_
// consolidation.sql). Also pushes thresholds/names/XP into lib/treeTheme.ts's
// TREE_STAGES in place, so every existing screen that reads TREE_STAGES or
// calls stageFromStreak() picks up server values automatically.
//
// Until this has loaded (first paint, or fully offline), TREE_STAGES' own
// hardcoded fallback values are used — that fallback must stay byte-identical
// to the server seed (see the divergence warnings logged in __DEV__ by
// applyServerStages()).

interface StreakStagesState {
  stages:      StreakStage[]   // [] until first successful fetch
  loaded:      boolean
  loading:     boolean
  fetchStages: () => Promise<void>
  getStage:    (stageNumber: number) => StreakStage | null
}

export const useStreakStagesStore = create<StreakStagesState>((set, get) => ({
  stages:  [],
  loaded:  false,
  loading: false,

  fetchStages: async () => {
    if (get().loading || get().loaded) return
    set({ loading: true })
    try {
      const stages = await focusStages.stages()
      if (stages.length > 0) {
        applyServerStages(stages)
        set({ stages, loaded: true })
      }
    } catch {
      // offline / first-load failure — TREE_STAGES fallback stays in effect
    } finally {
      set({ loading: false })
    }
  },

  getStage: (stageNumber) => get().stages.find(s => s.stage_number === stageNumber) ?? null,
}))
