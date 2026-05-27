import { create } from 'zustand'
import { request } from '../lib/api'

interface NotificationStore {
  unreadCount: number
  fetchUnreadCount: () => Promise<void>
  decrement: (by?: number) => void
  reset: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,

  fetchUnreadCount: async () => {
    try {
      const data = await request<{ count: number }>(
        '/api/notifications/unread-count', { auth: true }
      )
      set({ unreadCount: data.count ?? 0 })
    } catch {}
  },

  decrement: (by = 1) =>
    set(s => ({ unreadCount: Math.max(0, s.unreadCount - by) })),

  reset: () => set({ unreadCount: 0 }),
}))
