import { create } from 'zustand'
import type { NotifItem } from '../lib/api'

interface NotifToastState {
  toast:     NotifItem | null
  showToast: (item: NotifItem) => void
  hideToast: () => void
}

export const useNotifToastStore = create<NotifToastState>((set) => ({
  toast:     null,
  showToast: (item) => set({ toast: item }),
  hideToast: ()     => set({ toast: null }),
}))
