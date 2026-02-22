import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import { formatPrice } from "../lib/formatPrice";

type Props = {
floristId: string;
onOrderPress?: (orderId: string) => void;
onBack?: () => void;
};

type CalendarOrder = {
_id: string;
deliveryDate: number | null;
status: string;
total: number;
customerName: string | null;
deliveryAddress: string | null;
itemsCount: number;
};

export function FloristCalendarScreen({ floristId, onOrderPress, onBack }: Props) {
const [currentMonth, setCurrentMonth] = useState(new Date());
const { t } = useTranslation();

const orders = useQuery(api.florists.getOrdersForCalendar, {
floristId: floristId as any,
});

const allOrders = useQuery(api.floristOrders.listForFlorist, {
floristId: floristId as any,
});

// Group orders by date
const ordersByDate = useMemo(() => {
const map = new Map<string, CalendarOrder[]>();
if (!orders) return map;

for (const order of orders) {
if (!order.deliveryDate) continue;
const dateKey = new Date(order.deliveryDate).toISOString().split("T")[0];
if (!map.has(dateKey)) {
map.set(dateKey, []);
}
map.get(dateKey)!.push(order);
}

return map;
}, [orders]);

// Generate calendar days
const calendarDays = useMemo(() => {
const year = currentMonth.getFullYear();
const month = currentMonth.getMonth();

const firstDay = new Date(year, month, 1);
const lastDay = new Date(year, month + 1, 0);

const days: (Date | null)[] = [];

// Add empty slots for days before the first day of month
const startDayOfWeek = firstDay.getDay();
const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday first
for (let i = 0; i < adjustedStart; i++) {
days.push(null);
}

// Add all days of the month
for (let day = 1; day <= lastDay.getDate(); day++) {
days.push(new Date(year, month, day));
}

return days;
}, [currentMonth]);

const navigateMonth = (direction: number) => {
const newMonth = new Date(currentMonth);
newMonth.setMonth(newMonth.getMonth() + direction);
setCurrentMonth(newMonth);
};

const isToday = (date: Date) => {
const today = new Date();
return date.toDateString() === today.toDateString();
};

const getOrdersForDate = (date: Date): CalendarOrder[] => {
const dateKey = date.toISOString().split("T")[0];
return ordersByDate.get(dateKey) || [];
};

const getStatusColor = (status: string) => {
switch (status) {
case "pending":
return colors.warning;
case "confirmed":
return colors.info;
case "delivered":
case "completed":
return colors.success;
case "cancelled":
return colors.danger;
default:
return colors.muted;
}
};

const monthNames = t("floristCalendar.monthNames").split(",");
const dayNames = t("floristCalendar.dayNames").split(",");
const dateLocale = t("dateLocale");

// Stats for current month
const monthStats = useMemo(() => {
if (!allOrders) return { total: 0, pending: 0, confirmed: 0, delivered: 0 };

const year = currentMonth.getFullYear();
const month = currentMonth.getMonth();

const monthOrders = allOrders.filter((o: any) => {
const orderDate = new Date(o._creationTime);
return orderDate.getFullYear() === year && orderDate.getMonth() === month;
});

return {
total: monthOrders.length,
pending: monthOrders.filter((o: any) => o.status === "pending").length,
confirmed: monthOrders.filter((o: any) => o.status === "confirmed").length,
delivered: monthOrders.filter((o: any) => o.status === "delivered" || o.status === "completed").length,
};
}, [allOrders, currentMonth]);

if (!orders) {
return (
<View style={[styles.container, styles.centered]}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

return (
<ScrollView style={styles.container} contentContainerStyle={styles.content}>
{onBack && (
<TouchableOpacity style={styles.backButton} onPress={onBack}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
)}
<Text style={styles.title}>{t("floristCalendar.title")}</Text>

{/* Month Navigation */}
<View style={styles.monthNav}>
<TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
<Ionicons name="chevron-back" size={24} color={colors.text} />
</TouchableOpacity>

<Text style={styles.monthTitle}>
{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
</Text>

<TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
<Ionicons name="chevron-forward" size={24} color={colors.text} />
</TouchableOpacity>
</View>

{/* Month Stats */}
<View style={styles.statsRow}>
<View style={[styles.statBadge, { backgroundColor: colors.muted + "20" }]}>
<Text style={styles.statBadgeValue}>{monthStats.total}</Text>
<Text style={styles.statBadgeLabel}>{t("floristCalendar.total")}</Text>
</View>
<View style={[styles.statBadge, { backgroundColor: colors.warning + "20" }]}>
<Text style={[styles.statBadgeValue, { color: colors.warning }]}>{monthStats.pending}</Text>
<Text style={styles.statBadgeLabel}>{t("floristCalendar.processing")}</Text>
</View>
<View style={[styles.statBadge, { backgroundColor: colors.info + "20" }]}>
<Text style={[styles.statBadgeValue, { color: colors.info }]}>{monthStats.confirmed}</Text>
<Text style={styles.statBadgeLabel}>{t("floristCalendar.confirmed")}</Text>
</View>
<View style={[styles.statBadge, { backgroundColor: colors.success + "20" }]}>
<Text style={[styles.statBadgeValue, { color: colors.success }]}>{monthStats.delivered}</Text>
<Text style={styles.statBadgeLabel}>{t("floristCalendar.delivered")}</Text>
</View>
</View>

{/* Calendar Grid */}
<View style={styles.calendarCard}>
{/* Day Headers */}
<View style={styles.dayHeaders}>
{dayNames.map((day) => (
<View key={day} style={styles.dayHeader}>
<Text style={styles.dayHeaderText}>{day}</Text>
</View>
))}
</View>

{/* Calendar Days */}
<View style={styles.calendarGrid}>
{calendarDays.map((date, index) => {
if (!date) {
return <View key={`empty-${index}`} style={styles.calendarDay} />;
}

const dayOrders = getOrdersForDate(date);
const hasOrders = dayOrders.length > 0;
const today = isToday(date);

return (
<View
key={date.toISOString()}
style={[
styles.calendarDay,
today && styles.calendarDayToday,
hasOrders && styles.calendarDayWithOrders,
]}
>
<Text style={[styles.calendarDayText, today && styles.calendarDayTextToday]}>
{date.getDate()}
</Text>

{hasOrders && (
<View style={styles.orderDots}>
{dayOrders.slice(0, 3).map((order, i) => (
<View
key={i}
style={[styles.orderDot, { backgroundColor: getStatusColor(order.status) }]}
/>
))}
{dayOrders.length > 3 && (
<Text style={styles.moreOrders}>+{dayOrders.length - 3}</Text>
)}
</View>
)}
</View>
);
})}
</View>
</View>

{/* Upcoming Orders */}
<View style={styles.upcomingSection}>
<Text style={styles.sectionTitle}>{t("floristCalendar.upcomingOrders")}</Text>

{orders.length === 0 ? (
<View style={styles.emptyState}>
<Ionicons name="calendar-outline" size={48} color={colors.muted} />
<Text style={styles.emptyText}>{t("floristCalendar.noPlannedOrders")}</Text>
</View>
) : (
orders
.filter((o) => o.deliveryDate && o.deliveryDate >= Date.now())
.sort((a, b) => (a.deliveryDate || 0) - (b.deliveryDate || 0))
.slice(0, 5)
.map((order) => (
<TouchableOpacity
key={order._id}
style={styles.orderCard}
onPress={() => onOrderPress?.(order._id)}
activeOpacity={0.7}
>
<View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) }]} />
<View style={styles.orderInfo}>
<Text style={styles.orderCustomer}>{order.customerName || t("floristCalendar.client")}</Text>
<Text style={styles.orderDate}>
{order.deliveryDate
? new Date(order.deliveryDate).toLocaleDateString(dateLocale, {
weekday: "short",
day: "numeric",
month: "short",
hour: "2-digit",
minute: "2-digit",
})
: t("floristCalendar.dateNotSet")}
</Text>
{order.deliveryAddress && (
<Text style={styles.orderAddress} numberOfLines={1}>
{order.deliveryAddress}
</Text>
)}
</View>
<View style={styles.orderRight}>
<Text style={styles.orderTotal}>{formatPrice(order.total)} kr</Text>
<Text style={styles.orderItems}>{order.itemsCount} {t("floristCalendar.items")}</Text>
</View>
</TouchableOpacity>
))
)}
</View>

{/* Legend */}
<View style={styles.legendCard}>
<Text style={styles.legendTitle}>{t("floristCalendar.legend")}</Text>
<View style={styles.legendItems}>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
<Text style={styles.legendText}>{t("floristCalendar.legendProcessing")}</Text>
</View>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.info }]} />
<Text style={styles.legendText}>{t("floristCalendar.legendConfirmed")}</Text>
</View>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.success }]} />
<Text style={styles.legendText}>{t("floristCalendar.legendDelivered")}</Text>
</View>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
<Text style={styles.legendText}>{t("floristCalendar.legendCancelled")}</Text>
</View>
</View>
</View>
</ScrollView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.bg,
},
centered: {
justifyContent: "center",
alignItems: "center",
},
content: {
padding: spacing.lg,
paddingBottom: spacing.xl * 2,
},
title: {
fontSize: 24,
fontWeight: "700",
color: colors.text,
marginBottom: spacing.lg,
},
monthNav: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
marginBottom: spacing.md,
},
navButton: {
padding: spacing.sm,
},
monthTitle: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
},
statsRow: {
flexDirection: "row",
gap: spacing.sm,
marginBottom: spacing.lg,
},
statBadge: {
flex: 1,
paddingVertical: spacing.sm,
paddingHorizontal: spacing.xs,
borderRadius: radius.md,
alignItems: "center",
},
statBadgeValue: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
},
statBadgeLabel: {
fontSize: 10,
color: colors.muted,
marginTop: 2,
},
calendarCard: {
backgroundColor: colors.card,
borderRadius: radius.lg,
padding: spacing.md,
marginBottom: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
dayHeaders: {
flexDirection: "row",
marginBottom: spacing.sm,
},
dayHeader: {
flex: 1,
alignItems: "center",
paddingVertical: spacing.xs,
},
dayHeaderText: {
fontSize: 12,
fontWeight: "600",
color: colors.muted,
},
calendarGrid: {
flexDirection: "row",
flexWrap: "wrap",
},
calendarDay: {
width: "14.28%",
aspectRatio: 1,
alignItems: "center",
justifyContent: "center",
padding: 2,
},
calendarDayToday: {
backgroundColor: colors.primary + "20",
borderRadius: radius.md,
},
calendarDayWithOrders: {
backgroundColor: colors.success + "10",
borderRadius: radius.md,
},
calendarDayText: {
fontSize: 14,
color: colors.text,
},
calendarDayTextToday: {
fontWeight: "700",
color: colors.primary,
},
orderDots: {
flexDirection: "row",
gap: 2,
marginTop: 2,
},
orderDot: {
width: 6,
height: 6,
borderRadius: 3,
},
moreOrders: {
fontSize: 8,
color: colors.muted,
},
upcomingSection: {
marginBottom: spacing.lg,
},
sectionTitle: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
marginBottom: spacing.md,
},
emptyState: {
alignItems: "center",
paddingVertical: spacing.xl,
backgroundColor: colors.card,
borderRadius: radius.lg,
borderWidth: 1,
borderColor: colors.border,
},
emptyText: {
fontSize: 14,
color: colors.muted,
marginTop: spacing.sm,
},
orderCard: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.card,
padding: spacing.md,
borderRadius: radius.lg,
marginBottom: spacing.sm,
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
orderStatus: {
width: 4,
height: "100%",
borderRadius: 2,
marginRight: spacing.md,
},
orderInfo: {
flex: 1,
},
orderCustomer: {
fontSize: 15,
fontWeight: "600",
color: colors.text,
},
orderDate: {
fontSize: 13,
color: colors.primary,
marginTop: 2,
},
orderAddress: {
fontSize: 12,
color: colors.muted,
marginTop: 2,
},
orderRight: {
alignItems: "flex-end",
},
orderTotal: {
fontSize: 16,
fontWeight: "700",
color: colors.text,
},
orderItems: {
fontSize: 12,
color: colors.muted,
marginTop: 2,
},
legendCard: {
backgroundColor: colors.card,
padding: spacing.lg,
borderRadius: radius.lg,
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
legendTitle: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
marginBottom: spacing.md,
},
legendItems: {
flexDirection: "row",
flexWrap: "wrap",
gap: spacing.md,
},
legendItem: {
flexDirection: "row",
alignItems: "center",
gap: spacing.xs,
},
legendDot: {
width: 10,
height: 10,
borderRadius: 5,
},
legendText: {
fontSize: 13,
color: colors.text,
},
backButton: {
marginBottom: spacing.md,
flexDirection: "row",
alignItems: "center",
},
});
