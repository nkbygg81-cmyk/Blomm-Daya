import { StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Share, ScrollView } from "react-native";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "../lib/i18n/useTranslation";
import * as WebBrowser from "expo-web-browser";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

type Props = {
  onLogout: () => void | Promise<void>;
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
  onConsultationsPress?: () => void;
  onSupportPress?: () => void;
  onSubscriptionPress?: () => void;
  onLoyaltyPress?: () => void;
  onFloristsPress?: () => void;
  onRemindersPress?: () => void;
  authToken?: string;
};

export function BuyerSettingsScreen({
  onLogout,
  onProfilePress,
  onNotificationsPress,
  onConsultationsPress,
  onSupportPress,
  onSubscriptionPress,
  onLoyaltyPress,
  onFloristsPress,
  onRemindersPress,
  authToken,
}: Props) {
  const { t, locale, changeLocale } = useTranslation();
  const deleteBuyerAccount = useMutation(api.accountDeletion.deleteBuyerAccount);
  const [deleting, setDeleting] = useState(false);
  const platformSettings = useQuery(api.admin.getPlatformSettings, {});
  
  const openExternalUrl = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) throw new Error("Cannot open URL");
        await Linking.openURL(url);
      } catch {
        Alert.alert(t("common.error"), t("common.tryAgain"));
      }
    }
  };
  
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

  const handleSwitchToFlorist = () => {
    Alert.alert(
      t("role.florist"),
      t("florist.backToBuyer"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: async () => {
            await AsyncStorage.removeItem("userRole");
            void onLogout();
          },
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t("settings.language"),
      "Select language / Välj språk / Оберіть мову",
      [
        {
          text: "Українська",
          onPress: () => changeLocale("uk"),
        },
        {
          text: "Svenska",
          onPress: () => changeLocale("sv"),
        },
        {
          text: "English",
          onPress: () => changeLocale("en"),
        },
        { text: t("common.cancel"), style: "cancel" },
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
            // Second confirmation
            Alert.alert(
              t("settings.deleteAccountConfirm"),
              "",
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("settings.deleteAccount"),
                  style: "destructive",
                  onPress: async () => {
                    if (!authToken) return;
                    setDeleting(true);
                    try {
                      await deleteBuyerAccount({ token: authToken });
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
    {
      icon: "language-outline",
      label: t("settings.language"),
      sublabel: locale === "sv" ? "Svenska" : locale === "en" ? "English" : "Українська",
      onPress: handleLanguageChange,
    },
    {
      icon: "storefront-outline",
      label: t("tabs.florists"),
      sublabel: t("settings.floristsSubtext"),
      onPress: onFloristsPress,
    },
    {
      icon: "calendar-outline",
      label: t("tabs.reminders"),
      sublabel: t("settings.remindersSubtext"),
      onPress: onRemindersPress,
    },
    {
      icon: "person-outline",
      label: t("settings.profile"),
      onPress: onProfilePress,
    },
    {
      icon: "notifications-outline",
      label: t("settings.notifications"),
      onPress: onNotificationsPress,
    },
    {
      icon: "flower-outline",
      label: t("settings.subscription"),
      sublabel: t("settings.subscriptionSubtext"),
      onPress: onSubscriptionPress,
    },
    ...(platformSettings?.loyaltyEnabled !== false ? [{
      icon: "star-outline" as const,
      label: t("settings.loyalty"),
      sublabel: t("settings.loyaltySubtext"),
      onPress: onLoyaltyPress,
    }] : []),
    {
      icon: "chatbubble-ellipses-outline",
      label: t("settings.floristChat"),
      onPress: onConsultationsPress,
    },
    {
      icon: "help-circle-outline",
      label: t("settings.support"),
      onPress: onSupportPress,
    },
    {
      icon: "document-text-outline",
      label: t("settings.privacy"),
      onPress: () => {
        void Linking.openURL("https://little-coyote-905.convex.site/privacy");
      },
    },
    {
      icon: "document-outline",
      label: t("settings.terms"),
      onPress: () => {
        void Linking.openURL("https://little-coyote-905.convex.site/terms");
      },
    },
    {
      icon: "share-social-outline",
      label: t("settings.shareApp"),
      onPress: handleShareApp,
    },
    {
      icon: "swap-horizontal-outline",
      label: t("settings.switchToFlorist"),
      onPress: handleSwitchToFlorist,
      color: colors.success,
    },
    {
      icon: "log-out-outline",
      label: t("settings.logout"),
      onPress: handleLogout,
      color: colors.danger,
    },
    {
      icon: "trash-outline",
      label: deleting ? t("settings.deleting") : t("settings.deleteAccount"),
      onPress: deleting ? undefined : handleDeleteAccount,
      color: colors.danger,
    },
  ].filter((i) => !!i.onPress);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t("settings.title")}</Text>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index === menuItems.length - 1 && styles.menuItemLast,
            ]}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon as any} size={24} color={item.color || colors.text} />
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, item.color && { color: item.color }]}>{item.label}</Text>
              {item.sublabel && (
                <Text style={styles.menuItemSublabel}>{item.sublabel}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        ))}
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
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
  },
  menuItemSublabel: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
});