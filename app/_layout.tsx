import React, { useEffect, useRef, useState, Component } from 'react'
import { Linking, View, Text, Pressable, StyleSheet, Platform, AppState } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useShallow } from 'zustand/react/shallow'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import * as SystemUI from 'expo-system-ui'
import { registerWidgetTaskHandler } from 'react-native-android-widget'
import { widgetTaskHandler } from '../widgets/widgetTaskHandler'
import { useCourseStore } from '../stores/courseStore'
import { settlePurchase } from '../src/features/courses/purchase'
import { useReducedMotion } from 'react-native-reanimated'
import { pushAnimation } from '../src/design/motion'
import { startPerfProbe } from '../src/dev/perfProbe'

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler)
}
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/dashboardStore'
import { useStreakStagesStore } from '../stores/streakStagesStore'
import { syncStreakReminderWithPrefs } from '../lib/streakNotifications'
import { useThemeStore } from '../stores/themeStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useNotifToastStore } from '../stores/notifToastStore'
import { useThemeSync } from '../src/features/themes/useThemeSync'
import { usePendingDeepLinkStore } from '../stores/pendingDeepLinkStore'
import { parseDeepLink } from '../lib/deepLinks'
import { useOfflineQueueStore } from '../stores/offlineQueueStore'
import { useOfflineLessonQueueStore } from '../stores/offlineLessonQueueStore'
import { useDownloadStore } from '../stores/downloadStore'
import { usePublicDecksStore } from '../stores/publicDecksStore'
import { useOnline } from '../hooks/useOnline'
import { OfflineBanner } from '../components/ui/OfflineBanner'
import { NotifToast } from '../components/ui/NotifToast'
import { AppIntroModal } from '../components/onboarding/AppIntroModal'
import { AnnouncementModal } from '../components/ui/AnnouncementModal'
import { useAnnouncementStore } from '../stores/announcementStore'
import { useRewardStore } from '../stores/rewardStore'
import { RewardModal } from '../components/rewards/RewardModal'
import { track, trackOnce } from '../lib/analytics'
import { ThemeProvider } from '../src/design'


const APP_INTRO_KEY = 'sahifalab_app_intro_v1'

// expo-notifications and expo-constants are lazy-required so their module
// initialisation (which calls addPushTokenListener) cannot throw and crash
// this layout in Expo Go SDK 53 — where remote notifications were removed.
let Notifications: typeof import('expo-notifications') | null = null
try { Notifications = require('expo-notifications') } catch {}

let Constants: typeof import('expo-constants').default | null = null
try { Constants = require('expo-constants').default } catch {}


// ── Global error boundary ─────────────────────────────────────────────────────
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error)
  }
  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <View style={eb.wrap}>
        <Text style={eb.emoji}>⚠️</Text>
        <Text style={eb.title}>Xatolik yuz berdi</Text>
        <Text style={eb.body}>Ilovani qaytadan ishga tushiring.</Text>
        <Pressable style={eb.btn} onPress={() => this.setState({ crashed: false })}>
          <Text style={eb.btnText}>Qayta urinish</Text>
        </Pressable>
      </View>
    )
  }
}
const eb = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0D0D0F' },
  emoji:   { fontSize: 48, marginBottom: 16 },
  title:   { fontSize: 20, fontWeight: '700', color: '#F0EEEB', marginBottom: 8 },
  body:    { fontSize: 14, color: '#9B9BA4', textAlign: 'center', marginBottom: 24 },
  btn:     { backgroundColor: '#F5A623', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})

const PUSH_TOKEN_KEY = 'sahifalab_push_token'

// "course_granted" is the notification the admin approval sends once a
// payment is confirmed (backend admin.py). Its Expo push data today carries
// only {screen, course_id}, not the type, so this only fires if the payload
// ever gains `type`; the notification list and course detail cover it now.
// Once per course across all three sources (shared trackOnce key).
function trackCourseGranted(data: any) {
  if (data?.type !== 'course_granted' && data?.notif_type !== 'course_granted') return
  const courseId = Number(data?.course_id ?? data?.meta?.course_id)
  if (!courseId) return
  trackOnce(`purchase_approved_${courseId}`, 'purchase_approved', { course_id: courseId, via: 'push' }, courseId)
}

// A course push (granted / completed) while the app is open: re-check the
// enrolment so an open course detail or purchase status screen flips to
// "enrolled" at once, and drop the course's pending chip.
function refreshCourseAccess(data: any) {
  if (data?.screen !== 'course') return
  const courseId = Number(data?.course_id)
  if (!courseId) return
  useCourseStore.getState().checkEnrollment(courseId)
    .then(e => { if (e.enrolled) settlePurchase(courseId, 'push') })
    .catch(() => {})
}


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

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    ).catch(() => null)
    const token: string | null = tokenData?.data ?? null
    if (!token) return

    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
    if (stored === token) return  // unchanged

    // Save new token
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
    // Send to backend — use dynamic require to avoid circular imports
    const { push } = require('../lib/api')
    await push.savePushToken(token).catch(() => {})
  } catch {}
}

const TIMEZONE_KEY = 'sahifalab_timezone'

function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/**
 * Persist the device's IANA timezone so cron-driven streak logic (auto-freeze,
 * at-risk push, reminder) can resolve "today"/"midnight" per-user server-side
 * — see app/services/user_time.py. Called on login and on every app
 * foreground; only actually hits the network when the value changed.
 */
async function registerTimezone() {
  const tz = getDeviceTimezone()
  if (!tz) return
  try {
    const stored = await AsyncStorage.getItem(TIMEZONE_KEY)
    if (stored === tz) return  // unchanged

    await AsyncStorage.setItem(TIMEZONE_KEY, tz)
    const { onboarding } = require('../lib/api')
    await onboarding.saveTimezone(tz).catch(() => {})
  } catch {}
}

export default function RootLayout() {
  const reduceMotion = useReducedMotion()
  useEffect(() => { startPerfProbe() }, [])  // preview builds only
  // Narrow selectors: the root used to subscribe to whole stores, so every
  // change anywhere in them (a patched user photo, an unread count, a toast)
  // re-rendered the root — and the navigator under it — for nothing.
  const { isLoading, isAuthenticated, needsOnboarding, initAuth } = useAuthStore(useShallow(s => ({
    isLoading: s.isLoading, isAuthenticated: s.isAuthenticated, needsOnboarding: s.needsOnboarding, initAuth: s.initAuth,
  })))
  const { loadTheme, theme, c } = useThemeStore(useShallow(s => ({ loadTheme: s.loadTheme, theme: s.theme, c: s.c })))
  const fetchUnreadCount = useNotificationStore(s => s.fetchUnreadCount)
  const showToast = useNotifToastStore(s => s.showToast)
  const { pending: pendingRewards, visible: rewardModalVisible, dismiss: dismissRewards } = useRewardStore(useShallow(s => ({
    pending: s.pending, visible: s.visible, dismiss: s.dismiss,
  })))
  const router   = useRouter()
  const segments = useSegments()
  // The server may have locked the local theme (Pro ended, season over).
  useThemeSync(isAuthenticated && !isLoading)
  const isOnline = useOnline()
  const wasOnlineRef = useRef(false)
  const hasAnnouncement = useAnnouncementStore(s => s.current !== null)

  const [showAppIntro, setShowAppIntro] = useState(false)

  const [fontsLoaded] = useFonts({
    // Onest is the app font (redesign Phase 1): unlike Plus Jakarta Sans it
    // has Cyrillic (leaderboard names) and ʻ (U+02BB) for oʻ/gʻ.
    'Onest-Regular':                 require('../assets/fonts/Onest-Regular.ttf'),
    'Onest-Medium':                  require('../assets/fonts/Onest-Medium.ttf'),
    'Onest-SemiBold':                require('../assets/fonts/Onest-SemiBold.ttf'),
    'Onest-Bold':                    require('../assets/fonts/Onest-Bold.ttf'),
    'Onest-ExtraBold':               require('../assets/fonts/Onest-ExtraBold.ttf'),
    // Only the fonts the app draws with. Eleven unused faces (Plus Jakarta
    // Sans, Noto Serif, Space Grotesk, Instrument Serif, JetBrains Mono) used
    // to load here too, holding the splash screen until all were parsed.
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
        trackCourseGranted(data)
        refreshCourseAccess(data)
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
        trackCourseGranted(data)
        // Resolve route from data
        const routeMap: Record<string, string> = {
          study_timer:      '/(tabs)/study',
          streak_reminder:  '/(tabs)/study',
          profile:          '/(tabs)/profile',
          home:             '/(tabs)',
          leaderboard:      '/(screens)/leaderboard',
          // weekly_report: sent by the Monday-08:00 cron push (cron.py's
          // send_weekly_reports) — the standalone weekly-report screen it
          // used to open was retired (merged into weekly_review, which now
          // shows the same numbers plus the AI narrative), so both notif
          // types land on the same screen.
          weekly_report:    '/(screens)/weekly-review',
          weekly_review:    '/(screens)/weekly-review',
          daily_quiz:       '/(screens)/daily-quiz',   // 090_daily_quiz — publish + reminder pushes
          teacher_dashboard:'/(screens)/teacher-dashboard',
          notifications:    '/(tabs)/notifications',
          streak:           '/(screens)/streak-detail',   // tree stage-ups
          pro:              '/(screens)/pro',             // Sahifalab Pro activated
          competitions:     '/(tabs)/musobaqalar',
        }
        let route: string | null = null
        // Dynamic routes first (actor profile, course, test, certificate)
        if (data.screen === 'profile'     && data.actor_id)  route = `/(screens)/profile/${data.actor_id}`
        if (data.screen === 'course'      && data.course_id) route = `/(screens)/course/${data.course_id}`
        if (data.screen === 'test'        && data.test_id)   route = `/(screens)/test/${data.test_id}`
        if (data.screen === 'certificate' && data.code)      route = `/(screens)/certificate/${data.code}`
        // Bellashuv "Eslatma qoʻyish" (local) — opens the competition.
        if (data.screen === 'challenge'   && data.slug)      route = `/(screens)/challenge/${data.slug}`
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

  // ── Android nav bar — correct content colour for the current theme ────────
  // expo-navigation-bar@57 removed setBackgroundColorAsync/setButtonStyleAsync
  // entirely (Android now enforces edge-to-edge display — apps can no longer
  // set a nav bar background color at all, it's always transparent). setStyle
  // takes the ICON style, not a bar-background name: per the library's own
  // 'auto' resolution (NavigationBar.android.ts), a light color scheme
  // resolves to 'dark' (dark icons for contrast on a light background) and a
  // dark scheme resolves to 'light' — so this must be INVERTED relative to
  // `theme`, same direction as the old deprecated setButtonStyleAsync call.
  // (Previously passed straight through — that was backwards, and on
  // devices with system contrast-enforcement it made the auto contrast
  // scrim behind the buttons show the wrong tone for the app's real theme.)
  useEffect(() => {
    if (Platform.OS !== 'android') return
    try {
      NavigationBar.setStyle(theme === 'dark' ? 'light' : 'dark')
    } catch {}
  }, [theme])

  // ── Root window background — the actual fix for "the area behind the
  // nav bar doesn't match the app theme". On edge-to-edge Android the nav
  // bar itself is transparent (see above), so whatever color shows through
  // it is the NATIVE window's own background — which, with nothing here
  // setting it, follows the OS's day/night resource system, NOT this app's
  // own in-app theme toggle. Those two are independent (a user can run the
  // OS in light mode while the app itself is toggled to dark, or vice
  // versa), so the area behind the nav bar was showing whatever the OS
  // setting implied regardless of the app's actual current theme. Setting
  // it explicitly here, keyed on `c.bgPrimary`, keeps it in sync with the
  // real in-app theme on every toggle.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bgPrimary).catch(() => {})
  }, [c.bgPrimary])

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

  // ── After auth: register push token, unread count, streak reminder ──────────
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      track('app_open', { cold: true })
      // Prefetch dashboard data immediately so home tab renders with data already loaded
      useDashboardStore.getState().fetch()
      useStreakStagesStore.getState().fetchStages()
      registerPushToken()
      registerTimezone()
      fetchUnreadCount()
      syncStreakReminderWithPrefs()
      // tanga-economy-rework (092) Part 5: check for pending reward modals
      // on launch too — a reward can be waiting from a push-triggered grant
      // (e.g. streak_freeze_applied) that happened while the app was closed.
      useRewardStore.getState().check()
      // Defer announcements fetch so it doesn't compete with critical startup
      const t = setTimeout(() => useAnnouncementStore.getState().fetch(), 3000)

      // Re-check timezone on every foreground — a user who travels can have
      // the app open across a timezone change without ever re-logging in.
      // Reward check on foreground too (spec Part 5's 3 trigger points).
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') {
          track('app_open', { cold: false })
          registerTimezone()
          useRewardStore.getState().check()
        }
      })
      return () => { clearTimeout(t); sub.remove() }
    }
  }, [isAuthenticated, isLoading])

  // ── App intro: show once on first launch after successful auth ────────────
  useEffect(() => {
    if (!isAuthenticated || isLoading || !fontsLoaded || needsOnboarding) return
    AsyncStorage.getItem(APP_INTRO_KEY).then(seen => {
      if (!seen) setShowAppIntro(true)
    }).catch(() => {})
  }, [isAuthenticated, isLoading, fontsLoaded, needsOnboarding])

  async function dismissAppIntro() {
    setShowAppIntro(false)
    await AsyncStorage.setItem(APP_INTRO_KEY, '1').catch(() => {})
  }

  // ── Offline queue: load on mount, flush when network restores ─────────────
  useEffect(() => {
    useOfflineQueueStore.getState().loadFromStorage()
    useOfflineLessonQueueStore.getState().loadFromStorage()
    usePublicDecksStore.getState().loadQueuesFromStorage()
    useDownloadStore.getState().load()
  }, [])

  useEffect(() => {
    if (isOnline && !wasOnlineRef.current && isAuthenticated) {
      useOfflineQueueStore.getState().flush()
      useOfflineLessonQueueStore.getState().flush()
      usePublicDecksStore.getState().flushQueues()
    }
    wasOnlineRef.current = isOnline
  }, [isOnline, isAuthenticated])

  // ── Deep linking ────────────────────────────────────────────────────────────
  // Already-authenticated users: navigate straight away (cold start + foreground).
  // Unauthenticated users: queue the URL and replay it once login completes,
  // since the auth guard below would otherwise redirect them to /(auth)/login.
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (!url) return
      if (isAuthenticated && !isLoading) {
        const route = parseDeepLink(url)
        if (route) setTimeout(() => router.push(route as any), 600)
      } else if (!isLoading) {
        usePendingDeepLinkStore.getState().setPending(url)
      }
    }).catch(() => {})
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isAuthenticated) {
        const route = parseDeepLink(url)
        if (route) router.push(route as any)
      } else {
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
    <AppErrorBoundary>
      <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bgPrimary }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        {/* A Stack, not a Slot: a Slot renders only the focused group, so
            opening any (screens) route unmounted the whole tab navigator
            and going back rebuilt it from scratch — the ~1s freeze on back
            in release builds. The Stack keeps (tabs) mounted underneath.
            dangerouslySingular: a push to any /(tabs)/… route from a pushed
            screen reuses the one tab navigator instead of stacking a copy.
            Protected: on logout the app's screens are dropped from the
            history, so they don't stay mounted (with no user) under login. */}
        <Stack screenOptions={{ headerShown: false, freezeOnBlur: true, animation: pushAnimation(reduceMotion), contentStyle: { backgroundColor: c.bgPrimary } }}>
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)"    options={{ animation: 'fade' }} dangerouslySingular />
            <Stack.Screen name="(screens)" />
          </Stack.Protected>
          <Stack.Screen name="(auth)"       options={{ animation: 'fade' }} />
          <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
        </Stack>
        <OfflineBanner />
        <NotifToast />
        <AppIntroModal visible={showAppIntro} onFinish={dismissAppIntro} />
        {hasAnnouncement && <AnnouncementModal />}
        <RewardModal visible={rewardModalVisible} rewards={pendingRewards} onClose={dismissRewards} />
      </GestureHandlerRootView>
      </ThemeProvider>
    </AppErrorBoundary>
  )
}
