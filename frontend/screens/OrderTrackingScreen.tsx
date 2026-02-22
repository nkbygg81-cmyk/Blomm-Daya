import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import type { Id } from "../convex/_generated/dataModel";
import { CourierTrackingIndicator, CourierTrackingScreen } from "./CourierTrackingScreen";

type Props = {
  orderId: string;
  onBack: () => void;
};

const STATUS_STEPS = [
  { key: "pending", icon: "time-outline", labelKey: "orderTracking.status.pending" },
  { key: "confirmed", icon: "checkmark-circle-outline", labelKey: "orderTracking.status.confirmed" },
  { key: "preparing", icon: "flower-outline", labelKey: "orderTracking.status.preparing" },
  { key: "delivering", icon: "car-outline", labelKey: "orderTracking.status.delivering" },
  { key: "delivered", icon: "gift-outline", labelKey: "orderTracking.status.delivered" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  confirmed: colors.info,
  preparing: colors.primary,
  delivering: colors.info,
  delivered: colors.success,
  cancelled: colors.danger,
};

export function OrderTrackingScreen({ orderId, onBack }: Props) {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showCourierTracking, setShowCourierTracking] = useState(false);

  const tracking = useQuery(
    api.orderTracking.getOrderTracking,
    { orderId: orderId as Id<"buyerOrders"> }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Convex will auto-refresh, we just show the indicator
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (tracking === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("orderTracking.title")}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </View>
    );
  }

  if (tracking === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("orderTracking.title")}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <Text style={styles.errorText}>{t("orderTracking.notFound")}</Text>
        </View>
      </View>
    );
  }

  const currentStatus = tracking.order.status;
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus);
  const statusColor = STATUS_COLORS[currentStatus] || colors.muted;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("orderTracking.title")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Order Info Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>
              {t("orders.orderNumber")} #{orderId.slice(-6).toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {t(`orderTracking.status.${currentStatus}`) || currentStatus}
              </Text>
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={colors.muted} />
              <Text style={styles.detailText}>{tracking.order.customerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <Text style={styles.detailText} numberOfLines={2}>
                {tracking.order.deliveryAddress}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={16} color={colors.muted} />
              <Text style={styles.detailText}>{tracking.order.total} kr</Text>
            </View>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressCard}>
          <Text style={styles.sectionTitle}>{t("orderTracking.progress")}</Text>
          
          <View style={styles.progressSteps}>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const stepColor = isCompleted ? colors.success : colors.border;

              return (
                <View key={step.key} style={styles.stepContainer}>
                  <View style={styles.stepRow}>
                    {/* Step indicator */}
                    <View style={[
                      styles.stepCircle,
                      { 
                        backgroundColor: isCompleted ? colors.success : colors.card,
                        borderColor: stepColor,
                      }
                    ]}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color={colors.card} />
                      ) : (
                        <Ionicons name={step.icon as any} size={16} color={colors.muted} />
                      )}
                    </View>

                    {/* Step label */}
                    <View style={styles.stepContent}>
                      <Text style={[
                        styles.stepLabel,
                        isCompleted && styles.stepLabelCompleted,
                        isCurrent && styles.stepLabelCurrent,
                      ]}>
                        {t(step.labelKey)}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.currentLabel}>{t("orderTracking.currentStatus")}</Text>
                      )}
                    </View>
                  </View>

                  {/* Connector line */}
                  {index < STATUS_STEPS.length - 1 && (
                    <View style={[
                      styles.connector,
                      { backgroundColor: index < currentStepIndex ? colors.success : colors.border }
                    ]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Live Courier Tracking */}
        {tracking.order.status === "delivering" && (
          <View style={styles.courierCard}>
            <CourierTrackingIndicator 
              orderId={orderId} 
              onPress={() => setShowCourierTracking(true)}
            />
          </View>
        )}

        {/* Photos from Florist */}
        {tracking.photos.length > 0 && (
          <View style={styles.photosCard}>
            <Text style={styles.sectionTitle}>{t("orderTracking.bouquetPhotos")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {tracking.photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo.photoUrl }} style={styles.photo} />
                  {photo.caption && (
                    <Text style={styles.photoCaption} numberOfLines={2}>{photo.caption}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Status History */}
        {tracking.history.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.sectionTitle}>{t("orderTracking.history")}</Text>
            
            {tracking.history.map((entry, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyStatus}>
                    {t(`orderTracking.status.${entry.status}`) || entry.status}
                  </Text>
                  {entry.note && (
                    <Text style={styles.historyNote}>{entry.note}</Text>
                  )}
                  <Text style={styles.historyTime}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Courier Tracking Modal */}
      <Modal
        visible={showCourierTracking}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCourierTracking(false)}
      >
        <CourierTrackingScreen
          orderId={orderId}
          onBack={() => setShowCourierTracking(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  placeholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
  },
  errorText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  progressSteps: {
    gap: 0,
  },
  stepContainer: {
    position: "relative",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  stepContent: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  stepLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  stepLabelCompleted: {
    color: colors.text,
    fontWeight: "500",
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: "600",
  },
  currentLabel: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  connector: {
    position: "absolute",
    left: 15,
    top: 32,
    width: 2,
    height: 24,
  },
  photosCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photosScroll: {
    marginHorizontal: -spacing.sm,
  },
  photoContainer: {
    marginHorizontal: spacing.sm,
    width: 150,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  photoCaption: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyItem: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  historyNote: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
});
