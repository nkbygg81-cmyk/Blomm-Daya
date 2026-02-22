import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { useTranslation } from "../lib/i18n/useTranslation";
import { EmptyState } from "../lib/EmptyState";
import { useCart } from "../lib/CartContext";
import { buttonPress } from "../lib/haptics";

type OrderItem = {
  flowerId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  qty: number;
};

type GiftItem = {
  giftId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  qty: number;
};

type Order = {
  id: string;
  customerName: string;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  total: number;
  itemsCount: number;
  createdAt: number;
  paymentStatus?: string;
  paymentMethodType?: string;
  items: OrderItem[];
  gifts?: GiftItem[];
};

type Props = {
  onOrderPress?: (orderId: string) => void;
  onCareTips?: (flowerNames: string[]) => void;
};


const statusColors: Record<Order["status"], string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

export function OrderHistoryScreen({ onOrderPress, onCareTips }: Props) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const { t } = useTranslation();
  const { addItem } = useCart();

  useEffect(() => {
    void (async () => {
      const id = await getBuyerDeviceId();
      setDeviceId(id);
    })();
  }, []);

  const orders = useQuery(
    api.buyerOrders.listForBuyer,
    deviceId ? { buyerDeviceId: deviceId } : "skip"
  );

  if (!deviceId || orders === undefined) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.muted}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="receipt-outline"
          title={t("orders.empty")}
          subtitle={t("orders.emptySubtext")}
        />
      </View>
    );
  }

  const handleReorder = (order: Order) => {
    buttonPress();
    for (const item of order.items) {
      addItem({
        id: item.flowerId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
      });
    }
    Alert.alert(t("ordersExtra.addedToCart"), t("ordersExtra.addedToCartMessage", { count: String(order.items.length) }));
  };

  const handleCareTips = (order: Order) => {
    buttonPress();
    const flowerNames = order.items.map((item) => item.name);
    onCareTips?.(flowerNames);
  };

  const paymentLabel = (o: Order) => {
    const status = (o.paymentStatus || "").toLowerCase();
    if (status === "paid") {
      const method = (o.paymentMethodType || "").toLowerCase();
      if (method === "klarna") return t("orders.paidKlarna");
      if (method === "card") return t("orders.paidCard");
      return t("orders.paid");
    }
    if (status === "cod") return t("orders.cod");
    return null;
  };

  const statusLabels: Record<string, string> = {
    pending: t("orders.status.pending"),
    confirmed: t("orders.status.confirmed"),
    delivered: t("orders.status.delivered"),
    cancelled: t("orders.status.cancelled"),
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item: Order) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: Order }) => {
          const pay = paymentLabel(item);
          return (
            <TouchableOpacity style={styles.orderCard} activeOpacity={0.7} onPress={() => onOrderPress?.(item.id)}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>{t("orders.orderNumber")} #{item.id.slice(-6)}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors[item.status] + "20" },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                    {statusLabels[item.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderDate}>
                {new Date(item.createdAt).toLocaleDateString(t("dateLocale"), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              {pay ? <Text style={styles.paymentText}>{pay}</Text> : null}

              <View style={styles.orderFooter}>
                <Text style={styles.itemsCount}>
                  <Ionicons name="flower" size={14} color={colors.muted} /> {item.itemsCount}{" "}
                  {t("orders.items")}
                </Text>
                <Text style={styles.orderTotal}>{item.total} kr</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.reorderButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    handleReorder(item);
                  }}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.reorderText}>{t("ordersExtra.reorder")}</Text>
                </TouchableOpacity>
                {item.status === "delivered" && onCareTips && (
                  <TouchableOpacity
                    style={styles.careTipsButton}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      handleCareTips(item);
                    }}
                  >
                    <Ionicons name="leaf" size={16} color={colors.success} />
                    <Text style={styles.careTipsText}>{t("ordersExtra.care")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  muted: { color: colors.muted, fontSize: 14 },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  list: { padding: spacing.md },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDate: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  paymentText: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemsCount: {
    fontSize: 13,
    color: colors.muted,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  reorderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  reorderText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  careTipsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  careTipsText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
  },
});