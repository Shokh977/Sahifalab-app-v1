import { create } from 'zustand'

interface UIState {
  tabBarVisible:    boolean
  navBarH:          number
  setTabBarVisible: (v: boolean) => void
  setNavBarH:       (v: number)  => void
}

export const useUIStore = create<UIState>((set) => ({
  tabBarVisible:    true,
  navBarH:          52,
  setTabBarVisible: (tabBarVisible) => set({ tabBarVisible }),
  setNavBarH:       (navBarH)       => set({ navBarH }),
}))
