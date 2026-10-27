/**
 * Once per sign-in: loads your own look (myLookStore) and keeps the
 * applied app theme in line with what the server allows. The theme itself
 * is applied before the first paint from local storage
 * (themeStore.loadTheme); this only corrects it afterwards:
 *
 * - The server's effective theme differs from the local one (Pro ended or
 *   the season closed): apply it, and once per lapse show
 *   "Mavzu Standartga qaytdi". The saved choice stays on the server.
 * - The saved choice is effective again (Pro renewed, season back): apply
 *   it — the server's effective theme already is the saved one.
 *
 * Before migration 106 the endpoint answers 503 and nothing changes.
 */
import { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { profile as profileApi } from '../../../lib/api'
import { useThemeStore } from '../../../stores/themeStore'
import { useNotifToastStore } from '../../../stores/notifToastStore'
import { useMyLookStore } from '../../../stores/myLookStore'
import { themeKind } from '../profile/cosmetics/cosmetics'
import { useBadgeCatalog } from '../profile/names/badgeCatalog'

const TOASTED_KEY = 'sahifalab_theme_fallback_toasted'

export function useThemeSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    // Name badges are a server catalog; fetch it once per sign-in.
    useBadgeCatalog.getState().load()
    profileApi.getMyLook()
      .then(async look => {
        if (cancelled) return
        // Your own ring and tree look, for Bugun, the streak screens and Reyting.
        useMyLookStore.getState().set({
          banner: look.effective.banner, ring: look.effective.ring, tree: look.effective.tree, isPro: look.is_pro,
          nameStyle: look.effective.name_style ?? 'oddiy', badge: look.effective.badge ?? 'none',
        })
        const { themeId, setThemeId } = useThemeStore.getState()
        const effective = themeKind(look.effective.theme)
        const saved = themeKind(look.saved.theme)
        if (effective !== themeId) setThemeId(effective)

        const lapsed = saved !== 'standart' && effective !== saved
        const toasted = await AsyncStorage.getItem(TOASTED_KEY).catch(() => null)
        if (lapsed && toasted !== saved) {
          useNotifToastStore.getState().showToast({
            id: Date.now(), type: 'theme', title: 'Mavzu Standartga qaytdi',
            body: 'Tanlagan mavzuingiz qayta ochilganda oʻzi qaytadi.', is_read: true,
            created_at: new Date().toISOString(), data: {},
          })
          AsyncStorage.setItem(TOASTED_KEY, saved).catch(() => {})
        } else if (!lapsed && toasted) {
          AsyncStorage.removeItem(TOASTED_KEY).catch(() => {})
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [enabled])
}
