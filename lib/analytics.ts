/**
 * analytics.ts — product analytics events (redesign Phase 0).
 *
 * Events go to the backend's existing POST /api/analytics/track, which writes
 * them to the analytics_events table (034_analytics_events) — the same pipe
 * the donation screen already uses. Event names are snake_case; the backend
 * only accepts names from its own allow-list (analytics.py AnalyticsEvent),
 * so a new event needs a backend line too.
 *
 * Fire-and-forget by design: events are batched in memory and flushed every
 * FLUSH_INTERVAL_MS, at FLUSH_AT events, and when the app goes to the
 * background. A failed flush drops that batch — analytics must never retry
 * in a way that competes with real requests, and never throw into a flow.
 */
import { AppState } from 'react-native'

export type AnalyticsEventName =
  | 'app_open'
  | 'today_primary_action_tap'
  | 'quiz_start'
  | 'quiz_answer'
  | 'quiz_complete'
  | 'quiz_resume'
  | 'course_view'
  | 'purchase_sheet_open'
  | 'purchase_start'
  | 'purchase_approved'
  | 'deck_copy'
  | 'review_session_start'
  | 'review_session_complete'
  | 'ai_quota_exhausted'
  | 'pro_sheet_open'

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

export interface QueuedEvent {
  event_type: AnalyticsEventName
  target_id:  number
  meta:       Record<string, unknown>
}

export const FLUSH_AT          = 20
export const MAX_PER_REQUEST   = 50   // backend caps a request at 50 events
export const MAX_QUEUE         = 200  // offline guard: oldest events drop first
const FLUSH_INTERVAL_MS        = 10_000

/** Pure: one queued event. `client_ts` lets the server order events from a
 *  delayed batch; `surface` matches the donation screen's existing meta. */
export function buildEvent(
  name: AnalyticsEventName,
  props: AnalyticsProps = {},
  targetId = 0,
  now: number = Date.now(),
): QueuedEvent {
  const meta: Record<string, unknown> = { surface: 'app', client_ts: now }
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) meta[k] = v
  }
  return {
    event_type: name,
    target_id:  Number.isFinite(targetId) ? Math.trunc(targetId) : 0,
    meta,
  }
}

/** Pure: split a queue into request-sized batches (oldest first). */
export function buildBatches(queue: QueuedEvent[], size = MAX_PER_REQUEST): QueuedEvent[][] {
  const out: QueuedEvent[][] = []
  for (let i = 0; i < queue.length; i += size) out.push(queue.slice(i, i + size))
  return out
}

/** Pure: append with the offline cap — drops the oldest events past `max`. */
export function enqueue(queue: QueuedEvent[], ev: QueuedEvent, max = MAX_QUEUE): QueuedEvent[] {
  const next = [...queue, ev]
  return next.length > max ? next.slice(next.length - max) : next
}

// ── Runtime ──────────────────────────────────────────────────────────────────

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let started = false

function ensureStarted() {
  if (started) return
  started = true
  AppState.addEventListener('change', state => {
    if (state === 'background' || state === 'inactive') void flush()
  })
}

function schedule() {
  if (timer) return
  timer = setTimeout(() => { timer = null; void flush() }, FLUSH_INTERVAL_MS)
}

export function track(name: AnalyticsEventName, props?: AnalyticsProps, targetId?: number): void {
  try {
    ensureStarted()
    queue = enqueue(queue, buildEvent(name, props, targetId))
    if (__DEV__) console.log('[track]', name, props ?? {})
    if (queue.length >= FLUSH_AT) void flush()
    else schedule()
  } catch {
    // never let analytics break a flow
  }
}

export async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null }
  if (queue.length === 0) return
  const batches = buildBatches(queue)
  queue = []
  try {
    // Lazy import: lib/api imports stores that may import this module.
    const { request } = await import('./api')
    await Promise.all(batches.map(events =>
      request('/api/analytics/track', {
        method: 'POST',
        body:   JSON.stringify({ events }),
        auth:   true,  // optional server-side; attributes the actor when signed in
      }).catch(() => {}),
    ))
  } catch {
    // dropped — see module docstring
  }
}

/** Fire `name` at most once per `key` for the app's lifetime (e.g. one
 *  purchase_approved per course). Persisted, so it survives restarts. */
export async function trackOnce(
  key: string, name: AnalyticsEventName, props?: AnalyticsProps, targetId?: number,
): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
    const storageKey = `sahifalab_tracked_once_${key}`
    if (await AsyncStorage.getItem(storageKey)) return
    await AsyncStorage.setItem(storageKey, '1')
    track(name, props, targetId)
  } catch {}
}
