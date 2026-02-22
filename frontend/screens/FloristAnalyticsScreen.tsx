import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Period = "week" | "month" | "quarter" | "year";

type Props = {
  floristId: string;
  onBack?: () => void;
};

// Simple bar chart component
function SimpleBarChart({
  data,
  maxValue,
  barColor = colors.primary,
}: {
  data: { label: string; value: number }[];
  maxValue: number;
  barColor?: string;
}) {
  return (
    <View style={chartStyles.container}>
      {data.map((item, index) => (
        <View key={index} style={chartStyles.barContainer}>
          <View style={chartStyles.barWrapper}>
            <View
              style={[
                chartStyles.bar,
                {
                  height: maxValue > 0 ? (item.value / maxValue) * 100 : 0,
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>
          <Text style={chartStyles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={chartStyles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 150,
    paddingTop: spacing.md,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    height: 100,
    width: "60%",
    justifyContent: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: radius.xs,
  },
  label: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
  },
  value: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
  },
});

// Progress ring component for metrics
function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  color = colors.primary,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: colors.surface,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: "transparent",
          borderRightColor: progress > 25 ? color : "transparent",
          borderBottomColor: progress > 50 ? color : "transparent",
          borderLeftColor: progress > 75 ? color : "transparent",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      {children}
    </View>
  );
}

export function FloristAnalyticsScreen({ floristId, onBack }: Props) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("month");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders for this florist
  const orders = useQuery(api.floristOrders.listForFlorist, {
    floristId: floristId as any,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Calculate date ranges
  const dateRange = useMemo(() => {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    let startDate: Date;
    let prevStartDate: Date;
    let daysInPeriod: number;

    switch (period) {
      case "week":
        daysInPeriod = 7;
        startDate = new Date(now.getTime() - 7 * msPerDay);
        prevStartDate = new Date(now.getTime() - 14 * msPerDay);
        break;
      case "month":
        daysInPeriod = 30;
        startDate = new Date(now.getTime() - 30 * msPerDay);
        prevStartDate = new Date(now.getTime() - 60 * msPerDay);
        break;
      case "quarter":
        daysInPeriod = 90;
        startDate = new Date(now.getTime() - 90 * msPerDay);
        prevStartDate = new Date(now.getTime() - 180 * msPerDay);
        break;
      case "year":
        daysInPeriod = 365;
        startDate = new Date(now.getTime() - 365 * msPerDay);
        prevStartDate = new Date(now.getTime() - 730 * msPerDay);
        break;
    }

    return { startDate, prevStartDate, endDate: now, daysInPeriod };
  }, [period]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!orders) return null;

    const { startDate, prevStartDate, endDate, daysInPeriod } = dateRange;
    const startTs = startDate.getTime();
    const prevStartTs = prevStartDate.getTime();
    const endTs = endDate.getTime();

    // Current period orders
    const currentOrders = orders.filter(
      (o: any) => o.createdAt >= startTs && o.createdAt <= endTs
    );

    // Previous period orders
    const prevOrders = orders.filter(
      (o: any) => o.createdAt >= prevStartTs && o.createdAt < startTs
    );

    // Revenue calculations
    const currentRevenue = currentOrders
      .filter((o: any) => o.status === "delivered" || o.paymentStatus === "paid")
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const prevRevenue = prevOrders
      .filter((o: any) => o.status === "delivered" || o.paymentStatus === "paid")
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const revenueGrowth = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;

    // Orders count
    const currentOrdersCount = currentOrders.length;
    const prevOrdersCount = prevOrders.length;
    const ordersGrowth = prevOrdersCount > 0 
      ? ((currentOrdersCount - prevOrdersCount) / prevOrdersCount) * 100 
      : currentOrdersCount > 0 ? 100 : 0;

    // Average order value
    const avgOrderValue = currentOrdersCount > 0 ? currentRevenue / currentOrdersCount : 0;
    const prevAvgOrderValue = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;
    const avgGrowth = prevAvgOrderValue > 0 
      ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 
      : avgOrderValue > 0 ? 100 : 0;

    // Orders by status
    const ordersByStatus = {
      pending: currentOrders.filter((o: any) => o.status === "pending").length,
      confirmed: currentOrders.filter((o: any) => o.status === "confirmed").length,
      preparing: currentOrders.filter((o: any) => o.status === "preparing").length,
      delivered: currentOrders.filter((o: any) => o.status === "delivered").length,
      cancelled: currentOrders.filter((o: any) => o.status === "cancelled").length,
    };

    // Delivery rate
    const totalCompleted = ordersByStatus.delivered + ordersByStatus.cancelled;
    const deliveryRate = totalCompleted > 0 
      ? (ordersByStatus.delivered / totalCompleted) * 100 
      : 0;

    // Sales by day/week (for chart)
    const salesByPeriod: { label: string; value: number }[] = [];
    const bucketCount = period === "week" ? 7 : period === "month" ? 4 : period === "quarter" ? 12 : 12;
    const bucketSize = daysInPeriod / bucketCount;
    
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = startTs + i * bucketSize * 24 * 60 * 60 * 1000;
      const bucketEnd = bucketStart + bucketSize * 24 * 60 * 60 * 1000;
      
      const bucketOrders = currentOrders.filter(
        (o: any) => o.createdAt >= bucketStart && o.createdAt < bucketEnd && 
        (o.status === "delivered" || o.paymentStatus === "paid")
      );
      
      const bucketRevenue = bucketOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      
      let label: string;
      if (period === "week") {
        const day = new Date(bucketStart);
        label = day.toLocaleDateString("uk", { weekday: "short" }).substring(0, 2);
      } else if (period === "month") {
        label = `Т${i + 1}`;
      } else {
        label = `${i + 1}`;
      }
      
      salesByPeriod.push({ label, value: Math.round(bucketRevenue) });
    }

    // Top products (by items sold)
    const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of currentOrders) {
      if (!order.items) continue;
      for (const item of order.items as any[]) {
        const key = item.name || "Unknown";
        if (!productSales[key]) {
          productSales[key] = { name: key, count: 0, revenue: 0 };
        }
        productSales[key].count += item.qty || 1;
        productSales[key].revenue += (item.price || 0) * (item.qty || 1);
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Customer analysis (unique device IDs)
    const allCustomerIds = new Set(orders.map((o: any) => o.buyerDeviceId));
    const currentCustomerIds = new Set(currentOrders.map((o: any) => o.buyerDeviceId));
    const prevCustomerIds = new Set(prevOrders.map((o: any) => o.buyerDeviceId));
    
    let newCustomers = 0;
    let returningCustomers = 0;
    currentCustomerIds.forEach((id) => {
      if (prevCustomerIds.has(id)) {
        returningCustomers++;
      } else {
        newCustomers++;
      }
    });

    return {
      currentRevenue,
      prevRevenue,
      revenueGrowth,
      currentOrdersCount,
      prevOrdersCount,
      ordersGrowth,
      avgOrderValue,
      avgGrowth,
      deliveryRate,
      ordersByStatus,
      salesByPeriod,
      topProducts,
      newCustomers,
      returningCustomers,
    };
  }, [orders, dateRange]);

  if (!analytics) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const maxSales = Math.max(...analytics.salesByPeriod.map((s) => s.value), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{t("floristAnalytics.title")}</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(["week", "month", "quarter", "year"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => {
              buttonPress();
              setPeriod(p);
            }}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {t(`floristAnalytics.period.${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="cash-outline" size={24} color={colors.success} />
          </View>
          <Text style={styles.metricValue}>{formatPrice(analytics.currentRevenue)} kr</Text>
          <Text style={styles.metricLabel}>{t("floristAnalytics.metrics.revenue")}</Text>
          <View style={[styles.growthBadge, analytics.revenueGrowth >= 0 ? styles.growthPositive : styles.growthNegative]}>
            <Ionicons
              name={analytics.revenueGrowth >= 0 ? "trending-up" : "trending-down"}
              size={12}
              color={analytics.revenueGrowth >= 0 ? colors.success : colors.danger}
            />
            <Text style={[styles.growthText, analytics.revenueGrowth >= 0 ? styles.growthTextPositive : styles.growthTextNegative]}>
              {analytics.revenueGrowth >= 0 ? "+" : ""}{analytics.revenueGrowth.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="bag-handle-outline" size={24} color={colors.info} />
          </View>
          <Text style={styles.metricValue}>{analytics.currentOrdersCount}</Text>
          <Text style={styles.metricLabel}>{t("floristAnalytics.metrics.orders")}</Text>
          <View style={[styles.growthBadge, analytics.ordersGrowth >= 0 ? styles.growthPositive : styles.growthNegative]}>
            <Ionicons
              name={analytics.ordersGrowth >= 0 ? "trending-up" : "trending-down"}
              size={12}
              color={analytics.ordersGrowth >= 0 ? colors.success : colors.danger}
            />
            <Text style={[styles.growthText, analytics.ordersGrowth >= 0 ? styles.growthTextPositive : styles.growthTextNegative]}>
              {analytics.ordersGrowth >= 0 ? "+" : ""}{analytics.ordersGrowth.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="receipt-outline" size={24} color={colors.warning} />
          </View>
          <Text style={styles.metricValue}>{formatPrice(analytics.avgOrderValue)} kr</Text>
          <Text style={styles.metricLabel}>{t("floristAnalytics.metrics.avgOrder")}</Text>
          <View style={[styles.growthBadge, analytics.avgGrowth >= 0 ? styles.growthPositive : styles.growthNegative]}>
            <Ionicons
              name={analytics.avgGrowth >= 0 ? "trending-up" : "trending-down"}
              size={12}
              color={analytics.avgGrowth >= 0 ? colors.success : colors.danger}
            />
            <Text style={[styles.growthText, analytics.avgGrowth >= 0 ? styles.growthTextPositive : styles.growthTextNegative]}>
              {analytics.avgGrowth >= 0 ? "+" : ""}{analytics.avgGrowth.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricIcon}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.metricValue}>{analytics.deliveryRate.toFixed(0)}%</Text>
          <Text style={styles.metricLabel}>{t("floristAnalytics.metrics.conversion")}</Text>
        </View>
      </View>

      {/* Sales Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("floristAnalytics.charts.salesOverTime")}</Text>
        {analytics.salesByPeriod.every((s) => s.value === 0) ? (
          <View style={styles.noData}>
            <Ionicons name="analytics-outline" size={40} color={colors.muted} />
            <Text style={styles.noDataText}>{t("floristAnalytics.noData")}</Text>
          </View>
        ) : (
          <SimpleBarChart data={analytics.salesByPeriod} maxValue={maxSales} />
        )}
      </View>

      {/* Orders by Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("floristAnalytics.charts.ordersByStatus")}</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.statusLabel}>Pending</Text>
            <Text style={styles.statusValue}>{analytics.ordersByStatus.pending}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: colors.info }]} />
            <Text style={styles.statusLabel}>Confirmed</Text>
            <Text style={styles.statusValue}>{analytics.ordersByStatus.confirmed}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.statusLabel}>Preparing</Text>
            <Text style={styles.statusValue}>{analytics.ordersByStatus.preparing}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={styles.statusLabel}>Delivered</Text>
            <Text style={styles.statusValue}>{analytics.ordersByStatus.delivered}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.statusLabel}>Cancelled</Text>
            <Text style={styles.statusValue}>{analytics.ordersByStatus.cancelled}</Text>
          </View>
        </View>
      </View>

      {/* Top Products */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("floristAnalytics.charts.topProducts")}</Text>
        {analytics.topProducts.length === 0 ? (
          <View style={styles.noData}>
            <Ionicons name="flower-outline" size={40} color={colors.muted} />
            <Text style={styles.noDataText}>{t("floristAnalytics.noData")}</Text>
          </View>
        ) : (
          analytics.topProducts.map((product, index) => (
            <View key={index} style={styles.productItem}>
              <View style={styles.productRank}>
                <Text style={styles.productRankText}>{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.productSales}>{product.count} sold</Text>
              </View>
              <Text style={styles.productRevenue}>{formatPrice(product.revenue)} kr</Text>
            </View>
          ))
        )}
      </View>

      {/* Customer Analytics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("floristAnalytics.customers.title")}</Text>
        <View style={styles.customersContainer}>
          <View style={styles.customerStat}>
            <View style={[styles.customerIcon, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="person-add-outline" size={20} color={colors.success} />
            </View>
            <Text style={styles.customerValue}>{analytics.newCustomers}</Text>
            <Text style={styles.customerLabel}>{t("floristAnalytics.customers.new")}</Text>
          </View>
          <View style={styles.customerStat}>
            <View style={[styles.customerIcon, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.customerValue}>{analytics.returningCustomers}</Text>
            <Text style={styles.customerLabel}>{t("floristAnalytics.customers.returning")}</Text>
          </View>
          <View style={styles.customerStat}>
            <View style={[styles.customerIcon, { backgroundColor: colors.info + "20" }]}>
              <Ionicons name="pie-chart-outline" size={20} color={colors.info} />
            </View>
            <Text style={styles.customerValue}>
              {analytics.newCustomers + analytics.returningCustomers > 0
                ? ((analytics.returningCustomers / (analytics.newCustomers + analytics.returningCustomers)) * 100).toFixed(0)
                : 0}%
            </Text>
            <Text style={styles.customerLabel}>{t("floristAnalytics.customers.ratio")}</Text>
          </View>
        </View>
      </View>

      {/* Comparison */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("floristAnalytics.comparison.title")}</Text>
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>{t("floristAnalytics.metrics.revenue")}</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonPrev}>{formatPrice(analytics.prevRevenue)} kr</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.muted} />
              <Text style={styles.comparisonCurrent}>{formatPrice(analytics.currentRevenue)} kr</Text>
            </View>
          </View>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>{t("floristAnalytics.metrics.orders")}</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonPrev}>{analytics.prevOrdersCount}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.muted} />
              <Text style={styles.comparisonCurrent}>{analytics.currentOrdersCount}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  periodTextActive: {
    color: colors.white,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm) / 2,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  growthPositive: {
    backgroundColor: colors.success + "20",
  },
  growthNegative: {
    backgroundColor: colors.danger + "20",
  },
  growthText: {
    fontSize: 11,
    fontWeight: "600",
  },
  growthTextPositive: {
    color: colors.success,
  },
  growthTextNegative: {
    color: colors.danger,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  noData: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  noDataText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 14,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 13,
    color: colors.text,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  productRankText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  productSales: {
    fontSize: 12,
    color: colors.muted,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  customersContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  customerStat: {
    alignItems: "center",
  },
  customerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  customerValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  customerLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  comparisonContainer: {
    gap: spacing.sm,
  },
  comparisonItem: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  comparisonLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  comparisonPrev: {
    fontSize: 14,
    color: colors.muted,
  },
  comparisonCurrent: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
