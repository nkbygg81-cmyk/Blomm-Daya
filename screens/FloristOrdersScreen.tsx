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
delivered: "#10B981",
cancelled: "#EF4444",
};

export function FloristOrdersScreen({ floristId, initialStatus }: Props) {
const [selectedStatus, setSelectedStatus] = useState<string | undefined>(initialStatus);
const [selectedOrder, setSelectedOrder] = useState<any>(null);
const [detailsModalVisible, setDetailsModalVisible] = useState(false);
const { t } = useTranslation();

const statusLabels = useMemo(() => ({
  pending: t("floristOrders.statusPending"),
  confirmed: t("floristOrders.statusConfirmed"),
  delivered: t("floristOrders.statusDelivered"),
  cancelled: t("floristOrders.statusCancelled"),
} as Record<string, string>), [t]);

useEffect(() => {
  setSelectedStatus(initialStatus);
}, [initialStatus]);

const orders = useQuery(api.floristOrders.listForFlorist, {
floristId: floristId as any,
status: selectedStatus as any,
});

const orderDetails = useQuery(
  api.floristOrders.getOrderDetails,
  selectedOrder ? { orderId: selectedOrder } : "skip"
);

const updateStatusMutation = useMutation(api.floristOrders.updateStatus);

const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
try {
await updateStatusMutation({ 
orderId: orderId as any, 
status: newStatus as any 
});
Alert.alert(t("common.success"), t("floristOrders.statusUpdated"));
} catch (error) {
Alert.alert(t("common.error"), t("floristOrders.statusUpdateError"));
}
}, [updateStatusMutation, t]);

const renderOrder = useCallback(({ item }: { item: any }) => (
<TouchableOpacity
style={styles.orderCard}
onPress={() => {
setSelectedOrder(item.id);
setDetailsModalVisible(true);
}}
>
<View style={styles.orderHeader}>
<Text style={styles.orderName}>{item.customerName}</Text>
<View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
<Text style={styles.statusText}>{statusLabels[item.status]}</Text>
</View>
</View>
<View style={styles.orderAddressRow}>
<Ionicons 
  name={item.deliveryType === "pickup" ? "bag-handle" : "car"} 
  size={16} 
  color={item.deliveryType === "pickup" ? colors.success : colors.primary} 
/>
<Text style={styles.orderAddress}>{item.deliveryAddress}</Text>
</View>
<Text style={styles.orderPhone}>{item.customerPhone}</Text>
<View style={styles.orderFooter}>
<Text style={styles.orderItems}>{item.itemsCount} {t("floristOrders.items")}</Text>
<Text style={styles.orderTotal}>{formatPrice(item.total)} kr</Text>
</View>
<Text style={styles.orderDate}>
{new Date(item.createdAt).toLocaleString(t("dateLocale"))}
</Text>
</TouchableOpacity>
), [statusLabels, t]);

return (
<View style={styles.container}>
<View style={styles.filtersContainer}>
{["pending", "confirmed", "delivered", "cancelled"].map((status) => (
<TouchableOpacity
key={status}
style={[
styles.filterButton,
selectedStatus === status && styles.filterButtonActive,
]}
onPress={() => setSelectedStatus(selectedStatus === status ? undefined : status)}
>
<Text
style={[
styles.filterButtonText,
selectedStatus === status && styles.filterButtonTextActive,
]}
>
{statusLabels[status]}
</Text>
</TouchableOpacity>
))}
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
transparent={true}
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

<Text style={styles.detailLabel}>{t("floristOrders.address")}:</Text>
<Text style={styles.detailValue}>{orderDetails.deliveryAddress}</Text>

{orderDetails.note && (
<>
<Text style={styles.detailLabel}>{t("floristOrders.note")}:</Text>
<Text style={styles.detailValue}>{orderDetails.note}</Text>
</>
)}

<Text style={styles.detailLabel}>{t("floristOrders.changeStatus")}:</Text>
<View style={styles.statusButtons}>
{["pending", "confirmed", "delivered", "cancelled"].map((status) => (
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
))}
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
container: {
flex: 1,
backgroundColor: colors.bg,
},
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
backgroundColor: "#F3F4F6",
},
filterButtonActive: {
backgroundColor: colors.primary,
},
filterButtonText: {
fontSize: 14,
color: colors.text,
fontWeight: "500",
},
filterButtonTextActive: {
color: "#fff",
},
list: {
padding: spacing.md,
gap: spacing.md,
},
orderCard: {
backgroundColor: "#fff",
borderRadius: 12,
padding: spacing.md,
borderWidth: 1,
borderColor: colors.border,
gap: spacing.xs,
},
orderHeader: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
},
orderName: {
fontSize: 18,
fontWeight: "600",
color: colors.text,
flex: 1,
},
statusBadge: {
paddingHorizontal: spacing.sm,
paddingVertical: 4,
borderRadius: 12,
},
statusText: {
fontSize: 12,
fontWeight: "600",
color: "#fff",
},
orderAddressRow: {
flexDirection: "row",
alignItems: "center",
gap: spacing.sm,
},
orderAddress: {
fontSize: 14,
color: colors.text,
},
orderPhone: {
fontSize: 14,
color: colors.muted,
},
orderFooter: {
flexDirection: "row",
justifyContent: "space-between",
marginTop: spacing.xs,
},
orderItems: {
fontSize: 14,
color: colors.muted,
},
orderTotal: {
fontSize: 16,
fontWeight: "700",
color: colors.primary,
},
orderDate: {
fontSize: 12,
color: colors.muted,
},
emptyContainer: {
flex: 1,
justifyContent: "center",
alignItems: "center",
paddingVertical: spacing.xl * 2,
},
emptyText: {
fontSize: 16,
color: colors.muted,
marginTop: spacing.md,
},
modalOverlay: {
flex: 1,
backgroundColor: "rgba(0,0,0,0.5)",
justifyContent: "flex-end",
},
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
modalTitle: {
fontSize: 20,
fontWeight: "700",
color: colors.text,
},
modalBody: {
gap: spacing.sm,
},
detailLabel: {
fontSize: 12,
fontWeight: "600",
color: colors.muted,
textTransform: "uppercase",
marginTop: spacing.sm,
},
detailValue: {
fontSize: 16,
color: colors.text,
},
itemRow: {
flexDirection: "row",
justifyContent: "space-between",
paddingVertical: spacing.xs,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
itemName: {
fontSize: 14,
color: colors.text,
flex: 1,
},
itemPrice: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
},
totalRow: {
flexDirection: "row",
justifyContent: "space-between",
marginTop: spacing.md,
paddingTop: spacing.md,
borderTopWidth: 2,
borderTopColor: colors.primary,
},
totalLabel: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
},
totalValue: {
fontSize: 18,
fontWeight: "700",
color: colors.primary,
},
statusButtons: {
flexDirection: "row",
flexWrap: "wrap",
gap: spacing.sm,
marginTop: spacing.sm,
},
statusButton: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderRadius: 8,
borderWidth: 2,
backgroundColor: "#fff",
},
statusButtonActive: {
backgroundColor: colors.primary,
},
statusButtonText: {
fontSize: 14,
fontWeight: "600",
},
});