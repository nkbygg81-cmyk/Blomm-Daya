import { StyleSheet, Text, View, ScrollView, FlatList, ActivityIndicator, Image } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { EmptyState } from "../lib/EmptyState";

type Props = {
floristId: string;
};

export function FloristReviewsScreen({ floristId }: Props) {
const reviews = useQuery(api.floristReviews.getForFlorist, {
floristId: floristId as any,
});

const stats = useQuery(api.floristReviews.getStats, {
floristId: floristId as any,
});

const { t } = useTranslation();

const renderStarRating = (rating: number) => {
return (
<View style={styles.starsContainer}>
{[1, 2, 3, 4, 5].map((star) => (
<Ionicons
key={star}
name={star <= rating ? "star" : "star-outline"}
size={16}
color={star <= rating ? "#FCD34D" : colors.border}
/>
))}
</View>
);
};

const renderRatingDistribution = () => {
if (!stats) return null;

const maxCount = Math.max(
stats.ratingDistribution.fiveStar,
stats.ratingDistribution.fourStar,
stats.ratingDistribution.threeStar,
stats.ratingDistribution.twoStar,
stats.ratingDistribution.oneStar,
1
);

return (
<View style={styles.distributionContainer}>
{[5, 4, 3, 2, 1].map((rating) => {
const key = ratingKeys[rating - 1];
return (
<View key={rating} style={styles.distributionRow}>
<Text style={styles.ratingLabel}>{rating} ⭐</Text>
<View style={styles.barContainer}>
<View
style={[
styles.bar,
{
width: `${(stats.ratingDistribution[key] / maxCount) * 100}%`,
},
]}
/>
</View>
<Text style={styles.countLabel}>
{stats.ratingDistribution[key]}
</Text>
</View>
);
})}
</View>
);
};

const renderReview = ({ item }: { item: any }) => (
<View style={[styles.reviewCard, shadows.card]}>
<View style={styles.reviewHeader}>
<View style={styles.reviewerInfo}>
<Text style={styles.buyerName}>{item.buyerName || t("floristReviews.anonymous")}</Text>
<Text style={styles.reviewDate}>
{new Date(item.createdAt).toLocaleDateString(t("dateLocale"))}
</Text>
</View>
<View style={styles.rating}>{renderStarRating(item.rating)}</View>
</View>

{item.comment && (
<Text style={styles.reviewComment}>{item.comment}</Text>
)}

{item.photoUrls && item.photoUrls.length > 0 && (
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
{item.photoUrls.map((url: string, idx: number) => (
<Image key={idx} source={{ uri: url }} style={styles.reviewPhoto} />
))}
</ScrollView>
)}

<View style={styles.reviewMetrics}>
<View style={styles.metricItem}>
<Text style={styles.metricLabel}>{t("floristReviews.delivery")}</Text>
<View style={styles.smallStars}>
{renderStarRating(item.deliveryRating)}
</View>
</View>
<View style={styles.metricItem}>
<Text style={styles.metricLabel}>{t("floristReviews.quality")}</Text>
<View style={styles.smallStars}>
{renderStarRating(item.qualityRating)}
</View>
</View>
</View>
</View>
);

if (!reviews || !stats) {
return (
<View style={styles.container}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

return (
<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<Text style={styles.title}>{t("floristReviews.title")}</Text>
<Text style={styles.subtitle}>
{stats.totalReviews} {t("floristReviews.count")}
</Text>
</View>

{stats.totalReviews > 0 ? (
<>
<View style={[styles.statsCard, shadows.card]}>
<View style={styles.mainRating}>
<Text style={styles.avgRating}>
{stats.avgRating.toFixed(1)}
</Text>
<View style={styles.starsAndCount}>
<View style={styles.largeStars}>
{renderStarRating(Math.round(stats.avgRating))}
</View>
<Text style={styles.totalCount}>
({stats.totalReviews})
</Text>
</View>
</View>

<View style={styles.ratingBreakdown}>
<View style={styles.breakdownItem}>
<Text style={styles.breakdownLabel}>{t("floristReviews.delivery")}</Text>
<Text style={styles.breakdownValue}>
{stats.avgDeliveryRating.toFixed(1)}
</Text>
</View>
<View style={styles.divider} />
<View style={styles.breakdownItem}>
<Text style={styles.breakdownLabel}>{t("floristReviews.quality")}</Text>
<Text style={styles.breakdownValue}>
{stats.avgQualityRating.toFixed(1)}
</Text>
</View>
</View>
</View>

<View style={styles.distributionSection}>
<Text style={styles.distributionTitle}>{t("floristReviews.distribution")}</Text>
{renderRatingDistribution()}
</View>

<View style={styles.reviewsSection}>
<Text style={styles.reviewsTitle}>{t("floristReviews.allReviews")}</Text>
<FlatList
data={reviews}
renderItem={renderReview}
keyExtractor={(item) => item.id}
scrollEnabled={false}
contentContainerStyle={styles.listContent}
/>
</View>
</>
) : (
<View style={styles.emptyState}>
<EmptyState
  icon="star-outline"
  title={t("floristReviews.empty")}
  subtitle={t("floristReviews.emptySubtext")}
/>
</View>
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
statsCard: {
marginHorizontal: spacing.md,
marginBottom: spacing.lg,
backgroundColor: "#fff",
borderRadius: radius.lg,
padding: spacing.lg,
},
mainRating: {
flexDirection: "row",
alignItems: "center",
marginBottom: spacing.lg,
},
avgRating: {
fontSize: 48,
fontWeight: "700",
color: colors.primary,
marginRight: spacing.md,
},
starsAndCount: {
flex: 1,
},
largeStars: {
marginBottom: spacing.sm,
},
starsContainer: {
flexDirection: "row",
gap: spacing.xs,
},
totalCount: {
fontSize: 14,
color: colors.muted,
},
ratingBreakdown: {
flexDirection: "row",
borderTopWidth: 1,
borderColor: colors.border,
paddingTop: spacing.md,
},
breakdownItem: {
flex: 1,
alignItems: "center",
},
divider: {
width: 1,
backgroundColor: colors.border,
},
breakdownLabel: {
fontSize: 12,
color: colors.muted,
marginBottom: spacing.xs,
},
breakdownValue: {
fontSize: 18,
fontWeight: "600",
color: colors.text,
},
distributionSection: {
paddingHorizontal: spacing.md,
marginBottom: spacing.lg,
},
distributionTitle: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
marginBottom: spacing.md,
},
distributionContainer: {
gap: spacing.md,
},
distributionRow: {
flexDirection: "row",
alignItems: "center",
gap: spacing.md,
},
ratingLabel: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
width: 50,
},
barContainer: {
flex: 1,
height: 6,
backgroundColor: colors.border,
borderRadius: radius.sm,
overflow: "hidden",
},
bar: {
height: "100%",
backgroundColor: colors.primary,
},
countLabel: {
fontSize: 12,
color: colors.muted,
width: 30,
textAlign: "right",
},
reviewsSection: {
paddingHorizontal: spacing.md,
marginBottom: spacing.xl,
},
reviewsTitle: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
marginBottom: spacing.md,
},
listContent: {
gap: spacing.md,
},
reviewCard: {
backgroundColor: "#fff",
borderRadius: radius.lg,
padding: spacing.md,
},
reviewHeader: {
marginBottom: spacing.md,
},
reviewerInfo: {
marginBottom: spacing.sm,
},
buyerName: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
},
reviewDate: {
fontSize: 12,
color: colors.muted,
marginTop: spacing.xs,
},
rating: {
marginTop: spacing.sm,
},
smallStars: {
marginTop: spacing.xs,
},
reviewComment: {
fontSize: 13,
color: colors.text,
lineHeight: 18,
marginBottom: spacing.md,
fontStyle: "italic",
},
reviewMetrics: {
flexDirection: "row",
borderTopWidth: 1,
borderColor: colors.border,
paddingTop: spacing.md,
gap: spacing.lg,
},
metricItem: {
flex: 1,
},
metricLabel: {
fontSize: 11,
color: colors.muted,
marginBottom: spacing.xs,
},
photoScroll: {
marginBottom: spacing.md,
},
reviewPhoto: {
width: 100,
height: 100,
borderRadius: 8,
marginRight: spacing.sm,
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

const ratingKeys = ["oneStar", "twoStar", "threeStar", "fourStar", "fiveStar"] as const;