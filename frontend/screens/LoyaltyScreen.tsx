import { useState, useEffect } from "react";
import {
View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "../lib/i18n/useTranslation";

type Props = {
onBack: () => void;
};

export function LoyaltyScreen({ onBack }: Props) {
const [authToken, setAuthToken] = useState<string | null>(null);
const { t } = useTranslation();
const dateLocale = t("dateLocale");

const REWARDS = [
{ points: 100, label: t("loyalty.discount5"), icon: "pricetag" },
{ points: 250, label: t("loyalty.freeDelivery"), icon: "car" },
{ points: 500, label: t("loyalty.discount15"), icon: "star" },
{ points: 1000, label: t("loyalty.freeBouquet"), icon: "gift" },
];

useEffect(() => {
AsyncStorage.getItem("buyerAuthToken").then(setAuthToken);
}, []);

const buyer = useQuery(
api.buyerAuth.getCurrentBuyer,
authToken ? { token: authToken } : "skip"
);

const balance = useQuery(
api.loyalty.getBalance,
buyer?.id ? { buyerId: buyer.id as any } : "skip"
);

const history = useQuery(
api.loyalty.getHistory,
buyer?.id ? { buyerId: buyer.id as any } : "skip"
);

const levelColors: Record<string, string> = {
Bronze: "#CD7F32",
Silver: "#C0C0C0",
Gold: "#FFD700",
};

const levelIcons: Record<string, string> = {
Bronze: "shield-outline",
Silver: "shield-half-outline",
Gold: "shield",
};

return (
<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<TouchableOpacity onPress={onBack}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.title}>{t("loyalty.title")}</Text>
<View style={{ width: 24 }} />
</View>

{/* Points card */}
<View style={[styles.pointsCard, shadows.fab]}>
<View style={styles.pointsTop}>
<View>
<Text style={styles.pointsLabel}>{t("loyalty.yourPoints")}</Text>
<Text style={styles.pointsValue}>{balance?.points ?? 0}</Text>
</View>
{balance && (
<View style={[styles.levelBadge, { backgroundColor: levelColors[balance.level] + "30" }]}>
<Ionicons
name={levelIcons[balance.level] as any}
size={20}
color={levelColors[balance.level]}
/>
<Text style={[styles.levelText, { color: levelColors[balance.level] }]}>
{balance.level}
</Text>
</View>
)}
</View>

{/* Progress to next level */}
{balance && balance.nextLevelPoints > 0 && (
<View style={styles.progressSection}>
<Text style={styles.progressLabel}>
{t("loyalty.toNextLevel", { points: String(balance.nextLevelPoints) })}
</Text>
<View style={styles.progressBarBg}>
<View
style={[
styles.progressBarFill,
{
width: `${Math.min(
((balance.totalEarned) / (balance.totalEarned + balance.nextLevelPoints)) * 100,
100
)}%`,
},
]}
/>
</View>
</View>
)}

<View style={styles.statsRow}>
<View style={styles.statBox}>
<Text style={styles.statValue}>{balance?.totalEarned ?? 0}</Text>
<Text style={styles.statLabel}>{t("loyalty.earned")}</Text>
</View>
<View style={styles.statDivider} />
<View style={styles.statBox}>
<Text style={styles.statValue}>{balance?.totalSpent ?? 0}</Text>
<Text style={styles.statLabel}>{t("loyalty.spent")}</Text>
</View>
</View>
</View>

{/* How it works */}
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("loyalty.howItWorks")}</Text>
<View style={styles.howItWorks}>
{[
{ icon: "cart", text: t("loyalty.step1"), color: colors.primary },
{ icon: "star", text: t("loyalty.step2"), color: colors.warning },
{ icon: "gift", text: t("loyalty.step3"), color: colors.success },
].map((step, i) => (
<View key={i} style={styles.step}>
<View style={[styles.stepIcon, { backgroundColor: step.color + "20" }]}>
<Ionicons name={step.icon as any} size={24} color={step.color} />
</View>
<Text style={styles.stepText}>{step.text}</Text>
</View>
))}
</View>
</View>

{/* Available rewards */}
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("loyalty.availableRewards")}</Text>
{REWARDS.map((reward, i) => {
const canRedeem = (balance?.points ?? 0) >= reward.points;
return (
<View
key={i}
style={[styles.rewardCard, !canRedeem && styles.rewardCardDisabled]}
>
<View style={[styles.rewardIcon, canRedeem && { backgroundColor: colors.primary + "20" }]}>
<Ionicons
name={reward.icon as any}
size={24}
color={canRedeem ? colors.primary : colors.muted}
/>
</View>
<View style={styles.rewardInfo}>
<Text style={[styles.rewardLabel, !canRedeem && { color: colors.muted }]}>
{reward.label}
</Text>
<Text style={styles.rewardPoints}>{reward.points} {t("loyalty.points")}</Text>
</View>
{canRedeem && (
<TouchableOpacity style={styles.redeemButton}>
<Text style={styles.redeemText}>{t("loyalty.redeem")}</Text>
</TouchableOpacity>
)}
</View>
);
})}
</View>

{/* History */}
{history && history.length > 0 && (
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("loyalty.pointsHistory")}</Text>
{history.map((tx: any) => (
<View key={tx.id} style={styles.historyRow}>
<View style={[styles.historyIcon, tx.points > 0 ? styles.earnedIcon : styles.spentIcon]}>
<Ionicons
name={tx.points > 0 ? "add" : "remove"}
size={16}
color={tx.points > 0 ? colors.success : colors.danger}
/>
</View>
<View style={styles.historyInfo}>
<Text style={styles.historyDesc}>{tx.description}</Text>
<Text style={styles.historyDate}>
{new Date(tx.createdAt).toLocaleDateString(dateLocale)}
</Text>
</View>
<Text
style={[styles.historyPoints, { color: tx.points > 0 ? colors.success : colors.danger }]}
>
{tx.points > 0 ? "+" : ""}{tx.points}
</Text>
</View>
))}
</View>
)}

<View style={{ height: 40 }} />
</ScrollView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.bg },
header: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
},
title: { fontSize: 18, fontWeight: "700", color: colors.text },
pointsCard: {
backgroundColor: colors.primary,
borderRadius: radius.xl,
padding: spacing.xl,
marginHorizontal: spacing.md,
marginBottom: spacing.lg,
},
pointsTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
pointsLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
pointsValue: { fontSize: 48, fontWeight: "800", color: colors.white },
levelBadge: {
flexDirection: "row",
alignItems: "center",
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: 999,
gap: spacing.xs,
},
levelText: { fontSize: 14, fontWeight: "700" },
progressSection: { marginTop: spacing.md },
progressLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: spacing.xs },
progressBarBg: {
height: 6,
backgroundColor: "rgba(255,255,255,0.2)",
borderRadius: 3,
overflow: "hidden",
},
progressBarFill: {
height: "100%",
backgroundColor: colors.white,
borderRadius: 3,
},
statsRow: {
flexDirection: "row",
marginTop: spacing.lg,
borderTopWidth: 1,
borderTopColor: "rgba(255,255,255,0.2)",
paddingTop: spacing.md,
},
statBox: { flex: 1, alignItems: "center" },
statValue: { fontSize: 20, fontWeight: "700", color: colors.white },
statLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
howItWorks: { flexDirection: "row", gap: spacing.md },
step: { flex: 1, alignItems: "center" },
stepIcon: {
width: 56,
height: 56,
borderRadius: 28,
justifyContent: "center",
alignItems: "center",
marginBottom: spacing.sm,
},
stepText: { fontSize: 12, color: colors.text, textAlign: "center", fontWeight: "500" },
rewardCard: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.card,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
borderWidth: 1,
borderColor: colors.border,
},
rewardCardDisabled: { opacity: 0.5 },
rewardIcon: {
width: 48,
height: 48,
borderRadius: 24,
backgroundColor: colors.bg,
justifyContent: "center",
alignItems: "center",
marginRight: spacing.md,
},
rewardInfo: { flex: 1 },
rewardLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
rewardPoints: { fontSize: 12, color: colors.muted, marginTop: 2 },
redeemButton: {
backgroundColor: colors.primary,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderRadius: radius.sm,
},
redeemText: { fontSize: 13, fontWeight: "600", color: colors.white },
historyRow: {
flexDirection: "row",
alignItems: "center",
paddingVertical: spacing.sm,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
historyIcon: {
width: 32,
height: 32,
borderRadius: 16,
justifyContent: "center",
alignItems: "center",
marginRight: spacing.md,
},
earnedIcon: { backgroundColor: colors.success + "20" },
spentIcon: { backgroundColor: colors.danger + "20" },
historyInfo: { flex: 1 },
historyDesc: { fontSize: 14, color: colors.text },
historyDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
historyPoints: { fontSize: 16, fontWeight: "700" },
});