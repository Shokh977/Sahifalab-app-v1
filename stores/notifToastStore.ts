import { create } from 'zustand'

/** In-app toast built from a foreground push (app/_layout.tsx) — the push's
 *  own title/body/data, not a server NotifItem row (which has no title/body). */
export interface ToastItem {
  id:         number
  type:       string
  title:      string
  body:       string
  is_read:    boolean
  created_at: string
  data:       Record<string, any>
}

interface NotifToastState {
  toast:     ToastItem | null
  showToast: (item: ToastItem) => void
  hideToast: () => void
}

export const useNotifToastStore = create<NotifToastState>((set) => ({
  toast:     null,
  showToast: (item) => set({ toast: item }),
  hideToast: ()     => set({ toast: null }),
}))
