import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from "react-native";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";

type Props = {
  orderId: string;
  onBack?: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function CourierTrackingScreen({ orderId, onBack }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);

  const courierLocation = useQuery(api.courierTracking.getCourierLocation, {
    orderId: orderId as any,
  });

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  };

  const formatETA = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    if (diff < 0) return t("courierTracking.trackingInactive");
    const minutes = Math.round(diff / 60000);
    return `${minutes} ${t("courierTracking.minutes")}`;
  };

  const handleCallCourier = (phone: string) => {
    buttonPress();
    Linking.openURL(`tel:${phone}`);
  };

  if (!courierLocation) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t("courierTracking.title")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.muted }]}>
            {t("common.loading")}
          </Text>
        </View>
      </View>
    );
  }

  const isActive = courierLocation.isActive;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t("courierTracking.title")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map Placeholder */}
      <View style={[styles.mapContainer, { backgroundColor: themeColors.surface }]}>
        {isActive ? (
          <View style={styles.mapContent}>
            {/* Simple map representation */}
            <View style={[styles.mapPlaceholder, { backgroundColor: themeColors.bg }]}>
              <Ionicons name="map" size={64} color={themeColors.muted} />
              <Text style={[styles.mapText, { color: themeColors.muted }]}>
                {courierLocation.lat.toFixed(4)}, {courierLocation.lon.toFixed(4)}
              </Text>
            </View>
            
            {/* Courier marker */}
            <View style={[styles.courierMarker, { backgroundColor: themeColors.primary }]}>
              <Ionicons name="bicycle" size={24} color={themeColors.white} />
            </View>
          </View>
        ) : (
          <View style={styles.inactiveContainer}>
            <Ionicons name="location-outline" size={64} color={themeColors.muted} />
            <Text style={[styles.inactiveText, { color: themeColors.muted }]}>
              {t("courierTracking.trackingInactive")}
            </Text>
          </View>
        )}
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        {/* Status indicator */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? themeColors.success : themeColors.muted }]} />
          <Text style={[styles.statusText, { color: themeColors.text }]}>
            {isActive ? t("courierTracking.courierOnTheWay") : t("courierTracking.trackingInactive")}
          </Text>
        </View>

        {isActive && (
          <>
            {/* ETA */}
            {courierLocation.estimatedArrival && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: themeColors.primary + "20" }]}>
                  <Ionicons name="time-outline" size={20} color={themeColors.primary} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: themeColors.muted }]}>
                    {t("courierTracking.estimatedArrival")}
                  </Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>
                    {formatETA(courierLocation.estimatedArrival)}
                  </Text>
                </View>
              </View>
            )}

            {/* Speed */}
            {courierLocation.speed !== undefined && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: themeColors.info + "20" }]}>
                  <Ionicons name="speedometer-outline" size={20} color={themeColors.info} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: themeColors.muted }]}>
                    {t("courierTracking.distance")}
                  </Text>
                  <Text style={[styles.infoValue, { color: themeColors.text }]}>
                    {Math.round(courierLocation.speed)} {t("courierTracking.km")}/h
                  </Text>
                </View>
              </View>
            )}

            {/* Last update */}
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: themeColors.muted + "20" }]}>
                <Ionicons name="refresh-outline" size={20} color={themeColors.muted} />
              </View>
              <View>
                <Text style={[styles.infoLabel, { color: themeColors.muted }]}>
                  {t("courierTracking.lastUpdate")}
                </Text>
                <Text style={[styles.infoValue, { color: themeColors.text }]}>
                  {formatTime(courierLocation.updatedAt)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Call Courier Button (placeholder) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.callBtn, { backgroundColor: themeColors.success }]}
          onPress={() => handleCallCourier("+380000000000")}
          disabled={!isActive}
        >
          <Ionicons name="call" size={20} color={themeColors.white} />
          <Text style={[styles.callBtnText, { color: themeColors.white }]}>
            {t("courierTracking.call")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Compact tracking indicator for order card
export function CourierTrackingIndicator({ orderId, onPress }: { orderId: string; onPress?: () => void }) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();

  const courierLocation = useQuery(api.courierTracking.getCourierLocation, {
    orderId: orderId as any,
  });

  if (!courierLocation?.isActive) return null;

  const formatETA = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    if (diff < 0) return "";
    const minutes = Math.round(diff / 60000);
    return `${minutes} ${t("courierTracking.minutes")}`;
  };

  return (
    <TouchableOpacity
      style={[styles.trackingIndicator, { backgroundColor: themeColors.success + "15" }]}
      onPress={onPress}
    >
      <View style={styles.trackingDot}>
        <View style={[styles.trackingDotInner, { backgroundColor: themeColors.success }]} />
      </View>
      <View style={styles.trackingContent}>
        <Text style={[styles.trackingTitle, { color: themeColors.success }]}>
          {t("courierTracking.courierOnTheWay")}
        </Text>
        {courierLocation.estimatedArrival && (
          <Text style={[styles.trackingEta, { color: themeColors.muted }]}>
            {t("courierTracking.estimatedArrival")}: {formatETA(courierLocation.estimatedArrival)}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={themeColors.success} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: spacing.md,
  },
  mapContainer: {
    height: SCREEN_WIDTH * 0.7,
    margin: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  mapContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mapText: {
    marginTop: spacing.sm,
    fontSize: 12,
  },
  courierMarker: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveText: {
    fontSize: 16,
    marginTop: spacing.md,
  },
  statusCard: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: spacing.md,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  callBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Indicator styles
  trackingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  trackingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  trackingDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trackingContent: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  trackingEta: {
    fontSize: 12,
    marginTop: 2,
  },
});
