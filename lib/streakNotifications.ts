import { Platform } from "react-native";

let Notifications: typeof import("expo-notifications") | null = null;
try {
  Notifications = require("expo-notifications");
} catch {}

export const STREAK_REMINDER_ID = "sahifalab-streak-daily";
export const STREAK_REMINDER_HOUR = 20; // 20:00 local time

const MOTIVATIONAL_MESSAGES = [
  "Bugun hali dars o'tmagansiz. 5 daqiqa bo'lsa ham kifoya!",
  "Daraxtingiz sizni kutmoqda 🌱",
  "Seriyangizni saqlang! Bugun ham o'qing 📚",
  "Kechqurun siz uchun ideal vaqt — 10 daqiqa ajrating!",
  "Eng qiyini boshlash. Siz esa uni uddalay olasiz! 💪",
  "Bugun o'qimagan odam ertaga ham o'qimaydi. Seriyani saqlang!",
  "Maqsadingizga bir qadam yaqinlashing — bugun ham o'qing 🔥",
  "Top o'quvchilar har kuni o'qiydi. Siz ham ulardanmisiz? 🏆",
  "Kecha ham o'qidingiz, bugun ham o'qing — seriya davom etsin!",
  "Faqat 5 daqiqa! Kichik harakat katta natija beradi 🚀",
  "Bilim to'planib boradi — bugun ham bir ulush qo'shing 📖",
  "Daraxtingizni sovuqdan saqlab qoling! Hoziroq o'qing ❄️",
  "Uydamisiz? Vaqtingiz bormi? ozroq o'qing ",
  "Nima qilyapsiz? bugun kelmadingiz-ku?!",
  "Yo'qlamasak eslamaysiz ham, 10 daqiqa ajrating",
];

function randomMessage(): string {
  return MOTIVATIONAL_MESSAGES[
    Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
  ];
}

export async function scheduleStreakReminder(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(
    STREAK_REMINDER_ID,
  ).catch(() => {});
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("streak-reminder", {
      name: "Streak eslatmalari",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    }).catch(() => {});
  }
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: {
      title: "🔥 Streakingizni saqlang!",
      body: randomMessage(),
      data: { screen: "streak_reminder", type: "streak_reminder" },
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "streak-reminder" } : {}),
    },
    trigger: {
      type:
        (Notifications as any).SchedulableTriggerInputTypes?.DAILY ?? "daily",
      hour: STREAK_REMINDER_HOUR,
      minute: 0,
      repeats: true,
    } as any,
  }).catch(() => {});
}

export async function cancelStreakReminder(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(
    STREAK_REMINDER_ID,
  ).catch(() => {});
}

// Call after user achieves today's daily goal — cancels today's reminder.
// The next app open will re-register it via syncStreakReminderWithPrefs().
export async function rescheduleStreakReminderForTomorrow(): Promise<void> {
  await cancelStreakReminder();
}

// Fetch prefs and sync the local schedule accordingly
export async function syncStreakReminderWithPrefs(): Promise<void> {
  try {
    const { account } = require("./api");
    const prefs = await account.getNotifPrefs();
    if (prefs?.streak === false) {
      await cancelStreakReminder();
    } else {
      await scheduleStreakReminder();
    }
  } catch {
    // Network failure — leave existing schedule intact
  }
}
