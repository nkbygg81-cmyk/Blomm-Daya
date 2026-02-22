import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export interface FeatureFlags {
  subscriptions: boolean;
  consultations: boolean;
  giftCertificates: boolean;
  aiChat: boolean;
  referralProgram: boolean;
  loyaltyProgram: boolean;
  stories: boolean;
  orderTracking: boolean;
  reviews: boolean;
  pushNotifications: boolean;
  promoCodes: boolean;
  multiLanguage: boolean;
  darkMode: boolean;
  offlineMode: boolean;
  analytics: boolean;
  calendar: boolean;
  deliveryZones: boolean;
  expressDelivery: boolean;
  scheduledDelivery: boolean;
  reminders: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  subscriptions: true,
  consultations: true,
  giftCertificates: true,
  aiChat: true,
  referralProgram: true,
  loyaltyProgram: true,
  stories: true,
  orderTracking: true,
  reviews: true,
  pushNotifications: true,
  promoCodes: true,
  multiLanguage: true,
  darkMode: false,
  offlineMode: false,
  analytics: true,
  calendar: true,
  deliveryZones: true,
  expressDelivery: false,
  scheduledDelivery: true,
  reminders: true,
};

// Hook for reading feature flags from Convex
export function useFeatureFlags(): FeatureFlags {
  const settings = useQuery(api.admin.getAllSettings, {});

  if (!settings) {
    return DEFAULT_FLAGS;
  }

  const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]));

  return {
    subscriptions: settingsMap.get("feature_subscriptions") ?? DEFAULT_FLAGS.subscriptions,
    consultations: settingsMap.get("feature_consultations") ?? DEFAULT_FLAGS.consultations,
    giftCertificates: settingsMap.get("feature_gift_certificates") ?? DEFAULT_FLAGS.giftCertificates,
    aiChat: settingsMap.get("feature_ai_chat") ?? DEFAULT_FLAGS.aiChat,
    referralProgram: settingsMap.get("feature_referral_program") ?? DEFAULT_FLAGS.referralProgram,
    loyaltyProgram: settingsMap.get("feature_loyalty_program") ?? DEFAULT_FLAGS.loyaltyProgram,
    stories: settingsMap.get("feature_stories") ?? DEFAULT_FLAGS.stories,
    orderTracking: settingsMap.get("feature_order_tracking") ?? DEFAULT_FLAGS.orderTracking,
    reviews: settingsMap.get("feature_reviews") ?? DEFAULT_FLAGS.reviews,
    pushNotifications: settingsMap.get("feature_push_notifications") ?? DEFAULT_FLAGS.pushNotifications,
    promoCodes: settingsMap.get("feature_promo_codes") ?? DEFAULT_FLAGS.promoCodes,
    multiLanguage: settingsMap.get("feature_multi_language") ?? DEFAULT_FLAGS.multiLanguage,
    darkMode: settingsMap.get("feature_dark_mode") ?? DEFAULT_FLAGS.darkMode,
    offlineMode: settingsMap.get("feature_offline_mode") ?? DEFAULT_FLAGS.offlineMode,
    analytics: settingsMap.get("feature_analytics") ?? DEFAULT_FLAGS.analytics,
    calendar: settingsMap.get("feature_calendar") ?? DEFAULT_FLAGS.calendar,
    deliveryZones: settingsMap.get("feature_delivery_zones") ?? DEFAULT_FLAGS.deliveryZones,
    expressDelivery: settingsMap.get("feature_express_delivery") ?? DEFAULT_FLAGS.expressDelivery,
    scheduledDelivery: settingsMap.get("feature_scheduled_delivery") ?? DEFAULT_FLAGS.scheduledDelivery,
    reminders: settingsMap.get("feature_reminders") ?? DEFAULT_FLAGS.reminders,
  };
}

// Hook for florist-specific feature flags
export function useFloristFeatureFlags(): FeatureFlags {
  return useFeatureFlags();
}

// Utility to check if a specific feature is enabled
export function useIsFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[feature];
}
