import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";
import { useCart } from "../lib/CartContext";

type Props = {
  onBack?: () => void;
  onBundlePress?: (bundleId: string) => void;
};

export function ProductBundlesScreen({ onBack, onBundlePress }: Props) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem } = useCart();

  const bundles = useQuery(api.productBundles.getActiveBundles, {});

  const getBundleName = (bundle: any) => {
    if (locale === "uk" && bundle.nameUk) return bundle.nameUk;
    if (locale === "sv" && bundle.nameSv) return bundle.nameSv;
    return bundle.name;
  };

  const getBundleDescription = (bundle: any) => {
    if (locale === "uk" && bundle.descriptionUk) return bundle.descriptionUk;
    if (locale === "sv" && bundle.descriptionSv) return bundle.descriptionSv;
    return bundle.description;
  };

  const handleAddBundle = (bundle: any) => {
    buttonPress();
    // Add bundle as a single item
    addItem({
      id: `bundle_${bundle._id}`,
      name: getBundleName(bundle),
      price: bundle.bundlePrice,
      imageUrl: bundle.imageUrl,
      isBundle: true,
    });
  };

  const renderBundle = ({ item }: { item: any }) => {
    const savings = item.originalPrice - item.bundlePrice;
    
    return (
      <TouchableOpacity
        style={[styles.bundleCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
        onPress={() => onBundlePress?.(item._id)}
        activeOpacity={0.8}
      >
        {/* Discount Badge */}
        <View style={[styles.discountBadge, { backgroundColor: themeColors.danger }]}>
          <Text style={styles.discountText}>-{item.discountPercent}%</Text>
        </View>

        {/* Image */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.bundleImage} />
        ) : (
          <View style={[styles.bundleImagePlaceholder, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="gift-outline" size={48} color={themeColors.muted} />
          </View>
        )}

        {/* Content */}
        <View style={styles.bundleContent}>
          <Text style={[styles.bundleName, { color: themeColors.text }]} numberOfLines={2}>
            {getBundleName(item)}
          </Text>
          
          {item.description && (
            <Text style={[styles.bundleDescription, { color: themeColors.muted }]} numberOfLines={2}>
              {getBundleDescription(item)}
            </Text>
          )}

          {/* Items count */}
          <View style={styles.itemsRow}>
            <Ionicons name="flower-outline" size={14} color={themeColors.primary} />
            <Text style={[styles.itemsCount, { color: themeColors.muted }]}>
              {item.items.length} {t("bundles.items")}
            </Text>
          </View>

          {/* Prices */}
          <View style={styles.pricesRow}>
            <View>
              <Text style={[styles.originalPrice, { color: themeColors.muted }]}>
                {formatPrice(item.originalPrice)} {item.currency}
              </Text>
              <Text style={[styles.bundlePrice, { color: themeColors.primary }]}>
                {formatPrice(item.bundlePrice)} {item.currency}
              </Text>
            </View>
            <View style={[styles.savingsBadge, { backgroundColor: themeColors.success + "20" }]}>
              <Ionicons name="trending-down" size={14} color={themeColors.success} />
              <Text style={[styles.savingsText, { color: themeColors.success }]}>
                {t("bundles.save")} {formatPrice(savings)} {item.currency}
              </Text>
            </View>
          </View>

          {/* Add to cart button */}
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => handleAddBundle(item)}
          >
            <Ionicons name="cart-outline" size={18} color={themeColors.white} />
            <Text style={[styles.addBtnText, { color: themeColors.white }]}>
              {t("bundles.addBundle")}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift-outline" size={64} color={themeColors.muted} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {t("bundles.title")}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.muted }]}>
        {t("bundles.subtitle")}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t("bundles.title")}
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.muted }]}>
            {t("bundles.subtitle")}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={bundles || []}
        renderItem={renderBundle}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// Compact bundle card for homepage
export function FeaturedBundlesSection({ onViewAll, onBundlePress }: { 
  onViewAll?: () => void; 
  onBundlePress?: (bundleId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();

  const bundles = useQuery(api.productBundles.getFeaturedBundles, { limit: 3 });

  if (!bundles || bundles.length === 0) return null;

  const getBundleName = (bundle: any) => {
    if (locale === "uk" && bundle.nameUk) return bundle.nameUk;
    if (locale === "sv" && bundle.nameSv) return bundle.nameSv;
    return bundle.name;
  };

  return (
    <View style={styles.featuredSection}>
      <View style={styles.featuredHeader}>
        <Text style={[styles.featuredTitle, { color: themeColors.text }]}>
          {t("bundles.featured")}
        </Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={[styles.viewAllText, { color: themeColors.primary }]}>
              {t("bundles.viewAll")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {bundles.map((bundle) => (
          <TouchableOpacity
            key={bundle._id}
            style={[styles.featuredCard, { backgroundColor: themeColors.card }]}
            onPress={() => onBundlePress?.(bundle._id)}
          >
            <View style={[styles.featuredBadge, { backgroundColor: themeColors.danger }]}>
              <Text style={styles.featuredBadgeText}>-{bundle.discountPercent}%</Text>
            </View>
            {bundle.imageUrl ? (
              <Image source={{ uri: bundle.imageUrl }} style={styles.featuredImage} />
            ) : (
              <View style={[styles.featuredImagePlaceholder, { backgroundColor: themeColors.surface }]}>
                <Ionicons name="gift" size={32} color={themeColors.muted} />
              </View>
            )}
            <Text style={[styles.featuredName, { color: themeColors.text }]} numberOfLines={1}>
              {getBundleName(bundle)}
            </Text>
            <Text style={[styles.featuredPrice, { color: themeColors.primary }]}>
              {formatPrice(bundle.bundlePrice)} kr
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  bundleCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.card,
  },
  discountBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 10,
  },
  discountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  bundleImage: {
    width: "100%",
    height: 180,
  },
  bundleImagePlaceholder: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  bundleContent: {
    padding: spacing.md,
  },
  bundleName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  bundleDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  itemsCount: {
    fontSize: 13,
  },
  pricesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  bundlePrice: {
    fontSize: 22,
    fontWeight: "700",
  },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    gap: 4,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  // Featured section styles
  featuredSection: {
    marginVertical: spacing.md,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  featuredCard: {
    width: 150,
    marginLeft: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  featuredBadge: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    zIndex: 10,
  },
  featuredBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  featuredImage: {
    width: "100%",
    height: 100,
  },
  featuredImagePlaceholder: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredName: {
    fontSize: 14,
    fontWeight: "600",
    padding: spacing.sm,
    paddingBottom: 0,
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: "700",
    padding: spacing.sm,
    paddingTop: spacing.xs,
  },
});
