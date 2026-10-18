/**
 * Course purchase state shared by the course detail, the purchase sheet, the
 * status screen and the Kurslar list (redesign Phase 7b).
 *
 * The flow is unchanged on the server: the app asks for a PAY-XXXX-YYYY code,
 * the student sends it to the pay bot with a receipt, an admin approves, and
 * the course is granted. This module keeps the client's view of it: which
 * courses have an open request (pendingStore) and the one-time
 * purchase_approved event.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { enrollments, type PendingEnrollment } from '../../../lib/api'
import { trackOnce } from '../../../lib/analytics'

const KEY_PREFIX = 'sahifalab_pending_purchase_'

/** Set when this device requested a code; a later enrolment is the approval. */
export const pendingPurchaseKey = (courseId: number) => `${KEY_PREFIX}${courseId}`

export type PendingStatus = PendingEnrollment['status']

export function isActive(p: Pick<PendingEnrollment, 'expires_at'>, now = Date.now()): boolean {
  const t = Date.parse(p.expires_at)
  return Number.isNaN(t) || t > now
}

/** Chip text on cards and the detail ("Tekshirilmoqda" for any open request). */
export const PENDING_CHIP = 'Tekshirilmoqda'

export function statusCopy(status: PendingStatus): { title: string; body: string } {
  return status === 'paid'
    ? { title: 'Chek tekshirilmoqda', body: 'Odatda 5–30 daqiqa. Tasdiqlangach kurs ochiladi va xabar keladi.' }
    : { title: 'Toʻlov kutilmoqda', body: 'Kodni botga yuboring, toʻlab, chek rasmini joʻnating.' }
}

interface PendingStore {
  byCourse: Record<number, PendingEnrollment>
  refresh: () => Promise<void>
  put: (p: PendingEnrollment) => void
  clear: (courseId: number) => void
}

/** Requests from codes this device asked for, one pending-status call each. */
async function fromLocalKeys(): Promise<PendingEnrollment[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(KEY_PREFIX))
  const ids = keys.map(k => Number(k.slice(KEY_PREFIX.length))).filter(n => n > 0)
  const rows = await Promise.all(ids.map(async id => {
    const s = await enrollments.pendingStatus(id).catch(() => null)
    return s?.has_pending && s.reference_code && s.status && s.expires_at
      ? { course_id: id, reference_code: s.reference_code, status: s.status, expires_at: s.expires_at }
      : null
  }))
  return rows.filter((r): r is PendingEnrollment => r != null)
}

export const usePendingStore = create<PendingStore>((set) => ({
  byCourse: {},

  async refresh() {
    let rows: PendingEnrollment[]
    try {
      rows = await enrollments.pendingMine()
    } catch {
      // Backend without /pending-mine yet: fall back to this device's codes.
      rows = await fromLocalKeys().catch(() => [])
    }
    const byCourse: Record<number, PendingEnrollment> = {}
    for (const r of rows) if (isActive(r)) byCourse[r.course_id] = r
    set({ byCourse })
  },

  put(p) { set(s => ({ byCourse: { ...s.byCourse, [p.course_id]: p } })) },

  clear(courseId) {
    set(s => {
      if (!(courseId in s.byCourse)) return s
      const next = { ...s.byCourse }
      delete next[courseId]
      return { byCourse: next }
    })
  },
}))

/** After a code request: remember it locally and show the pending state. */
export function rememberPurchase(p: PendingEnrollment): void {
  AsyncStorage.setItem(pendingPurchaseKey(p.course_id), p.reference_code).catch(() => {})
  usePendingStore.getState().put(p)
}

/**
 * The course turned out enrolled. If this device had asked for a code, that
 * is the admin's approval: purchase_approved fires once per course (shared
 * key with the push and notification-list sources).
 */
export async function settlePurchase(courseId: number, via: string): Promise<void> {
  usePendingStore.getState().clear(courseId)
  try {
    if (!(await AsyncStorage.getItem(pendingPurchaseKey(courseId)))) return
    await AsyncStorage.removeItem(pendingPurchaseKey(courseId))
    trackOnce(`purchase_approved_${courseId}`, 'purchase_approved', { course_id: courseId, via }, courseId)
  } catch {}
}
