import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import { formatPrice } from "../lib/formatPrice";

type Props = {
floristId: string;
onBack?: () => void;
};

type Period = "week" | "month" | "year" | "all";

export function FloristFinancialReportsScreen({ floristId, onBack }: Props) {
const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
const { t } = useTranslation();

const stats = useQuery(api.florists.getFinancialStats, {
floristId: floristId as any,
});

const orders = useQuery(api.floristOrders.listForFlorist, {
floristId: floristId as any,
});

if (!stats) {
return (
<View style={[styles.container, styles.centered]}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

const periods: { key: Period; label: string }[] = [
{ key: "week", label: t("financialReports.week") },
{ key: "month", label: t("financialReports.month") },
{ key: "year", label: t("financialReports.year") },
{ key: "all", label: t("financialReports.allTime") },
];

const getRevenueByPeriod = () => {
switch (selectedPeriod) {
case "week": return stats.thisWeekRevenue;
case "month": return stats.thisMonthRevenue;
case "year": return stats.thisYearRevenue;
case "all": return stats.totalRevenue;
default: return stats.thisMonthRevenue;
}
};

const platformFeeDisplay = Math.round(stats.platformFeePercent * 100);
const floristShareDisplay = 100 - platformFeeDisplay;

const monthlyChange = stats.lastMonthRevenue > 0
? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100).toFixed(1)
: "0";
const isPositiveChange = parseFloat(monthlyChange) >= 0;

const recentDelivered = (orders || [])
.filter((o: any) => o.status === "delivered" || o.status === "completed")
.slice(0, 5);

return (
<ScrollView style={styles.container} contentContainerStyle={styles.content}>
{onBack && (
<TouchableOpacity style={styles.backButton} onPress={onBack}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
)}
<Text style={styles.title}>{t("financialReports.title")}</Text>

{/* Period Selector */}
<View style={styles.periodSelector}>
{periods.map((period) => (
<TouchableOpacity
key={period.key}
style={[
styles.periodButton,
selectedPeriod === period.key && styles.periodButtonActive,
]}
onPress={() => setSelectedPeriod(period.key)}
>
<Text
style={[
styles.periodButtonText,
selectedPeriod === period.key && styles.periodButtonTextActive,
]}
>
{period.label}
</Text>
</TouchableOpacity>
))}
</View>

{/* Main Revenue Card */}
<View style={styles.mainCard}>
<Text style={styles.mainCardLabel}>{t("financialReports.yourIncome")}</Text>
<Text style={styles.mainCardValue}>{formatPrice(getRevenueByPeriod())} kr</Text>
<View style={styles.changeRow}>
<Ionicons
name={isPositiveChange ? "trending-up" : "trending-down"}
size={16}
color={isPositiveChange ? colors.success : colors.danger}
/>
<Text
style={[
styles.changeText,
{ color: isPositiveChange ? colors.success : colors.danger },
]}
>
{isPositiveChange ? "+" : ""}{monthlyChange}% {t("financialReports.vsLastMonth")}
</Text>
</View>
</View>

{/* Stats Grid */}
<View style={styles.statsGrid}>
<View style={styles.statCard}>
<Ionicons name="cart-outline" size={24} color={colors.primary} />
<Text style={styles.statValue}>{stats.totalOrders}</Text>
<Text style={styles.statLabel}>{t("financialReports.orders")}</Text>
</View>
<View style={styles.statCard}>
<Ionicons name="receipt-outline" size={24} color={colors.info} />
<Text style={styles.statValue}>{formatPrice(stats.averageOrderValue)} kr</Text>
<Text style={styles.statLabel}>{t("financialReports.averageCheck")}</Text>
</View>
<View style={styles.statCard}>
<Ionicons name="calendar-outline" size={24} color={colors.success} />
<Text style={styles.statValue}>{formatPrice(stats.thisMonthRevenue)} kr</Text>
<Text style={styles.statLabel}>{t("financialReports.thisMonth")}</Text>
</View>
<View style={styles.statCard}>
<Ionicons name="time-outline" size={24} color={colors.warning} />
<Text style={styles.statValue}>{formatPrice(stats.lastMonthRevenue)} kr</Text>
<Text style={styles.statLabel}>{t("financialReports.lastMonth")}</Text>
</View>
</View>

{/* Commission Info */}
<View style={styles.commissionCard}>
<View style={styles.commissionHeader}>
<Ionicons name="information-circle-outline" size={20} color={colors.info} />
<Text style={styles.commissionTitle}>{t("financialReports.incomeDistribution")}</Text>
</View>
<View style={styles.commissionBar}>
<View style={[styles.commissionBarFill, { flex: floristShareDisplay }]}>
<Text style={styles.commissionBarText}>{floristShareDisplay}%</Text>
</View>
<View style={[styles.commissionBarPlatform, { flex: platformFeeDisplay }]}>
<Text style={styles.commissionBarTextSmall}>{platformFeeDisplay}%</Text>
</View>
</View>
<View style={styles.commissionLegend}>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.success }]} />
<Text style={styles.legendText}>{t("financialReports.yourIncomePct", { pct: String(floristShareDisplay) })}</Text>
</View>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.muted }]} />
<Text style={styles.legendText}>{t("financialReports.platformFeePct", { pct: String(platformFeeDisplay) })}</Text>
</View>
</View>
</View>

{/* Recent Transactions */}
<View style={styles.transactionsCard}>
<Text style={styles.sectionTitle}>{t("financialReports.recentTransactions")}</Text>
{recentDelivered.length === 0 ? (
<View style={styles.emptyState}>
<Ionicons name="receipt-outline" size={48} color={colors.muted} />
<Text style={styles.emptyText}>{t("financialReports.noCompletedOrders")}</Text>
</View>
) : (
recentDelivered.map((order: any) => (
<View key={order._id} style={styles.transactionRow}>
<View style={styles.transactionInfo}>
<Text style={styles.transactionCustomer}>{order.customerName || t("financialReports.client")}</Text>
<Text style={styles.transactionDate}>
{new Date(order._creationTime).toLocaleDateString(t("dateLocale"))}
</Text>
</View>
<Text style={styles.transactionAmount}>
+{Math.round(order.total * (1 - stats.platformFeePercent))} kr
</Text>
</View>
))
)}
</View>

{/* Stripe Info */}
<View style={styles.stripeCard}>
<Ionicons name="card-outline" size={24} color={colors.primary} />
<View style={styles.stripeInfo}>
<Text style={styles.stripeTitle}>{t("financialReports.stripePayouts")}</Text>
<Text style={styles.stripeText}>{t("financialReports.stripePayoutsInfo")}</Text>
</View>
</View>
</ScrollView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.bg },
centered: { justifyContent: "center", alignItems: "center" },
content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
backButton: { marginBottom: spacing.md, flexDirection: "row", alignItems: "center" },
periodSelector: {
flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.lg,
padding: spacing.xs, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
},
periodButton: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.md },
periodButtonActive: { backgroundColor: colors.primary },
periodButtonText: { fontSize: 14, fontWeight: "600", color: colors.muted },
periodButtonTextActive: { color: colors.white },
mainCard: {
backgroundColor: colors.primary, padding: spacing.xl, borderRadius: radius.lg,
marginBottom: spacing.lg, alignItems: "center", ...shadows.card,
},
mainCardLabel: { fontSize: 14, color: colors.white, opacity: 0.8, marginBottom: spacing.sm },
mainCardValue: { fontSize: 36, fontWeight: "700", color: colors.white },
changeRow: {
flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm,
backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: spacing.md,
paddingVertical: spacing.xs, borderRadius: 999,
},
changeText: { fontSize: 13, fontWeight: "600" },
statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
statCard: {
flex: 1, minWidth: 150, backgroundColor: colors.card, padding: spacing.lg,
borderRadius: radius.lg, alignItems: "center", gap: spacing.xs,
borderWidth: 1, borderColor: colors.border, ...shadows.card,
},
statValue: { fontSize: 20, fontWeight: "700", color: colors.text },
statLabel: { fontSize: 12, color: colors.muted, textAlign: "center" },
commissionCard: {
backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg,
marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card,
},
commissionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
commissionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
commissionBar: { flexDirection: "row", height: 32, borderRadius: radius.md, overflow: "hidden", marginBottom: spacing.md },
commissionBarFill: { backgroundColor: colors.success, justifyContent: "center", alignItems: "center" },
commissionBarPlatform: { backgroundColor: colors.muted, justifyContent: "center", alignItems: "center" },
commissionBarText: { fontSize: 14, fontWeight: "700", color: colors.white },
commissionBarTextSmall: { fontSize: 12, fontWeight: "600", color: colors.white },
commissionLegend: { gap: spacing.sm },
legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
legendDot: { width: 10, height: 10, borderRadius: 5 },
legendText: { fontSize: 13, color: colors.text },
transactionsCard: {
backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg,
marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card,
},
sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
emptyState: { alignItems: "center", paddingVertical: spacing.xl },
emptyText: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },
transactionRow: {
flexDirection: "row", justifyContent: "space-between", alignItems: "center",
paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
},
transactionInfo: { flex: 1 },
transactionCustomer: { fontSize: 15, fontWeight: "600", color: colors.text },
transactionDate: { fontSize: 13, color: colors.muted, marginTop: 2 },
transactionAmount: { fontSize: 16, fontWeight: "700", color: colors.success },
stripeCard: {
flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card,
padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card,
},
stripeInfo: { flex: 1 },
stripeTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
stripeText: { fontSize: 13, color: colors.muted, marginTop: 4 },
});

export default FloristFinancialReportsScreen;