import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  isActive, pendingPurchaseKey, rememberPurchase, settlePurchase, statusCopy, usePendingStore,
} from '../src/features/courses/purchase'

// jest.mock calls are hoisted above the imports; the factories run lazily.
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)
const mockPendingMine = jest.fn<() => Promise<any[]>>()
const mockPendingStatus = jest.fn<(id: number) => Promise<any>>()
jest.mock('../lib/api', () => ({
  enrollments: { pendingMine: () => mockPendingMine(), pendingStatus: (id: number) => mockPendingStatus(id) },
}))
const mockTrackOnce = jest.fn()
jest.mock('../lib/analytics', () => ({ trackOnce: (...a: unknown[]) => mockTrackOnce(...a) }))

const future = new Date(Date.now() + 3_600_000).toISOString()
const past = new Date(Date.now() - 60_000).toISOString()
const row = (course_id: number, status: 'awaiting_payment' | 'paid' = 'awaiting_payment', expires_at = future) =>
  ({ course_id, reference_code: `PAY-AAAA-000${course_id}`, status, expires_at })

beforeEach(async () => {
  await AsyncStorage.clear()
  usePendingStore.setState({ byCourse: {} })
  mockPendingMine.mockReset(); mockPendingStatus.mockReset(); mockTrackOnce.mockReset()
})

describe('status helpers', () => {
  it('treats expired requests as closed', () => {
    expect(isActive(row(1))).toBe(true)
    expect(isActive(row(1, 'paid', past))).toBe(false)
  })
  it('words the two server states', () => {
    expect(statusCopy('awaiting_payment').title).toBe('Toʻlov kutilmoqda')
    expect(statusCopy('paid').title).toBe('Chek tekshirilmoqda')
  })
})

describe('usePendingStore.refresh', () => {
  it('keys active rows by course from pending-mine', async () => {
    mockPendingMine.mockResolvedValue([row(7, 'paid'), row(9, 'awaiting_payment', past)])
    await usePendingStore.getState().refresh()
    expect(Object.keys(usePendingStore.getState().byCourse)).toEqual(['7'])
  })
  it('falls back to this device\'s codes when the endpoint is missing', async () => {
    mockPendingMine.mockRejectedValue(new Error('404'))
    await AsyncStorage.setItem(pendingPurchaseKey(5), 'PAY-AAAA-0005')
    mockPendingStatus.mockResolvedValue({ has_pending: true, reference_code: 'PAY-AAAA-0005', status: 'paid', expires_at: future })
    await usePendingStore.getState().refresh()
    expect(mockPendingStatus).toHaveBeenCalledWith(5)
    expect(usePendingStore.getState().byCourse[5]?.status).toBe('paid')
  })
})

describe('approval', () => {
  it('fires purchase_approved once a requested course is enrolled', async () => {
    rememberPurchase(row(3))
    await new Promise(r => setTimeout(r, 0))
    await settlePurchase(3, 'status_screen')
    expect(mockTrackOnce).toHaveBeenCalledWith('purchase_approved_3', 'purchase_approved', { course_id: 3, via: 'status_screen' }, 3)
    expect(usePendingStore.getState().byCourse[3]).toBeUndefined()
    expect(await AsyncStorage.getItem(pendingPurchaseKey(3))).toBeNull()
  })
  it('does not count an enrolment this device never paid for', async () => {
    await settlePurchase(4, 'course_detail')
    expect(mockTrackOnce).not.toHaveBeenCalled()
  })
})
