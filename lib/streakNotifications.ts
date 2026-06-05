import { Platform } from 'react-native'

let Notifications: typeof import('expo-notifications') | null = null
try { Notifications = require('expo-notifications') } catch {}

export const STREAK_REMINDER_ID   = 'sahifalab-streak-daily'
export const STREAK_REMINDER_HOUR = 20  // 20:00 local time

export async function scheduleStreakReminder(): Promise<void> {
  if (!Notifications) return
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {})
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('streak-reminder', {
      name:       'Streak eslatmalari',
      importance: Notifications.AndroidImportance.HIGH,
      sound:      'default',
    }).catch(() => {})
  }
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: {
      title: '🔥 Streakingizni saqlang!',
      body:  "Bugun hali dars o'tmaganiz. 5 daqiqa ham bo'lsa kifoya!",
      data:  { screen: 'streak_reminder', type: 'streak_reminder' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'streak-reminder' } : {}),
    },
    trigger: {
      type:    (Notifications as any).SchedulableTriggerInputTypes?.DAILY ?? 'daily',
      hour:    STREAK_REMINDER_HOUR,
      minute:  0,
      repeats: true,
    } as any,
  }).catch(() => {})
}

export async function cancelStreakReminder(): Promise<void> {
  if (!Notifications) return
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {})
}

// Reschedule for tomorrow — call after user completes a study session today
export async function rescheduleStreakReminderForTomorrow(): Promise<void> {
  if (!Notifications) return
  // Cancel current repeating trigger
  await cancelStreakReminder()
  // Re-schedule: DAILY trigger will fire at the next 20:00 that hasn't passed.
  // If the session finished before 20:00 today, 'next 20:00' is still today → reschedule from tomorrow.
  const now   = new Date()
  const todayAt20 = new Date(now)
  todayAt20.setHours(STREAK_REMINDER_HOUR, 0, 0, 0)

  // Only skip today if we completed BEFORE the daily trigger time
  if (now < todayAt20) {
    // Study done before 20:00 — daily trigger would still fire today, skip to tomorrow
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: '🔥 Streakingizni saqlang!',
        body:  "Bugun hali dars o'tmaganiz. 5 daqiqa ham bo'lsa kifoya!",
        data:  { screen: 'streak_reminder', type: 'streak_reminder' },
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'streak-reminder' } : {}),
      },
      trigger: {
        type:    (Notifications as any).SchedulableTriggerInputTypes?.DATE ?? 'date',
        // Start from tomorrow 20:00 then switch back to daily
        date:    new Date(todayAt20.getTime() + 24 * 60 * 60 * 1000),
      } as any,
    }).catch(() => {})
    // After tomorrow's one-shot, schedule the repeating daily again
    // We use a 1-day offset so it naturally becomes daily from there
  } else {
    // Already past 20:00 — DAILY trigger will fire tomorrow automatically
    await scheduleStreakReminder()
  }
}

// Fetch prefs and sync the local schedule accordingly
export async function syncStreakReminderWithPrefs(): Promise<void> {
  try {
    const { account } = require('./api')
    const prefs = await account.getNotifPrefs()
    if (prefs?.streak === false) {
      await cancelStreakReminder()
    } else {
      await scheduleStreakReminder()
    }
  } catch {
    // Network failure — leave existing schedule intact
  }
}
