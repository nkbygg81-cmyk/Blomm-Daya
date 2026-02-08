import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { formatPrice } from "../lib/formatPrice";

type Props = {
  floristId: string;
};

export function FloristNotificationsScreen({ floristId }: Props) {
  const recentOrders = useQuery(api.buyerOrders.getRecentForFlorist, {
    floristId: floristId as any,
    limit: 20,
  });

  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!recentOrders) return;
    
    if (!selectedStatus) {
      setFilteredOrders(recentOrders);
    } else {
      setFilteredOrders(recentOrders.filter((o: any) => o.status === selectedStatus));
    }
  }, [recentOrders, selectedStatus]);

  const statusLabels: Record<string, string> = {
    pending: "В обробці",
    confirmed: "Підтверджено",
    delivered: "Доставлено",
    cancelled: "Скасовано",
  };

  const statusColors: Record<string, string> = {
    pending: "#F59E0B",
    confirmed: "#3B82F6",
    delivered: "#10B981",
    cancelled: "#EF4444",
  };

  const getStatusColor = (status: string) => statusColors[status] || colors.muted;

  const renderOrder = ({ item }: { item: any }) => (
    <View style={[styles.orderCard, shadows.card]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName}
          </Text>
          <Text style={styles.orderTime}>{item.createdAtFormatted}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{statusLabels[item.status] || item.status}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.detailText} numberOfLines={2}>
            {item.deliveryAddress}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={colors.muted} />
          <Text style={styles.detailText}>{item.customerPhone}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View>
          <Text style={styles.itemsLabel}>Товари</Text>
          <Text style={styles.itemsCount}>{item.itemsCount} шт.</Text>
        </View>
        <View>
          <Text style={styles.priceLabel}>Сума</Text>
          <Text style={styles.priceValue}>{formatPrice(item.total)} kr</Text>
        </View>
      </View>
    </View>
  );

  if (!recentOrders) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Сповіщення</Text>
        <Text style={styles.subtitle}>
          {filteredOrders.length} замовлень
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {["pending", "confirmed", "delivered", "cancelled"].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              selectedStatus === status && styles.filterButtonActive,
              {
                borderColor:
                  selectedStatus === status
                    ? getStatusColor(status)
                    : colors.border,
              },
            ]}
            onPress={() =>
              setSelectedStatus(selectedStatus === status ? null : status)
            }
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === status && styles.filterTextActive,
              ]}
            >
              {statusLabels[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="inbox-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyText}>Немає замовлень</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  filterContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  filterTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  orderInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  orderTime: {
    fontSize: 12,
    color: colors.muted,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  orderDetails: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemsLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.md,
  },
});