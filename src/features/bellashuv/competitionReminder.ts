/**
 * "Eslatma qoʻyish": one local notification when a competition starts.
 * expo-notifications is lazy-required (as in lib/streakNotifications.ts) so
 * a missing module can't crash the screen. Which competitions have a
 * reminder is remembered so the button can read "Eslatma qoʻyildi".
 */
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

let Notifications: typeof import('expo-notifications') | null = null
try { Notifications = require('expo-notifications') } catch {}

const KEY = 'sahifalab_competition_reminders_v1'
const CHANNEL = 'competition-reminder'
const idFor = (challengeId: string) => `sahifalab-competition-${challengeId}`

async function readSet(): Promise<Record<string, string>> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') } catch { return {} }
}

export async function hasReminder(challengeId: string): Promise<boolean> {
  return !!(await readSet())[challengeId]
}

/** Schedules the start reminder. Returns false when it can't (no module,
 *  no permission, or the start is already past). */
export async function setReminder(c: { id: string; slug: string; title: string; starts_at: string }): Promise<boolean> {
  if (!Notifications) return false
  const at = new Date(c.starts_at)
  if (!(at.getTime() > Date.now())) return false

  const perm = await Notifications.getPermissionsAsync().catch(() => null)
  let granted = !!perm?.granted
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync().catch(() => null)
    granted = !!asked?.granted
  }
  if (!granted) return false

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Bellashuv eslatmalari',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    }).catch(() => {})
  }
  await Notifications.cancelScheduledNotificationAsync(idFor(c.id)).catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: idFor(c.id),
    content: {
      title: 'Bellashuv boshlandi! 🏆',
      body: c.title,
      data: { screen: 'challenge', slug: c.slug },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
    },
    trigger: {
      type: (Notifications as any).SchedulableTriggerInputTypes?.DATE ?? 'date',
      date: at,
    } as any,
  })

  const set = await readSet()
  set[c.id] = c.starts_at
  await AsyncStorage.setItem(KEY, JSON.stringify(set)).catch(() => {})
  return true
}
