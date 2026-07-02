// Real notifications, restored after the launch crash that got expo-notifications
// pulled from the build entirely. Two defenses against a repeat:
//   1. LAZY import — the native module initializes on first use, off the app's
//      launch-critical path, instead of at bundle evaluation (the TurboModule
//      init crash happened during launch).
//   2. Every entry point swallows its own failures — notifications are an
//      enhancement; no notification path may ever take the app down.
import { ApiClient } from "./api";
import { logError } from "./logger";

type NotificationsModule = typeof import("expo-notifications");

let modPromise: Promise<NotificationsModule | null> | null = null;
function notifications(): Promise<NotificationsModule | null> {
  if (!modPromise) {
    modPromise = (async () => {
      try {
        const mod = await import("expo-notifications");
        mod.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        return mod;
      } catch (err) {
        logError("notifications:init", err);
        return null;
      }
    })();
  }
  return modPromise;
}

async function ensurePermission(mod: NotificationsModule): Promise<boolean> {
  const settings = await mod.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  return (await mod.requestPermissionsAsync()).granted;
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const mod = await notifications();
    if (!mod) return null;
    if (!(await ensurePermission(mod))) return null;
    // The EAS project id — required for a push token outside Expo Go.
    const token = await mod.getExpoPushTokenAsync({
      projectId: "1008eb2b-d74d-43c7-9337-6d14f5e1f7ed",
    });
    return token.data ?? null;
  } catch (err) {
    logError("notifications:register", err);
    return null;
  }
}

/** Register (asking permission if needed) and persist the Expo push token. */
export async function registerAndSaveToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (token) await ApiClient.savePushToken(token);
  } catch (err) {
    logError("notifications:saveToken", err);
  }
}

// ── Local daily reminders ─────────────────────────────────────────────────────

const MORNING_ID = "morning-reminder";
const NUDGE_ID = "daily-nudge";

async function scheduleDaily(id: string, hour: number, title: string, body: string) {
  try {
    const mod = await notifications();
    if (!mod || !(await ensurePermission(mod))) return;
    // Replace rather than stack — scheduling is idempotent per identifier.
    await mod.cancelScheduledNotificationAsync(id).catch(() => {});
    await mod.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: "default" },
      trigger: { type: mod.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
    });
  } catch (err) {
    logError("notifications:schedule", err);
  }
}

async function cancelScheduled(id: string) {
  try {
    const mod = await notifications();
    if (mod) await mod.cancelScheduledNotificationAsync(id).catch(() => {});
  } catch (err) {
    logError("notifications:cancel", err);
  }
}

export async function scheduleMorningReminder(): Promise<void> {
  await scheduleDaily(
    MORNING_ID,
    7,
    "Start with the Word",
    "Take a few quiet minutes with God before the day gets loud."
  );
}
export async function cancelMorningReminder(): Promise<void> {
  await cancelScheduled(MORNING_ID);
}
export async function scheduleDailyNudge(): Promise<void> {
  await scheduleDaily(
    NUDGE_ID,
    20,
    "Still time today",
    "Your reading is waiting — finish today's devotional before the day ends."
  );
}
export async function cancelDailyNudge(): Promise<void> {
  await cancelScheduled(NUDGE_ID);
}

// ── Tap → screen routing ──────────────────────────────────────────────────────

/**
 * Route notification taps to the screen in their `data.url` payload — both the
 * tap that cold-started the app and taps while it's running. Returns a cleanup
 * function for the live listener.
 */
export async function wireNotificationRouting(onUrl: (url: string) => void): Promise<() => void> {
  try {
    const mod = await notifications();
    if (!mod) return () => {};
    try {
      const last = await mod.getLastNotificationResponseAsync();
      const url = last?.notification.request.content.data?.url;
      if (typeof url === "string") onUrl(url);
    } catch {
      // No cold-start response to replay.
    }
    const sub = mod.addNotificationResponseReceivedListener((resp) => {
      const url = resp.notification.request.content.data?.url;
      if (typeof url === "string") onUrl(url);
    });
    return () => sub.remove();
  } catch (err) {
    logError("notifications:routing", err);
    return () => {};
  }
}
