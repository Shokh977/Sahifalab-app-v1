/**
 * rewardStore.ts — tanga-economy-rework (092) Part 5 reward-modal queue.
 *
 * "Every Tanga reward must surface in a modal. Nothing is awarded silently."
 * The server decides what's pending (GET /api/rewards/pending); this store
 * only holds and displays it. check() is called from three trigger points
 * only — app foreground, after a study session completes, after a daily-quiz
 * submission — never on a blind interval, so an active timer is never
 * interrupted (spec: "Never interrupt an active timer. Queue and show when
 * the session ends.").
 *
 * Multiple pending rewards collapse into ONE modal (the component reads
 * `pending` as a whole array) rather than showing one modal per reward in a
 * row. Acknowledge only fires after the modal is actually dismissed, so a
 * crash mid-display re-shows the same rewards next check instead of losing
 * them (they stay unacknowledged server-side until then).
 */
import { create } from 'zustand'
import { rewards, type RewardItem } from '../lib/api'

interface RewardState {
  pending:  RewardItem[]
  visible:  boolean
  checking: boolean
  check:    () => Promise<void>
  dismiss:  () => Promise<void>
}

export const useRewardStore = create<RewardState>((set, get) => ({
  pending:  [],
  visible:  false,
  checking: false,

  check: async () => {
    // Don't stack a second fetch on top of one already in flight, and never
    // replace an already-visible modal's list out from under the user mid-read.
    if (get().checking || get().visible) return
    set({ checking: true })
    try {
      const res = await rewards.pending()
      if (res.rewards.length > 0) {
        set({ pending: res.rewards, visible: true })
      }
    } finally {
      set({ checking: false })
    }
  },

  dismiss: async () => {
    const ids = get().pending.map(r => r.id)
    set({ visible: false })
    if (ids.length > 0) {
      try { await rewards.acknowledge(ids) } catch {}
    }
    // Cleared only after the acknowledge attempt — if it fails, the same
    // rewards simply reappear (unacknowledged server-side) on the next
    // check() rather than being silently dropped client-side.
    set({ pending: [] })
  },
}))
