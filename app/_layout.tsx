import React, { useEffect, useRef } from 'react'
import { Linking } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useNotifToastStore } from '../stores/notifToastStore'
import { usePendingDeepLinkStore } from '../stores/pendingDeepLinkStore'
import { useOfflineQueueStore } from '../stores/offlineQueueStore'
import { useOnline } from '../hooks/useOnline'
import { OfflineBanner } from '../components/ui/OfflineBanner'
import { NotifToast } from '../components/ui/NotifToast'

// expo-notifications and expo-constants are lazy-required so their module
// initialisation (which calls addPushTokenListener) cannot throw and crash
// this layout in Expo Go SDK 53 — where remote notifications were removed.
let Notifications: typeof import('expo-notifications') | null = null
try { Notifications = require('expo-notifications') } catch {}

let Constants: typeof import('expo-constants').default | null = null
try { Constants = require('expo-constants').default } catch {}

// ── Deep link URL → in-app route ─────────────────────────────────────────────

function parseDeepLink(url: string): string | null {
  const path  = url.replace(/^sahifalab:\/\//, '')
  const parts = path.split('/')
  const seg0  = parts[0] ?? ''
  const seg1  = parts[1]
  const seg2  = parts[2]
  const seg3  = parts[3]

  const tabRoutes: Record<string, string> = {
    '':            '/(tabs)',
    home:          '/(tabs)',
    study:         '/(tabs)/study',
    courses:       '/(tabs)/courses',
    notifications: '/(tabs)/notifications',
    profile:       '/(tabs)/profile',
  }
  if (seg0 in tabRoutes) return tabRoutes[seg0]

  if (seg0 === 'leaderboard')                              return '/(screens)/leaderboard'
  if (seg0 === 'course'          && seg1)                  return `/(screens)/course/${seg1}`
  // sahifalab://courses/{id}/lesson/{lessonId}
  if (seg0 === 'courses' && seg1 && seg2 === 'lesson' && seg3)
                                                           return `/(screens)/lesson/${seg3}`
  // sahifalab://courses/{id}
  if (seg0 === 'courses' && seg1 && !seg2)                 return `/(screens)/course/${seg1}`
  if (seg0 === 'tests'           && seg1)                  return `/(screens)/test/${seg1}`
  if (seg0 === 'certificates'    && seg1)                  return `/(screens)/certificate/${seg1}`
  if (seg0 === 'payment-complete'&& seg1)                  return `/(screens)/payment-complete/${seg1}`
  // Flashcard deep links
  // sahifalab://flashcards → deck list
  if (seg0 === 'flashcards' && !seg1)                      return '/(screens)/flashcards'
  // sahifalab://flashcards/{id} → deck detail
  if (seg0 === 'flashcards' && seg1 && seg2 !== 'study')   return `/(screens)/flashcard-deck/${seg1}`
  // sahifalab://flashcards/{id}/study → study session
  if (seg0 === 'flashcards' && seg1 && seg2 === 'study')   return `/(screens)/flashcard-study/${seg1}`

  return null
}

const PUSH_TOKEN_KEY = 'sahifalab_push_token'

SplashScreen.preventAutoHideAsync()

async function registerPushToken() {
  // Remote notifications removed from Expo Go on Android in SDK 53
  if (!Notifications || !Constants) return
  if (Constants.executionEnvironment === 'storeClient') return
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null)
    const token: string | null = tokenData?.data ?? null
    if (!token) return

    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
    if (stored === token) return  // unchanged

    // Save new token
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
    // Send to backend — use dynamic require to avoid circular imports
    const { messenger } = require('../lib/api')
    await messenger.savePushToken(token).catch(() => {})
  } catch {}
}

export default function RootLayout() {
  const { isLoading, isAuthenticated, needsOnboarding, initAuth } = useAuthStore()
  const { loadTheme, theme, c } = useThemeStore()
  const { fetchUnreadCount } = useNotificationStore()
  const { showToast } = useNotifToastStore()
  const router   = useRouter()
  const segments = useSegments()
  const isOnline = useOnline()
  const wasOnlineRef = useRef(false)

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular':       require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium':        require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold':      require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold':          require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold':     require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'NotoSerifDisplay-BoldItalic':   require('../assets/fonts/NotoSerifDisplay-BoldItalic.ttf'),
    'SpaceGrotesk-Medium':           require('../assets/fonts/SpaceGrotesk-Medium.ttf'),
    'SpaceGrotesk-SemiBold':         require('../assets/fonts/SpaceGrotesk-SemiBold.ttf'),
    'SpaceGrotesk-Bold':             require('../assets/fonts/SpaceGrotesk-Bold.ttf'),
  })

  // ── Notification handler (suppress system banner in foreground) ────────────
  useEffect(() => {
    if (!Notifications) return
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:  false,  // suppress — we show our own in-app toast
        shouldPlaySound:  true,
        shouldSetBadge:   true,
        shouldShowBanner: false,
        shouldShowList:   false,
      }),
    })
  }, [])

  // ── Foreground notification → in-app toast ────────────────────────────────
  const foregroundListenerRef = useRef<any>(null)
  useEffect(() => {
    if (!Notifications) return
    foregroundListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        const content = notification?.request?.content ?? {}
        const data    = content.data ?? {}
        // Show in-app toast with the notification content
        showToast({
          id:         Date.now(),
          type:       data.type ?? 'system',
          title:      content.title ?? '',
          body:       content.body  ?? '',
          is_read:    false,
          created_at: new Date().toISOString(),
          data,
        })
        // Bump unread count
        fetchUnreadCount()
      },
    )
    return () => { foregroundListenerRef.current?.remove?.() }
  }, [showToast, fetchUnreadCount])

  // ── Background tap → deep link ────────────────────────────────────────────
  const responseListenerRef = useRef<any>(null)
  useEffect(() => {
    if (!Notifications) return
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response?.notification?.request?.content?.data ?? {}
        // Resolve route from data
        const routeMap: Record<string, string> = {
          study_timer:       '/(tabs)/study',
          profile:           '/(tabs)/profile',
          home:              '/(tabs)',
          leaderboard:       '/(screens)/leaderboard',
          weekly_report:     '/(screens)/weekly-report',
          teacher_dashboard: '/(screens)/teacher-dashboard',
          notifications:     '/(tabs)/notifications',
        }
        let route: string | null = null
        // Dynamic routes first (actor profile, course, test, certificate)
        if (data.screen === 'profile'     && data.actor_id)  route = `/(screens)/profile/${data.actor_id}`
        if (data.screen === 'course'      && data.course_id) route = `/(screens)/course/${data.course_id}`
        if (data.screen === 'test'        && data.test_id)   route = `/(screens)/test/${data.test_id}`
        if (data.screen === 'certificate' && data.code)      route = `/(screens)/certificate/${data.code}`
        // Static routes
        if (!route) route = routeMap[data.screen] ?? null
        if (route) router.push(route as any)
      },
    )
    return () => { responseListenerRef.current?.remove?.() }
  }, [])

  useEffect(() => {
    Promise.all([loadTheme(), initAuth()])
  }, [])

  useEffect(() => {
    if (fontsLoaded && !isLoading) SplashScreen.hideAsync()
  }, [fontsLoaded, isLoading])

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !fontsLoaded) return

    const seg0 = segments[0] as string | undefined

    if (!isAuthenticated) {
      if (seg0 !== '(auth)') router.replace('/(auth)/login')
      return
    }

    if (needsOnboarding) {
      if (seg0 !== '(onboarding)') router.replace('/(onboarding)/interests' as any)
      return
    }

    if (seg0 === '(auth)' || seg0 === '(onboarding)') {
      router.replace('/(tabs)')
    }
  }, [isLoading, isAuthenticated, needsOnboarding, fontsLoaded, segments])

  // ── After auth: register push token + fetch unread count ──────────────────
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      registerPushToken()
      fetchUnreadCount()
    }
  }, [isAuthenticated, isLoading])

  // ── Offline queue: load on mount, flush when network restores ─────────────
  useEffect(() => {
    useOfflineQueueStore.getState().loadFromStorage()
  }, [])

  useEffect(() => {
    if (isOnline && !wasOnlineRef.current && isAuthenticated) {
      useOfflineQueueStore.getState().flush()
    }
    wasOnlineRef.current = isOnline
  }, [isOnline, isAuthenticated])

  // ── Deep linking for unauthenticated users ────────────────────────────────
  // Capture initial URL (cold start) — store if not yet authenticated
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url && !isAuthenticated && !isLoading) {
        usePendingDeepLinkStore.getState().setPending(url)
      }
    }).catch(() => {})
  }, [])

  // Capture foreground deep links for unauthenticated users
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!isAuthenticated) {
        usePendingDeepLinkStore.getState().setPending(url)
      }
    })
    return () => sub.remove()
  }, [isAuthenticated])

  // Navigate to pending deep link once authenticated
  useEffect(() => {
    if (!isAuthenticated || isLoading || !fontsLoaded) return
    usePendingDeepLinkStore.getState().consume().then(url => {
      if (!url) return
      const route = parseDeepLink(url)
      if (route) setTimeout(() => router.push(route as any), 600)
    }).catch(() => {})
  }, [isAuthenticated, isLoading, fontsLoaded])

  if (!fontsLoaded || isLoading) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Slot />
      <OfflineBanner />
      <NotifToast />
    </GestureHandlerRootView>
  )
}
