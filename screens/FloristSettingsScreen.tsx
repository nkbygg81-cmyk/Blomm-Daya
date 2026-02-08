import { StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Platform, Share, ScrollView } from "react-native";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { scheduleLocalNotification, registerForPushNotificationsAsync } from "../lib/notifications";
import { useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

type Props = {
  onLogout: () => void | Promise<void>;
  onProfilePress?: () => void;
  onFinancialReportsPress?: () => void;
  onCalendarPress?: () => void;
  onStoriesPress?: () => void;
  onNotificationsPress?: () => void;
  onReviewsPress?: () => void;
  onPaymentsPress?: () => void;
  floristId: string;
};

export function FloristSettingsScreen({ 
  onLogout, 
  onProfilePress,
  onFinancialReportsPress,
  onCalendarPress,
  onStoriesPress,
  onNotificationsPress,
  onReviewsPress,
  onPaymentsPress,
  floristId,
}: Props) {
  const { t } = useTranslation();
  const sendPush = useAction(api.notifications.sendPushNotification);
  const registerPushToken = useMutation(api.notifications.registerPushToken);
  const deleteFloristAccount = useMutation(api.accountDeletion.deleteFloristAccount);
  const tokens = useQuery(api.notifications.getUserTokens, {
    userId: floristId,
    userType: "florist",
  });
  const [testingPush, setTestingPush] = useState(false);
  const [reregistering, setReregistering] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      t("settings.logout"),
      t("settings.logoutConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.logout"),
          style: "destructive",
          onPress: () => {
            void onLogout();
          },
        },
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: t("settings.shareApp") + " — Blomm Daya 🌸\nhttps://apps.apple.com/app/id6746205498",
      });
    } catch {}
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("settings.deleteAccount"),
      t("settings.deleteAccountWarning"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("settings.deleteAccountConfirm"),
              "",
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("settings.deleteAccount"),
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteFloristAccount({ floristId: floristId as any });
                      Alert.alert(t("settings.accountDeleted"), "", [
                        { text: t("common.ok"), onPress: () => void onLogout() },
                      ]);
                    } catch (e: any) {
                      Alert.alert(t("common.error"), String(e?.message ?? e));
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: "person-outline", label: t("settings.profile"), onPress: onProfilePress || (() => {}) },
    { icon: "notifications-outline", label: t("tabs.notifications"), onPress: onNotificationsPress || (() => {}) },
    { icon: "star-outline", label: t("tabs.reviews"), onPress: onReviewsPress || (() => {}) },
    { icon: "card-outline", label: t("tabs.payments"), onPress: onPaymentsPress || (() => {}) },
    { icon: "stats-chart-outline", label: t("settings.financialReports"), onPress: onFinancialReportsPress || (() => {}) },
    { icon: "calendar-outline", label: t("settings.calendar"), onPress: onCalendarPress || (() => {}) },
    { icon: "camera-outline", label: t("settings.stories"), sublabel: t("settings.storiesSubtext"), onPress: onStoriesPress || (() => {}) },
    { icon: "document-text-outline", label: t("settings.privacy"), onPress: () => void Linking.openURL("https://little-coyote-905.convex.site/privacy") },
    { icon: "document-outline", label: t("settings.terms"), onPress: () => void Linking.openURL("https://little-coyote-905.convex.site/terms") },
    { icon: "share-social-outline", label: t("settings.shareApp"), onPress: handleShareApp },
    { icon: "log-out-outline", label: t("settings.logout"), onPress: handleLogout, color: colors.danger },
    {
      icon: "trash-outline",
      label: deleting ? t("settings.deleting") : t("settings.deleteAccount"),
      onPress: deleting ? (() => {}) : handleDeleteAccount,
      color: colors.danger,
    },
  ];

  const handleTestLocalNotification = async () => {
    await scheduleLocalNotification(
      t("floristSettings.testNotificationTitle"),
      t("floristSettings.testNotificationBody"),
      { type: "test_local" }
    );
    Alert.alert(t("floristSettings.done"), t("floristSettings.localNotifScheduled"));
  };

  const handleTestPushNotification = async () => {
    setTestingPush(true);
    try {
      const res = await sendPush({
        userId: floristId,
        userType: "florist",
        title: t("floristSettings.testPushTitle"),
        body: t("floristSettings.testPushBody"),
        data: { type: "test_push" },
        type: "messages",
      });
      Alert.alert(t("floristSettings.sent"), `success=${res.success}, sent=${res.sentCount}`);
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e?.message ?? e));
    } finally {
      setTestingPush(false);
    }
  };

  const handleReregisterPushToken = async () => {
    setReregistering(true);
    try {
      const expoToken = await registerForPushNotificationsAsync();
      if (!expoToken) {
        const perms = await Notifications.getPermissionsAsync();
        const status = perms.status;

        if (!Device.isDevice) {
          Alert.alert(
            t("floristSettings.unavailable"),
            t("floristSettings.unavailableMessage"),
            [{ text: "OK" }]
          );
          return;
        }

        Alert.alert(
          t("floristSettings.noAccess"),
          t("floristSettings.permissionStatus", { status }),
          [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("floristSettings.openSettings"), onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }

      await registerPushToken({
        userId: floristId,
        userType: "florist",
        token: expoToken,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });

      Alert.alert(t("floristSettings.done"), t("floristSettings.tokenUpdated"));
    } catch (e: any) {
      Alert.alert(t("common.error"), String(e?.message ?? e));
    } finally {
      setReregistering(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t("settings.title")}</Text>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon as any} size={24} color={item.color || colors.text} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, item.color && { color: item.color }]}>{item.label}</Text>
              {"sublabel" in item && item.sublabel && (
                <Text style={styles.menuItemSublabel}>{item.sublabel}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.diagnostics}>
        <Text style={styles.diagnosticsTitle}>{t("floristSettings.diagnosticsTitle")}</Text>

        <View style={styles.diagnosticsRow}>
          <Ionicons name="key-outline" size={20} color={colors.muted} />
          <Text style={styles.diagnosticsRowText}>
            {t("floristSettings.pushTokens")}: {Array.isArray(tokens) ? tokens.length : "..."}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.diagnosticsButton, reregistering && { opacity: 0.6 }]}
          disabled={reregistering}
          onPress={() => void handleReregisterPushToken()}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.text} />
          <Text style={styles.diagnosticsButtonText}>
            {reregistering ? t("floristSettings.updatingToken") : t("floristSettings.updatePushToken")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.diagnosticsButton} onPress={() => void handleTestLocalNotification()}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          <Text style={styles.diagnosticsButtonText}>{t("floristSettings.testLocalNotification")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.diagnosticsButton, testingPush && { opacity: 0.6 }]}
          disabled={testingPush}
          onPress={() => void handleTestPushNotification()}
        >
          <Ionicons name="send-outline" size={20} color={colors.text} />
          <Text style={styles.diagnosticsButtonText}>
            {testingPush ? t("floristSettings.sendingPush") : t("floristSettings.testPushNotification")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemSublabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  diagnostics: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  diagnosticsTitle: {
    padding: spacing.md,
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  diagnosticsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  diagnosticsButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },
  diagnosticsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  diagnosticsRowText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: "600",
  },
});