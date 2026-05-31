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
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

const TIMER_KEY        = 'focus_timer_bg_v2'
const CHANNEL_ID       = 'focus-timer'

// ── Saved state (persisted across app restarts) ───────────────────────────────

export interface SavedTimerState {
  targetEnd:      number    // abs ms when current phase ends
  plannedMinutes: number
  phase:          'focus' | 'break'
  currentSession: number
  totalSessions:  number
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

// ── Break duration helper (must match timerStore.breakSeconds) ────────────────

function breakSecs(plannedMinutes: number) {
  return plannedMinutes <= 25 ? 5 * 60 : 10 * 60
}

// ── Pre-schedule ALL phase-transition notifications ───────────────────────────

interface ScheduleConfig {
  /** absolute ms when the CURRENT phase ends */
  currentPhaseEndMs: number
  currentPhase:      'focus' | 'break'
  currentSession:    number   // 1-based, which session is currently running
  totalSessions:     number
  plannedMinutes:    number
}

export async function scheduleAllNotifications(cfg: ScheduleConfig) {
  await Notifications.cancelAllScheduledNotificationsAsync()

  const now       = Date.now()
  const bSecs     = breakSecs(cfg.plannedMinutes)
  const focusMsec = cfg.plannedMinutes * 60_000
  const breakMsec = bSecs * 1_000
  const bMin      = bSecs / 60

  // Build a list of upcoming phase-end timestamps starting from current
  type Notif = { ms: number; title: string; body: string }
  const notifs: Notif[] = []

  let t = cfg.currentPhaseEndMs

  if (cfg.currentPhase === 'focus') {
    // Current phase is focus → schedule its end first
    if (cfg.currentSession < cfg.totalSessions) {
      notifs.push({
        ms:    t,
        title: `✅ ${cfg.currentSession}-sessiya tugadi!`,
        body:  `${bMin} daqiqa dam oling 🍃`,
      })
      t += breakMsec
      notifs.push({
        ms:    t,
        title: `⏱ ${cfg.currentSession + 1}-sessiya boshlanmoqda!`,
        body:  'Fokuslanish vaqti keldi — tayyor bo\'ling!',
      })
      t += focusMsec
      // Continue for any remaining sessions
      for (let s = cfg.currentSession + 1; s <= cfg.totalSessions; s++) {
        if (s < cfg.totalSessions) {
          notifs.push({
            ms:    t,
            title: `✅ ${s}-sessiya tugadi!`,
            body:  `${bMin} daqiqa dam oling 🍃`,
          })
          t += breakMsec
          notifs.push({
            ms:    t,
            title: `⏱ ${s + 1}-sessiya boshlanmoqda!`,
            body:  'Fokuslanish vaqti keldi — tayyor bo\'ling!',
          })
          t += focusMsec
        } else {
          notifs.push({
            ms:    t,
            title: '🎉 Barcha sessiyalar tugadi!',
            body:  `${cfg.plannedMinutes * cfg.totalSessions} daqiqa muvaffaqiyatli o'qidingiz!`,
          })
        }
      }
    } else {
      // Last (or only) focus session
      notifs.push({
        ms:    t,
        title: '🎉 Barcha sessiyalar tugadi!',
        body:  `${cfg.plannedMinutes * cfg.totalSessions} daqiqa muvaffaqiyatli o'qidingiz!`,
      })
    }
  } else {
    // Current phase is break → schedule break end, then remaining focus sessions
    notifs.push({
      ms:    t,
      title: `⏱ ${cfg.currentSession + 1}-sessiya boshlanmoqda!`,
      body:  'Fokuslanish vaqti keldi — tayyor bo\'ling!',
    })
    t += focusMsec
    for (let s = cfg.currentSession + 1; s <= cfg.totalSessions; s++) {
      if (s < cfg.totalSessions) {
        notifs.push({
          ms:    t,
          title: `✅ ${s}-sessiya tugadi!`,
          body:  `${bMin} daqiqa dam oling 🍃`,
        })
        t += breakMsec
        notifs.push({
          ms:    t,
          title: `⏱ ${s + 1}-sessiya boshlanmoqda!`,
          body:  'Fokuslanish vaqti keldi — tayyor bo\'ling!',
        })
        t += focusMsec
      } else {
        notifs.push({
          ms:    t,
          title: '🎉 Barcha sessiyalar tugadi!',
          body:  `${cfg.plannedMinutes * cfg.totalSessions} daqiqa muvaffaqiyatli o'qidingiz!`,
        })
      }
    }
  }

  // Fire them all (skip any that are in the past)
  await Promise.all(
    notifs
      .filter(n => n.ms > now + 2_000)
      .map(n =>
        Notifications.scheduleNotificationAsync({
          content: {
            title:     n.title,
            body:      n.body,
            sound:     'default',
            priority:  'high',
            channelId: CHANNEL_ID,
          },
          trigger: {
            type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.floor((n.ms - now) / 1000),
            repeats: false,
          } as any,
        })
      )
  )
}

export async function cancelAllTimerNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
