import { useEffect, useState, useCallback, useMemo } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { EmptyState } from "../lib/EmptyState";
import { formatPrice } from "../lib/formatPrice";

type Props = {
  floristId: string;
  initialStatus?: string;
};

const statusColors: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  preparing: "#7C3AED",
  ready: "#059669",
  delivering: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

type FilterKey =
  | "ongoing"
  | "today"
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";

export function FloristOrdersScreen({ floristId, initialStatus }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>(
    (initialStatus as FilterKey) || "ongoing"
  );
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const { t } = useTranslation();

  const statusLabels = useMemo(
    () =>
      ({
        pending: t("floristOrders.statusPending"),
        confirmed: t("floristOrders.statusConfirmed"),
        preparing: t("floristOrders.statusPreparing"),
        ready: t("floristOrders.statusReady"),
        delivering: t("floristOrders.statusDelivering"),
        delivered: t("floristOrders.statusDelivered"),
        cancelled: t("floristOrders.statusCancelled"),
      }) as Record<string, string>,
    [t]
  );

  const filterLabels = useMemo(
    () =>
      ({
        ongoing: t("floristOrders.filterOngoing"),
        today: t("floristOrders.filterToday"),
        pending: t("floristOrders.statusPending"),
        confirmed: t("floristOrders.statusConfirmed"),
        preparing: t("floristOrders.statusPreparing"),
        delivering: t("floristOrders.statusDelivering"),
        delivered: t("floristOrders.statusDelivered"),
        cancelled: t("floristOrders.statusCancelled"),
      }) as Record<FilterKey, string>,
    [t]
  );

  useEffect(() => {
    setSelectedFilter((initialStatus as FilterKey) || "ongoing");
  }, [initialStatus]);

  const todayBounds = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, "0");
    const dd = String(start.getDate()).padStart(2, "0");
    return {
      dayStart: start.getTime(),
      dayEnd: end.getTime(),
      deliveryDate: `${yyyy}-${mm}-${dd}`,
    };
  }, []);

  const statusFilter =
    selectedFilter === "ongoing" || selectedFilter === "today"
      ? undefined
      : selectedFilter;

  const orders = useQuery(api.floristOrders.listForFlorist, {
    floristId: floristId as any,
    status: statusFilter as any,
    view:
      selectedFilter === "ongoing"
        ? "ongoing"
        : selectedFilter === "today"
          ? "today"
          : undefined,
    dayStart: selectedFilter === "today" ? todayBounds.dayStart : undefined,
    dayEnd: selectedFilter === "today" ? todayBounds.dayEnd : undefined,
    deliveryDate: selectedFilter === "today" ? todayBounds.deliveryDate : undefined,
  });

  const orderDetails = useQuery(
    api.floristOrders.getOrderDetails,
    selectedOrder ? { orderId: selectedOrder } : "skip"
  );

  const updateStatusMutation = useMutation(api.floristOrders.updateStatus);
  const hideOrderMutation = useMutation(api.floristOrders.hideOrderForFlorist);
  const clearCancelledMutation = useMutation(api.floristOrders.clearCancelledForFlorist);

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: string) => {
      try {
        await updateStatusMutation({
          orderId: orderId as any,
          floristId: floristId as any,
          status: newStatus as any,
        });
        Alert.alert(t("common.success"), t("floristOrders.statusUpdated"));
      } catch {
        Alert.alert(t("common.error"), t("floristOrders.statusUpdateError"));
      }
    },
    [updateStatusMutation, floristId, t]
  );

  const hideOrder = useCallback(
    (orderId: string) => {
      Alert.alert(
        t("floristOrders.deleteConfirmTitle"),
        t("floristOrders.deleteConfirmMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await hideOrderMutation({
                  orderId: orderId as any,
                  floristId: floristId as any,
                });
                setDetailsModalVisible(false);
                setSelectedOrder(null);
                Alert.alert(t("common.success"), t("floristOrders.orderHidden"));
              } catch {
                Alert.alert(t("common.error"), t("floristOrders.statusUpdateError"));
              }
            },
          },
        ]
      );
    },
    [hideOrderMutation, floristId, t]
  );

  const clearCancelled = useCallback(() => {
    Alert.alert(
      t("floristOrders.clearCancelled"),
      t("floristOrders.clearCancelledConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await clearCancelledMutation({ floristId: floristId as any });
              Alert.alert(t("common.success"), t("floristOrders.cancelledCleared"));
            } catch {
              Alert.alert(t("common.error"), t("floristOrders.statusUpdateError"));
            }
          },
        },
      ]
    );
  }, [clearCancelledMutation, floristId, t]);

  const cancellationText = useCallback(
    (item: any) => {
      const reason = String(item.cancellationReason || "").toLowerCase();
      const by = String(item.cancelledBy || "").toLowerCase();
      const paymentStatus = String(item.paymentStatus || "").toLowerCase();

      if (["failed", "unpaid", "expired", "cancelled", "canceled"].includes(paymentStatus)) {
        return t("floristOrders.paymentFailed");
      }
      if (by === "buyer" || reason.includes("buyer")) {
        return t("floristOrders.cancelByBuyer");
      }
      if (by === "florist" || reason.includes("florist")) {
        return t("floristOrders.cancelByFlorist");
      }
      return null;
    },
    [t]
  );

  const renderOrder = useCallback(
    ({ item }: { item: any }) => {
      const cancelledReason = item.status === "cancelled" ? cancellationText(item) : null;
      const deliveryLabel =
        item.deliveryType === "pickup"
          ? t("floristOrders.pickup")
          : t("floristOrders.delivery");

      return (
        <TouchableOpacity
          style={styles.orderCard}
          onPress={() => {
            setSelectedOrder(item.id);
            setDetailsModalVisible(true);
          }}
          onLongPress={() => {
            if (item.status === "cancelled") hideOrder(item.id);
          }}
        >
          <View style={styles.orderHeader}>
            <Text style={styles.orderName}>{item.customerName}</Text>
            <View style={styles.headerActions}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
                <Text style={styles.statusText}>{statusLabels[item.status]}</Text>
              </View>
              {item.status === "cancelled" && (
                <TouchableOpacity
                  accessibilityLabel={t("floristOrders.deleteFromList")}
                  style={styles.deleteButton}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    hideOrder(item.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.deliveryTypeRow}>
            <Ionicons
              name={item.deliveryType === "pickup" ? "bag-handle" : "car"}
              size={16}
              color={item.deliveryType === "pickup" ? colors.success : colors.primary}
            />
            <Text style={styles.deliveryTypeLabel}>{deliveryLabel}</Text>
          </View>

          <Text style={styles.orderAddress}>{item.deliveryAddress}</Text>
          <Text style={styles.orderPhone}>{item.customerPhone}</Text>

          {cancelledReason && (
            <View style={styles.cancelReasonRow}>
              <Ionicons name="information-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.cancelReasonText}>{cancelledReason}</Text>
            </View>
          )}

          <View style={styles.orderFooter}>
            <Text style={styles.orderItems}>
              {item.itemsCount} {t("floristOrders.items")}
            </Text>
            <Text style={styles.orderTotal}>{formatPrice(item.total)} kr</Text>
          </View>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleString(t("dateLocale"))}
          </Text>
        </TouchableOpacity>
      );
    },
    [statusLabels, t, hideOrder, cancellationText]
  );

  const filters: FilterKey[] = [
    "ongoing",
    "today",
    "pending",
    "confirmed",
    "preparing",
    "delivering",
    "delivered",
    "cancelled",
  ];

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filterLabels[filter]}
            </Text>
          </TouchableOpacity>
        ))}

        {selectedFilter === "cancelled" && (orders?.length ?? 0) > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearCancelled}>
            <Ionicons name="trash-outline" size={16} color="#B91C1C" />
            <Text style={styles.clearButtonText}>{t("floristOrders.clearCancelled")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item: any) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={t("floristOrders.empty")}
            subtitle={t("floristOrders.emptySubtext")}
          />
        }
      />

      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {orderDetails ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("floristOrders.orderDetails")}</Text>
                  <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                    <Ionicons name="close" size={28} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.detailLabel}>{t("floristOrders.customer")}:</Text>
                  <Text style={styles.detailValue}>{orderDetails.customerName}</Text>

                  <Text style={styles.detailLabel}>{t("floristOrders.phone")}:</Text>
                  <Text style={styles.detailValue}>{orderDetails.customerPhone}</Text>

                  <Text style={styles.detailLabel}>
                    {orderDetails.deliveryType === "pickup"
                      ? t("floristOrders.pickup")
                      : t("floristOrders.delivery")}
                    :
                  </Text>
                  <Text style={styles.detailValue}>{orderDetails.deliveryAddress}</Text>

                  {orderDetails.note && (
                    <>
                      <Text style={styles.detailLabel}>{t("floristOrders.note")}:</Text>
                      <Text style={styles.detailValue}>{orderDetails.note}</Text>
                    </>
                  )}

                  {orderDetails.status === "cancelled" && (
                    <TouchableOpacity
                      style={styles.modalDeleteButton}
                      onPress={() => hideOrder(orderDetails.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.modalDeleteText}>
                        {t("floristOrders.deleteFromList")}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.detailLabel}>{t("floristOrders.changeStatus")}:</Text>
                  <View style={styles.statusButtons}>
                    {["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"].map(
                      (status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusButton,
                            orderDetails.status === status && styles.statusButtonActive,
                            { borderColor: statusColors[status] },
                          ]}
                          onPress={() => {
                            handleStatusChange(orderDetails.id, status);
                            setDetailsModalVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              { color: statusColors[status] },
                              orderDetails.status === status && { color: "#fff" },
                            ]}
                          >
                            {statusLabels[status]}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </>
            ) : (
              <Text>{t("common.loading")}</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filtersContainer: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    flexWrap: "wrap",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: "#F5F0FF",
  },
  filterButtonActive: { backgroundColor: colors.primary },
  filterButtonText: { fontSize: 14, color: colors.text, fontWeight: "500" },
  filterButtonTextActive: { color: "#fff", fontWeight: "700" },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
  },
  clearButtonText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  list: { padding: spacing.md, gap: spacing.md },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderName: { fontSize: 18, fontWeight: "600", color: colors.text, flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryTypeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  deliveryTypeLabel: { fontSize: 12, color: colors.muted, fontWeight: "700" },
  orderAddress: { fontSize: 14, color: colors.text },
  orderPhone: { fontSize: 14, color: colors.muted },
  cancelReasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  cancelReasonText: { color: "#B91C1C", fontSize: 12, fontWeight: "600", flex: 1 },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  orderItems: { fontSize: 14, color: colors.muted },
  orderTotal: { fontSize: 16, fontWeight: "700", color: colors.primary },
  orderDate: { fontSize: 12, color: colors.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  modalBody: { gap: spacing.sm },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  detailValue: { fontSize: 16, color: colors.text },
  modalDeleteButton: {
    marginTop: spacing.md,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  modalDeleteText: { color: "#fff", fontWeight: "700" },
  statusButtons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#fff",
  },
  statusButtonActive: { backgroundColor: colors.primary },
  statusButtonText: { fontSize: 14, fontWeight: "600" },
});
