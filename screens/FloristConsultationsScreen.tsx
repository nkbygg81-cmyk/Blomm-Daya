import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../convex/_generated/dataModel";
import { useTranslation } from "../lib/i18n/useTranslation";
import { EmptyState } from "../lib/EmptyState";

type Props = {
floristId: string;
onConsultationPress: (consultationId: Id<"consultations">) => void;
};

export function FloristConsultationsScreen({
floristId,
onConsultationPress,
}: Props) {
const consultations = useQuery(api.consultations.listForFlorist, {
floristId: floristId as any,
});

const { t } = useTranslation();

const getStatusColor = (status: string) => {
switch (status) {
case "pending":
return "#F59E0B";
case "active":
return "#3B82F6";
case "completed":
return colors.success;
default:
return colors.muted;
}
};

const getStatusLabel = (status: string) => {
switch (status) {
case "pending":
return t("floristConsultations.statusPending");
case "active":
return t("floristConsultations.statusActive");
case "completed":
return t("floristConsultations.statusCompleted");
default:
return status;
}
};

const renderConsultation = ({ item }: { item: any }) => (
<TouchableOpacity
style={[styles.consultationCard, shadows.card]}
onPress={() => onConsultationPress(item.id)}
>
<View style={styles.cardHeader}>
<View style={styles.cardInfo}>
<Text style={styles.buyerName} numberOfLines={1}>
{item.buyerName || t("floristConsultations.anonymous")}
</Text>
<Text style={styles.messagePreview} numberOfLines={2}>
{item.lastMessage || t("floristConsultations.noMessages")}
</Text>
</View>
<View
style={[
styles.statusBadge,
{ backgroundColor: getStatusColor(item.status) },
]}
>
<Text style={styles.statusText}>
{getStatusLabel(item.status)}
</Text>
</View>
</View>

<View style={styles.cardFooter}>
<Text style={styles.timestamp}>
{new Date(item.lastMessageAt).toLocaleString(t("dateLocale"), {
day: "numeric",
month: "short",
hour: "2-digit",
minute: "2-digit",
})}
</Text>
<Ionicons
name="chevron-forward-outline"
size={20}
color={colors.muted}
/>
</View>
</TouchableOpacity>
);

if (!consultations) {
return (
<View style={styles.container}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

return (
<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<Text style={styles.title}>{t("floristConsultations.title")}</Text>
<Text style={styles.subtitle}>
{consultations.length} {t("floristConsultations.count")}
</Text>
</View>

{consultations.length === 0 ? (
<View style={styles.emptyState}>
<EmptyState
  icon="chatbubble-outline"
  title={t("floristConsultations.empty")}
  subtitle={t("floristConsultations.emptySubtext")}
/>
</View>
) : (
<FlatList
data={consultations}
renderItem={renderConsultation}
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
},
header: {
paddingHorizontal: spacing.md,
paddingTop: spacing.md,
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
listContent: {
paddingHorizontal: spacing.md,
paddingBottom: spacing.xl,
gap: spacing.md,
},
consultationCard: {
backgroundColor: "#fff",
borderRadius: radius.lg,
padding: spacing.md,
},
cardHeader: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "flex-start",
marginBottom: spacing.md,
},
cardInfo: {
flex: 1,
marginRight: spacing.md,
},
buyerName: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
marginBottom: spacing.xs,
},
messagePreview: {
fontSize: 13,
color: colors.muted,
lineHeight: 18,
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
cardFooter: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
borderTopWidth: 1,
borderColor: colors.border,
paddingTop: spacing.md,
},
timestamp: {
fontSize: 12,
color: colors.muted,
},
emptyState: {
alignItems: "center",
justifyContent: "center",
paddingVertical: spacing.xl * 3,
},
emptyText: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
marginTop: spacing.md,
},
emptySubtext: {
fontSize: 13,
color: colors.muted,
marginTop: spacing.sm,
textAlign: "center",
paddingHorizontal: spacing.lg,
},
});

export default FloristConsultationsScreen;