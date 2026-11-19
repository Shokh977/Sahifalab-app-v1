/**
 * Fokus rejimi (focus mode): the app hides every tab but the ones the user
 * keeps (Fokus always; Bellashuv by default) until they turn it off.
 *
 * Pro feature with one free trial. The trial (design notes, "Bepul sinov"):
 * it starts when a free user turns the mode on and lasts 24 h; turning it
 * off in the first 10 minutes doesn't spend it, so someone who was only
 * curious keeps their try.
 *
 * Kept on this device (AsyncStorage), like the theme choice.
 */
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

/** Tab route names, as in app/(tabs)/_layout.tsx. */
export type FocusTab = 'index' | 'study' | 'courses' | 'flashcards' | 'musobaqalar'

export const ALL_TABS: FocusTab[] = ['index', 'study', 'courses', 'flashcards', 'musobaqalar']
export const PRESET: FocusTab[] = ['study', 'musobaqalar']
export const MIN_TABS = 2
export const MAX_TABS = 4

export const TRIAL_MS = 24 * 60 * 60 * 1000
/** Turning off before this doesn't spend the free trial. */
export const TRIAL_GRACE_MS = 10 * 60 * 1000

const KEY = 'sahifalab_focus_mode_v1'

export type FocusAccess =
  | 'pro'          // Pro: everything
  | 'free'         // free, trial not tried yet
  | 'trialActive'  // free, trial running now
  | 'trialUsed'    // free, trial spent: upsell

/** A hidden section someone tried to open (link, notification). */
export interface BlockedTarget { route: string; section: FocusTab }

interface Persisted {
  on: boolean
  keep: FocusTab[]
  introSeen: boolean
  /** When the mode was last turned on (ms), null while off. */
  onSince: number | null
  /** Time spent in the mode today, before onSince. */
  day: string
  dayMs: number
  trialStartedAt: number | null
  trialUsed: boolean
}

interface FocusModeState extends Persisted {
  loaded: boolean
  /** The hidden section a link or notification asked for (global sheet). */
  blocked: BlockedTarget | null
  /** A hidden tab opened once anyway ("Baribir ochish"). */
  allowOnce: FocusTab | null

  load: () => Promise<void>
  /** Turn on with these tabs (Fokus is always added). `trial` starts the free try. */
  enable: (keep?: FocusTab[], opts?: { trial?: boolean }) => void
  /** Turn off. Returns what was on, for "Qaytarish". */
  disable: () => { keep: FocusTab[]; trial: boolean } | null
  setKeep: (keep: FocusTab[]) => void
  markIntroSeen: () => void
  /** Free user whose Pro / trial ran out while the mode was on. */
  enforce: (isPro: boolean, now?: number) => void
  setBlocked: (b: BlockedTarget | null) => void
  setAllowOnce: (t: FocusTab | null) => void
}

const today = (now = Date.now()) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Tabs to keep, valid and ordered as in the bar, Fokus always in. */
export function normaliseKeep(keep: readonly string[]): FocusTab[] {
  const set = new Set<string>(keep)
  set.add('study')
  const out = ALL_TABS.filter(t => set.has(t))
  return out.length >= MIN_TABS && out.length <= MAX_TABS ? out : PRESET
}

export function focusAccess(s: Pick<Persisted, 'trialStartedAt' | 'trialUsed'>, isPro: boolean, now = Date.now()): FocusAccess {
  if (isPro) return 'pro'
  if (s.trialUsed) return 'trialUsed'
  if (s.trialStartedAt != null) return now - s.trialStartedAt < TRIAL_MS ? 'trialActive' : 'trialUsed'
  return 'free'
}

/** Milliseconds spent in the mode today (running total). */
export function todayMs(s: Pick<Persisted, 'on' | 'onSince' | 'day' | 'dayMs'>, now = Date.now()): number {
  const base = s.day === today(now) ? s.dayMs : 0
  if (!s.on || s.onSince == null) return base
  // A session that started yesterday counts from midnight.
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0)
  return base + (now - Math.max(s.onSince, midnight.getTime()))
}

const persisted = (s: FocusModeState): Persisted => ({
  on: s.on, keep: s.keep, introSeen: s.introSeen, onSince: s.onSince, day: s.day, dayMs: s.dayMs,
  trialStartedAt: s.trialStartedAt, trialUsed: s.trialUsed,
})

export const useFocusModeStore = create<FocusModeState>((set, get) => {
  const save = () => { AsyncStorage.setItem(KEY, JSON.stringify(persisted(get()))).catch(() => {}) }

  /** Close the running stretch into today's total. */
  const closeStretch = (now: number) => {
    const s = get()
    return { day: today(now), dayMs: todayMs(s, now), onSince: null }
  }

  return {
    on: false,
    keep: PRESET,
    introSeen: false,
    onSince: null,
    day: today(),
    dayMs: 0,
    trialStartedAt: null,
    trialUsed: false,
    loaded: false,
    blocked: null,
    allowOnce: null,

    load: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY)
        if (raw) {
          const p = JSON.parse(raw) as Partial<Persisted>
          set({
            on: !!p.on,
            keep: normaliseKeep(p.keep ?? PRESET),
            introSeen: !!p.introSeen,
            onSince: p.on ? (p.onSince ?? Date.now()) : null,
            day: p.day ?? today(),
            dayMs: p.dayMs ?? 0,
            trialStartedAt: p.trialStartedAt ?? null,
            trialUsed: !!p.trialUsed,
          })
        }
      } catch {}
      set({ loaded: true })
    },

    enable: (keep, opts) => {
      const now = Date.now()
      const s = get()
      set({
        on: true,
        keep: normaliseKeep(keep ?? s.keep),
        onSince: now,
        day: today(now),
        dayMs: todayMs({ ...s, on: false }, now),
        ...(opts?.trial && s.trialStartedAt == null ? { trialStartedAt: now } : {}),
      })
      save()
    },

    disable: () => {
      const s = get()
      if (!s.on) return null
      const now = Date.now()
      const inTrial = s.trialStartedAt != null && !s.trialUsed
      const trialPatch = inTrial
        ? now - s.trialStartedAt! < TRIAL_GRACE_MS
          ? { trialStartedAt: null }   // only curious: keep the try
          : { trialUsed: true }
        : {}
      set({ on: false, allowOnce: null, ...closeStretch(now), ...trialPatch })
      save()
      return { keep: s.keep, trial: inTrial }
    },

    setKeep: keep => { set({ keep: normaliseKeep(keep) }); save() },
    markIntroSeen: () => { set({ introSeen: true }); save() },

    enforce: (isPro, now = Date.now()) => {
      const s = get()
      if (!s.on) {
        if (!s.trialUsed && s.trialStartedAt != null && now - s.trialStartedAt >= TRIAL_MS) { set({ trialUsed: true }); save() }
        return
      }
      const access = focusAccess(s, isPro, now)
      if (access === 'pro' || access === 'trialActive') return
      set({ on: false, allowOnce: null, ...closeStretch(now), trialUsed: s.trialStartedAt != null || s.trialUsed })
      save()
    },

    setBlocked: blocked => set({ blocked }),
    setAllowOnce: allowOnce => set({ allowOnce }),
  }
})

// ── Routes → the section they belong to ──────────────────────────────────────

const SECTION_PREFIXES: [string, FocusTab][] = [
  ['/(tabs)/courses', 'courses'], ['/(screens)/course', 'courses'], ['/(screens)/courses', 'courses'],
  ['/(screens)/lesson', 'courses'], ['/(screens)/test', 'courses'], ['/(screens)/certificate', 'courses'],
  ['/(screens)/purchase', 'courses'], ['/(screens)/payment-complete', 'courses'],
  ['/(tabs)/flashcards', 'flashcards'], ['/(screens)/flashcard-deck', 'flashcards'], ['/(screens)/flashcard-study', 'flashcards'],
  ['/(screens)/public-deck', 'flashcards'], ['/(screens)/ai-flashcard-generate', 'flashcards'],
  ['/(tabs)/musobaqalar', 'musobaqalar'], ['/(screens)/challenge', 'musobaqalar'], ['/(screens)/daily-quiz', 'musobaqalar'],
  ['/(screens)/leaderboard', 'musobaqalar'],
  ['/(tabs)/study', 'study'], ['/(screens)/focus-timer', 'study'],
  ['/(tabs)/index', 'index'],
]

/** The tab section a route belongs to; null = not part of any (Profil, Sozlamalar, Pro…). */
export function sectionOf(route: string): FocusTab | null {
  const r = route.split('?')[0].replace(/\/+$/, '')
  if (r === '/(tabs)' || r === '' || r === '/') return 'index'
  for (const [prefix, tab] of SECTION_PREFIXES) {
    if (r === prefix || r.startsWith(prefix + '/') || r.startsWith(prefix + '-')) {
      // '/(screens)/daily-quiz-results' is daily-quiz's; 'course' must not catch 'courses' twice
      return tab
    }
  }
  return null
}

/** The hidden section this route belongs to while the mode is on, else null. */
export function hiddenSectionOf(route: string): FocusTab | null {
  const s = useFocusModeStore.getState()
  if (!s.on) return null
  const section = sectionOf(route)
  return section && !s.keep.includes(section) ? section : null
}

/**
 * Open a route that came from outside the screen (link, notification): a
 * hidden section asks first (FocusBlockedSheet), anything else opens.
 */
export function openGuarded(route: string, open: (route: string) => void) {
  const section = hiddenSectionOf(route)
  if (!section) { open(route); return }
  useFocusModeStore.getState().setBlocked({ route, section })
}
