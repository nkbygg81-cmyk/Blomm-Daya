import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { registerForPushNotificationsAsync } from "../lib/notifications";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { getPushDiagnostics } from "../lib/notifications";
import { useTranslation } from "../lib/i18n/useTranslation";

declare const __DEV__: boolean;

type Props = {
  onBack: () => void;
  onNotificationPress?: (data: any) => void;
};

export function NotificationsScreen({ onBack, onNotificationPress }: Props) {
  const [userId, setUserId] = useState<string>("");
  const [testingPush, setTestingPush] = useState(false);
  const [reregistering, setReregistering] = useState(false);
  const { t } = useTranslation();

  const sendPush = useAction(api.notifications.sendPushNotification);
  const registerPushToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    const loadUserId = async () => {
      // Buyers are identified for push by a stable device id (see App.tsx + orderTracking.ts).
      const deviceId = await getBuyerDeviceId();
      setUserId(deviceId);

      // Legacy cleanup: remove old key if it exists.
      const legacy = await AsyncStorage.getItem("buyerId");
      if (legacy) {
        await AsyncStorage.removeItem("buyerId");
      }
    };
    void loadUserId();
  }, []);

  const tokens = useQuery(
    api.notifications.getUserTokens,
    userId ? { userId, userType: "buyer" } : "skip"
  );

  const notifications = useQuery(
    api.notifications.getHistory,
    userId ? { userId, userType: "buyer", limit: 50 } : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    userId ? { userId, userType: "buyer" } : "skip"
  );

  const settings = useQuery(
    api.notifications.getPreferences,
    userId ? { userId, userType: "buyer" } : "skip"
  );

  const markAsRead = useMutation(api.notifications.markAsRead);
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  const handleReregisterPushToken = async () => {
    setReregistering(true);
    try {
      const expoToken = await registerForPushNotificationsAsync();
      if (!expoToken) {
        const perms = await Notifications.getPermissionsAsync();
        const status = perms.status;

        if (!Device.isDevice) {
          Alert.alert(
            t("notifications.error"),
            t("notifications.unavailableOnSim"),
            [{ text: "OK" }]
          );
          return;
        }

        Alert.alert(
          t("notifications.noAccess"),
          t("notifications.permissionStatus", { status: String(status) }),
          [
            { text: t("notifications.cancel"), style: "cancel" },
            { text: t("notifications.openSettings"), onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }

      await registerPushToken({
        userId,
        userType: "buyer",
        token: expoToken,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });

      Alert.alert(t("notifications.done"), t("notifications.tokenUpdated"));
    } catch (e: any) {
      Alert.alert(t("notifications.error"), String(e?.message ?? e));
    } finally {
      setReregistering(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    try {
      const perms = await Notifications.getPermissionsAsync();
      const diag = getPushDiagnostics();
      const c = Constants as any;

      const text = [
        `platform: ${diag.platform}`,
        `isDevice: ${diag.isDevice}`,
        `native build: ${String(c.nativeBuildVersion ?? "?")}`,
        `native version: ${String(c.nativeAppVersion ?? "?")}`,
        `executionEnvironment: ${diag.executionEnvironment}`,
        `projectId: ${diag.projectId ?? "(missing)"}`,
        `permission status: ${String(perms.status)}`,
        `push tokens stored: ${Array.isArray(tokens) ? tokens.length : "(loading...)"}`,
      ].join("\n");

      await Clipboard.setStringAsync(text);
      Alert.alert(t("notifications.done"), t("notifications.diagnosticsCopied"));
    } catch (e: any) {
      Alert.alert(t("notifications.error"), String(e?.message ?? e));
    }
  };

  const handleTestPushNotification = async () => {
    setTestingPush(true);
    try {
      const res = await sendPush({
        userId,
        userType: "buyer",
        title: t("notifications.testPushTitle"),
        body: t("notifications.testPushBody"),
        data: { type: "test_push" },
        type: "messages",
      });
      Alert.alert(t("notifications.sent"), `success=${res.success}, sent=${res.sentCount}`);
    } catch (e: any) {
      Alert.alert(t("notifications.error"), String(e?.message ?? e));
    } finally {
      setTestingPush(false);
    }
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead({ notificationId: notification.id });
    }

    if (onNotificationPress && notification.data) {
      onNotificationPress(notification.data);
    }
  };

  const togglePreference = async (key: string, value: boolean) => {
    if (!userId) return;
    await updatePreferences({
      userId,
      userType: "buyer",
      [key]: value,
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "orders":
        return "receipt";
      case "messages":
        return "chatbubble-ellipses";
      case "reminders":
        return "notifications";
      case "promotions":
        return "pricetag";
      case "consultations":
        return "people";
      default:
        return "notifications";
    }
  };

  const renderNotification = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={item.read ? colors.muted : colors.primary}
        />
      </View>

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.notificationTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationTime}>
          {new Date(item.sentAt).toLocaleString(t("dateLocale"), {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const PreferenceItem = ({ label, icon, value, onToggle }: any) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceInfo}>
        <Ionicons name={icon} size={22} color={colors.text} />
        <Text style={styles.preferenceLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: `${colors.primary}60` }}
        thumbColor={value ? colors.primary : colors.muted}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t("notifications.title")}</Text>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} {t("notifications.unread")}</Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Preferences Section */}
      {settings && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("notifications.settingsTitle")}</Text>

          {__DEV__ && (
            <>
              <View style={styles.diagnosticsRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
                <Text style={styles.diagnosticsText}>
                  native build: {String((Constants as any).nativeBuildVersion ?? "?")} | version:{" "}
                  {String((Constants as any).nativeAppVersion ?? "?")}
                </Text>
              </View>

              <View style={styles.diagnosticsRow}>
                <Ionicons name="key-outline" size={18} color={colors.muted} />
                <Text style={styles.diagnosticsText}>
                  {t("notifications.pushTokens")}: {Array.isArray(tokens) ? tokens.length : "..."}
                </Text>
              </View>

              <TouchableOpacity style={styles.diagnosticsButton} onPress={() => void handleCopyDiagnostics()}>
                <Ionicons name="copy-outline" size={18} color={colors.text} />
                <Text style={styles.diagnosticsButtonText}>{t("notifications.copyDiagnostics")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.diagnosticsButton, reregistering && { opacity: 0.6 }]}
                disabled={reregistering}
                onPress={() => void handleReregisterPushToken()}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.text} />
                <Text style={styles.diagnosticsButtonText}>
                  {reregistering ? t("notifications.updatingToken") : t("notifications.updatePushToken")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.diagnosticsButton, testingPush && { opacity: 0.6 }]}
                disabled={testingPush}
                onPress={() => void handleTestPushNotification()}
              >
                <Ionicons name="send-outline" size={18} color={colors.text} />
                <Text style={styles.diagnosticsButtonText}>
                  {testingPush ? t("notifications.sending") : t("notifications.testPush")}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <PreferenceItem
            label={t("notifications.prefOrders")}
            icon="receipt-outline"
            value={settings.orders}
            onToggle={(v: boolean) => togglePreference("orders", v)}
          />
          <PreferenceItem
            label={t("notifications.prefMessages")}
            icon="chatbubble-ellipses-outline"
            value={settings.messages}
            onToggle={(v: boolean) => togglePreference("messages", v)}
          />
          <PreferenceItem
            label={t("notifications.prefReminders")}
            icon="notifications-outline"
            value={settings.reminders}
            onToggle={(v: boolean) => togglePreference("reminders", v)}
          />
          <PreferenceItem
            label={t("notifications.prefConsultations")}
            icon="people-outline"
            value={settings.consultations}
            onToggle={(v: boolean) => togglePreference("consultations", v)}
          />
          <PreferenceItem
            label={t("notifications.prefPromo")}
            icon="pricetag-outline"
            value={settings.promotions}
            onToggle={(v: boolean) => togglePreference("promotions", v)}
          />
        </View>
      )}

      {/* Notifications List */}
      <Text style={styles.sectionTitle}>{t("notifications.history")}</Text>
      <FlatList
        data={notifications ?? []}
        keyExtractor={(item: any) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  unreadCount: {
    fontSize: 12,
    color: colors.primary,
    textAlign: "center",
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.white,
    marginVertical: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    textTransform: "uppercase",
  },
  diagnosticsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  diagnosticsText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  diagnosticsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  diagnosticsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferenceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 15,
    color: colors.text,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationCardUnread: {
    backgroundColor: `${colors.primary}05`,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notificationTitleUnread: {
    fontWeight: "700",
  },
  notificationBody: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 16,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.md,
  },
});

export default NotificationsScreen;