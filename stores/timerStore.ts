/**
 * Focus timer store — unified store supporting both study.tsx (rich multi-session UI)
 * and focus-timer.tsx (simple auto-break pomodoro).
 * Time derived from Date.now() vs targetEndTime — no drift across pauses/backgrounding.
 */
import { create } from 'zustand'
import { focus } from '../lib/api'

export interface SoundTrack {
  id:       string
  name:     string
  emoji:    string
  uri:      string
  isActive: boolean
  volume:   number
}

export interface CompletionResult {
  xpAwarded:           number
  totalXp:             number
  newLevel:            number
  levelUp:             boolean
  achievements:        Array<{ id: string; name: string; description: string; xp: number }>
  challengesCompleted: Array<{ key: string; title: string; bonus_xp: number }>
  fromServer:          boolean
}

const DEFAULT_SOUNDS: SoundTrack[] = [
  { id: 'rain',   name: "Yomg'ir",    emoji: '🌧️', uri: '', isActive: false, volume: 0.6 },
  { id: 'forest', name: "O'rmon",     emoji: '🌲', uri: '', isActive: false, volume: 0.6 },
  { id: 'cafe',   name: 'Kafe',       emoji: '☕', uri: '', isActive: false, volume: 0.6 },
  { id: 'waves',  name: "To'lqinlar", emoji: '🌊', uri: '', isActive: false, volume: 0.6 },
  { id: 'white',  name: 'Oq shovqin', emoji: '💨', uri: '', isActive: false, volume: 0.6 },
  { id: 'fire',   name: 'Olov',       emoji: '🔥', uri: '', isActive: false, volume: 0.6 },
]

export type TimerStatus = 'idle' | 'active' | 'paused'
export type TimerPhase  = 'focus' | 'break'

interface TimerStore {
  // ── Config ──────────────────────────────────────────────────────────────────
  plannedMinutes: number
  totalSessions:  number
  currentSession: number

  // ── Displayed state ─────────────────────────────────────────────────────────
  phase:        TimerPhase
  status:       TimerStatus
  secondsLeft:  number       // reactive, updated by tick()
  sessionCount: number       // lifetime completed focus sessions
  lastXP:       number

  // ── Internal clock ───────────────────────────────────────────────────────────
  _targetEnd: number | null   // abs ms timestamp when current phase ends
  _pauseLeft: number          // ms remaining when paused

  // ── Ambient sounds ───────────────────────────────────────────────────────────
  sounds: SoundTrack[]

  // ── Computed helpers ─────────────────────────────────────────────────────────
  /** ms remaining in current phase (study.tsx uses this for its polling loop) */
  getRemainingMs: () => number
  /** break duration: 5 min for ≤25-min sessions, 10 min for 45/60-min sessions */
  breakSeconds:   () => number

  // ── study.tsx API (multi-session, polling, completion sheet) ─────────────────
  selectMinutes:   (m: number) => void
  selectSessions:  (n: number) => void
  start:           () => void
  pause:           () => void
  resume:          () => void
  stop:            () => void   // abandon session without XP
  reset:           () => void
  /** Advance to the next round. Returns true if all rounds are done. */
  nextRound:       () => boolean
  /** Award XP for a completed session block (total minutes may span multiple rounds). */
  completeSession: (actualMinutes: number) => Promise<CompletionResult>

  // ── Auto-break API (focus-timer.tsx) ─────────────────────────────────────────
  /** Called every second; returns true when the current phase timer hits 0. */
  tick:              () => boolean
  /** Switch to break phase automatically after a focus session ends. */
  startBreak:        () => void
  /** Start the next focus session after break ends. */
  completeBreak:     () => void
  /** Award XP using plannedMinutes (for focus-timer.tsx single-session use). */
  onSessionComplete: () => Promise<CompletionResult>

  // ── Sounds ───────────────────────────────────────────────────────────────────
  toggleSound:    (id: string) => void
  setSoundVolume: (id: string, v: number) => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  plannedMinutes: 25,
  totalSessions:  1,
  currentSession: 1,
  phase:          'focus',
  status:         'idle',
  secondsLeft:    25 * 60,
  sessionCount:   0,
  lastXP:         0,
  _targetEnd:     null,
  _pauseLeft:     0,
  sounds:         DEFAULT_SOUNDS,

  // ── Computed ─────────────────────────────────────────────────────────────────

  getRemainingMs: () => {
    const { status, _targetEnd, _pauseLeft, plannedMinutes } = get()
    if (status === 'idle')   return plannedMinutes * 60_000
    if (status === 'paused') return _pauseLeft
    if (_targetEnd)          return Math.max(0, _targetEnd - Date.now())
    return plannedMinutes * 60_000
  },

  breakSeconds: () => {
    return get().plannedMinutes <= 25 ? 5 * 60 : 10 * 60
  },

  // ── Config ───────────────────────────────────────────────────────────────────

  selectMinutes: (m) => {
    if (get().status !== 'idle') return
    set({ plannedMinutes: m, secondsLeft: m * 60 })
  },

  selectSessions: (n) => {
    if (get().status !== 'idle') return
    set({ totalSessions: Math.min(4, Math.max(1, n)), currentSession: 1 })
  },

  // ── Timer controls ───────────────────────────────────────────────────────────

  start: () => {
    const { plannedMinutes } = get()
    const secs = plannedMinutes * 60
    set({
      phase:          'focus',
      status:         'active',
      secondsLeft:    secs,
      currentSession: 1,
      _targetEnd:     Date.now() + secs * 1000,
      _pauseLeft:     0,
    })
  },

  pause: () => {
    const { _targetEnd } = get()
    const pauseLeft = _targetEnd ? Math.max(0, _targetEnd - Date.now()) : 0
    set({ status: 'paused', _targetEnd: null, _pauseLeft: pauseLeft })
  },

  resume: () => {
    const { _pauseLeft } = get()
    set({
      status:     'active',
      _targetEnd: Date.now() + _pauseLeft,
      _pauseLeft: 0,
    })
  },

  stop: () => {
    const { plannedMinutes } = get()
    set({
      status:         'idle',
      phase:          'focus',
      secondsLeft:    plannedMinutes * 60,
      currentSession: 1,
      _targetEnd:     null,
      _pauseLeft:     0,
    })
  },

  reset: () => {
    const { plannedMinutes } = get()
    set({
      status:         'idle',
      phase:          'focus',
      secondsLeft:    plannedMinutes * 60,
      currentSession: 1,
      _targetEnd:     null,
      _pauseLeft:     0,
    })
  },

  // ── Multi-session (study.tsx) ────────────────────────────────────────────────

  nextRound: () => {
    const { currentSession, totalSessions, plannedMinutes } = get()
    if (currentSession >= totalSessions) return true

    const secs = plannedMinutes * 60
    const next = currentSession + 1
    set({
      currentSession: next,
      phase:          'focus',
      status:         'active',
      secondsLeft:    secs,
      _targetEnd:     Date.now() + secs * 1000,
      _pauseLeft:     0,
    })
    return false
  },

  completeSession: async (actualMinutes) => {
    set(s => ({ sessionCount: s.sessionCount + 1 }))
    try {
      const res = await focus.complete(actualMinutes)
      const xp  = res.xp_awarded
      set({ lastXP: xp })
      return {
        xpAwarded:           xp,
        totalXp:             res.total_xp,
        newLevel:            res.level,
        levelUp:             res.level_up,
        achievements:        (res as any).achievements_earned    ?? [],
        challengesCompleted: (res as any).challenges_completed   ?? [],
        fromServer:          true,
      }
    } catch {
      const xp = Math.round(actualMinutes)
      set({ lastXP: xp })
      return {
        xpAwarded: xp, totalXp: 0, newLevel: 1, levelUp: false,
        achievements: [], challengesCompleted: [], fromServer: false,
      }
    }
  },

  // ── Auto-break (focus-timer.tsx / study.tsx) ─────────────────────────────────

  tick: () => {
    const { _targetEnd } = get()
    if (!_targetEnd) return false
    const newSecs = Math.max(0, Math.ceil((_targetEnd - Date.now()) / 1000))
    if (newSecs !== get().secondsLeft) set({ secondsLeft: newSecs })
    if (newSecs === 0) {
      set({ status: 'idle', _targetEnd: null })
      return true
    }
    return false
  },

  startBreak: () => {
    const secs = get().breakSeconds()
    set({
      phase:       'break',
      status:      'active',
      secondsLeft: secs,
      _targetEnd:  Date.now() + secs * 1000,
      _pauseLeft:  0,
    })
  },

  completeBreak: () => {
    const { plannedMinutes } = get()
    const secs = plannedMinutes * 60
    set({
      phase:       'focus',
      status:      'active',
      secondsLeft: secs,
      _targetEnd:  Date.now() + secs * 1000,
      _pauseLeft:  0,
    })
  },

  onSessionComplete: async () => {
    const { plannedMinutes } = get()
    return get().completeSession(plannedMinutes)
  },

  // ── Sounds ───────────────────────────────────────────────────────────────────

  toggleSound: (id) => {
    set(s => ({
      sounds: s.sounds.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t),
    }))
  },

  setSoundVolume: (id, v) => {
    set(s => ({
      sounds: s.sounds.map(t => t.id === id ? { ...t, volume: v } : t),
    }))
  },
}))
