import { useShallow } from 'zustand/shallow'
import { useThemeStore } from '../stores/themeStore'

/** Convenience hook — returns { theme, c, toggle } */
export function useTheme() {
  return useThemeStore(useShallow((s) => ({ theme: s.theme, c: s.c, toggle: s.toggle })))
}
