/**
 * timerBackground.ts — background-safe focus timer support
 *
 * Strategy: at timer START we pre-schedule a notification for EVERY phase
 * transition in the full session plan. This means even if the app is never
 * opened again, the user sees:
 *   • "Session 1 done — rest 5 min" when focus 1 ends
 *   • "Session 2 starting!" when break ends
 *   • "All done!" when the last session ends
 * On pause all notifications are cancelled; on resume they are rescheduled.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// Lazy-required — expo-notifications crashes on init in Expo Go SDK 53
let Notifications: typeof import('expo-notifications') | null = null
try { Notifications = require('expo-notifications') } catch {}

const TIMER_KEY        = 'focus_timer_bg_v2'
// Android notification channels are immutable after first creation — once a
// channel ID exists on-device, changing its config here (e.g. adding sound)
// has NO effect for users who already have it, because setNotificationChannelAsync
// only creates-or-no-ops, it never updates. This is why backgrounded timer
// notifications were showing (banner) but silent for existing installs. Bump
// this ID (never re-use an old one) any time the channel config below changes.
const CHANNEL_ID       = 'focus-timer-v2'

// ── Saved state (persisted across app restarts) ───────────────────────────────

export interface SavedTimerState {
  targetEnd:         number    // abs ms when current phase ends
  plannedMinutes:    number
  phase:             'focus' | 'break'
  currentSession:    number
  totalSessions:     number
  completedSessions: number    // focus sessions whose XP has been awarded
}

export async function saveTimerState(s: SavedTimerState) {
  await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(s))
}

export async function loadTimerState(): Promise<SavedTimerState | null> {
  try {
    const raw = await AsyncStorage.getItem(TIMER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export async function clearTimerState() {
  await AsyncStorage.removeItem(TIMER_KEY)
}

// ── Permissions / channel setup ───────────────────────────────────────────────

export async function setupTimerNotifications(): Promise<boolean> {
  if (!Notifications) return false
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name:             'Fokus taymer',
      importance:       Notifications.AndroidImportance.HIGH,
      sound:            'default',
      enableVibrate:    true,
      vibrationPattern: [0, 250, 250, 250],
      showBadge:        true,
    })
  }
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

const TIMER_END_NOTIF_ID_KEY = 'focus_timer_end_notif_id'

/** Schedule a single notification for when the current phase ends. */
export async function scheduleTimerEndNotification(
  targetEndMs: number | null,
  phase: 'focus' | 'break',
) {
  if (!Notifications || !targetEndMs) return
  try {
    // Cancel any previous single-shot end notification
    const prevId = await AsyncStorage.getItem(TIMER_END_NOTIF_ID_KEY).catch(() => null)
    if (prevId) await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {})

    const secondsUntilEnd = Math.floor((targetEndMs - Date.now()) / 1000)
    if (secondsUntilEnd <= 2) return

    const title = phase === 'focus' ? 'Seans tugadi! 🎉' : 'Tanaffus tugadi! 💪'
    const body  = phase === 'focus' ? 'Ajoyib! Dam oling.' : 'Yana diqqat seansi boshlaylik!'

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: {
        type:      Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds:   secondsUntilEnd,
        repeats:   false,
        // channelId belongs on the TRIGGER (TimeIntervalTriggerInput), not
        // content — content.sound is ignored on Android 8+ entirely; sound
        // is controlled purely by whichever channel the notification is
        // routed to. Without this, Android falls back to some default
        // channel instead of CHANNEL_ID's configured sound/importance,
        // which is why backgrounded-timer notifications showed with no sound.
        channelId: CHANNEL_ID,
      } as any,
    })
    await AsyncStorage.setItem(TIMER_END_NOTIF_ID_KEY, id).catch(() => {})
  } catch {}
}

/** Cancel the single-shot timer-end notification. */
export async function cancelTimerEndNotification() {
  if (!Notifications) return
  try {
    const id = await AsyncStorage.getItem(TIMER_END_NOTIF_ID_KEY).catch(() => null)
    if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    await AsyncStorage.removeItem(TIMER_END_NOTIF_ID_KEY).catch(() => {})
  } catch {}
}
