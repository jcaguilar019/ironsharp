import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { ApiClient } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MORNING_REMINDER_ID = "morning-reminder";
const DAILY_NUDGE_ID = "daily-nudge";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function registerAndSaveToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (token) await ApiClient.savePushToken(token);
  } catch {
    // Non-fatal
  }
}

export async function scheduleMorningReminder(hour = 7, minute = 0): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_REMINDER_ID,
      content: {
        title: "Morning devotional",
        body: "Start your day in the Word.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {
    // Non-fatal
  }
}

export async function cancelMorningReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
  } catch {
    // Non-fatal
  }
}

export async function scheduleDailyNudge(hour = 15, minute = 0): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_NUDGE_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_NUDGE_ID,
      content: {
        title: "Don't forget",
        body: "You haven't completed today's devotional yet.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {
    // Non-fatal
  }
}

export async function cancelDailyNudge(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_NUDGE_ID);
  } catch {
    // Non-fatal
  }
}
