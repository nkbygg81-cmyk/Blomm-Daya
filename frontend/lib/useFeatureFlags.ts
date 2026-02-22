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

  const getBoolFlag = (key: string, defaultVal: boolean): boolean => {
    const val = settingsMap.get(key);
    return typeof val === "boolean" ? val : defaultVal;
  };

  return {
    subscriptions: getBoolFlag("feature_subscriptions", DEFAULT_FLAGS.subscriptions),
    consultations: getBoolFlag("feature_consultations", DEFAULT_FLAGS.consultations),
    giftCertificates: getBoolFlag("feature_gift_certificates", DEFAULT_FLAGS.giftCertificates),
    aiChat: getBoolFlag("feature_ai_chat", DEFAULT_FLAGS.aiChat),
    referralProgram: getBoolFlag("feature_referral_program", DEFAULT_FLAGS.referralProgram),
    loyaltyProgram: getBoolFlag("feature_loyalty_program", DEFAULT_FLAGS.loyaltyProgram),
    stories: getBoolFlag("feature_stories", DEFAULT_FLAGS.stories),
    orderTracking: getBoolFlag("feature_order_tracking", DEFAULT_FLAGS.orderTracking),
    reviews: getBoolFlag("feature_reviews", DEFAULT_FLAGS.reviews),
    pushNotifications: getBoolFlag("feature_push_notifications", DEFAULT_FLAGS.pushNotifications),
    promoCodes: getBoolFlag("feature_promo_codes", DEFAULT_FLAGS.promoCodes),
    multiLanguage: getBoolFlag("feature_multi_language", DEFAULT_FLAGS.multiLanguage),
    darkMode: getBoolFlag("feature_dark_mode", DEFAULT_FLAGS.darkMode),
    offlineMode: getBoolFlag("feature_offline_mode", DEFAULT_FLAGS.offlineMode),
    analytics: getBoolFlag("feature_analytics", DEFAULT_FLAGS.analytics),
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
