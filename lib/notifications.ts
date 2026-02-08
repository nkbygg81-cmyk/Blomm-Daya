import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// --- Configure how notifications are displayed when app is in foreground ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- Android notification channel (required for Android 8+) ---
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C44569",
      sound: "default",
    });
  }
}

// --- Resolve Expo project ID from Constants ---
function getProjectId(): string | undefined {
  const c = Constants as any;
  return (
    c.easConfig?.projectId ??
    c.expoConfig?.extra?.eas?.projectId ??
    c.manifest2?.extra?.eas?.projectId ??
    c.manifest?.extra?.eas?.projectId ??
    undefined
  );
}

// --- Diagnostics (useful for debugging) ---
export function getPushDiagnostics() {
  const c = Constants as any;
  return {
    platform: Platform.OS,
    isDevice: Platform.OS !== "web",
    projectId: getProjectId() ?? null,
    executionEnvironment: c.executionEnvironment ?? "unknown",
    appOwnership: c.appOwnership ?? "unknown",
  };
}

// --- Request permission and get Expo push token ---
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push tokens only work on real devices (not web)
  if (Platform.OS === "web") {
    console.log("[Push] Web platform — skipping token registration");
    return null;
  }

  await ensureAndroidChannel();

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (finalStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Push] Permission not granted:", finalStatus);
    return null;
  }

  // Get Expo push token
  const projectId = getProjectId();
  console.log("[Push] Getting token with projectId:", projectId ?? "none");

  try {
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    console.log("[Push] Token obtained:", tokenResponse.data.substring(0, 30) + "...");
    return tokenResponse.data;
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    console.error("[Push] Failed to get token:", msg);

    // Re-throw with a clear message
    if (/firebase/i.test(msg)) {
      throw new Error(
        "Push-сповіщення потребують нової нативної збірки з Firebase (FCM). OTA-оновлення не може це виправити."
      );
    }
    throw new Error(`Push token error: ${msg}`);
  }
}

// --- Listeners ---
export function addNotificationReceivedListener(
  callback: (notification: any) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: any) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// --- Badge ---
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}

// --- Local notifications ---
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  trigger?: Date | number
) {
  return await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: trigger
      ? { date: trigger instanceof Date ? trigger : new Date(trigger) }
      : null,
  });
}