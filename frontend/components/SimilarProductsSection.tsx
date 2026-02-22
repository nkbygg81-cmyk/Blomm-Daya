import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";
import { useCart } from "../lib/CartContext";

type Props = {
  flowerId: string;
  onFlowerPress?: (flowerId: string) => void;
};

export function SimilarProductsSection({ flowerId, onFlowerPress }: Props) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem } = useCart();

  const similarProducts = useQuery(api.similarProducts.getSimilarProducts, {
    flowerId,
    limit: 6,
  });

  if (!similarProducts || similarProducts.length === 0) {
    return null;
  }

  const getName = (product: any) => {
    if (locale === "uk" && product.nameUk) return product.nameUk;
    if (locale === "sv" && product.nameSv) return product.nameSv;
    return product.name;
  };

  const handleAddToCart = (product: any) => {
    buttonPress();
    addItem({
      id: product.id,
      name: getName(product),
      price: product.price,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t("similarProducts.title")}
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.muted }]}>
          {t("similarProducts.subtitle")}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {similarProducts.map((product) => (
          <TouchableOpacity
            key={product._id}
            style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => onFlowerPress?.(product.id)}
            activeOpacity={0.8}
          >
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: themeColors.surface }]}>
                <Ionicons name="flower-outline" size={32} color={themeColors.muted} />
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={2}>
                {getName(product)}
              </Text>
              {product.floristName && (
                <Text style={[styles.florist, { color: themeColors.muted }]} numberOfLines={1}>
                  {product.floristName}
                </Text>
              )}
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: themeColors.primary }]}>
                  {formatPrice(product.price)} {product.currency}
                </Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: themeColors.primary }]}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                >
                  <Ionicons name="add" size={16} color={themeColors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Personalized recommendations for homepage
export function PersonalizedRecommendations({ 
  buyerDeviceId, 
  onFlowerPress 
}: { 
  buyerDeviceId: string; 
  onFlowerPress?: (flowerId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem } = useCart();

  const recommendations = useQuery(api.similarProducts.getPersonalizedRecommendations, {
    buyerDeviceId,
    limit: 8,
  });

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getName = (product: any) => {
    if (locale === "uk" && product.nameUk) return product.nameUk;
    return product.name;
  };

  const handleAddToCart = (product: any) => {
    buttonPress();
    addItem({
      id: product.id,
      name: getName(product),
      price: product.price,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="sparkles" size={20} color={themeColors.primary} />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t("similarProducts.recommendations")}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((product) => (
          <TouchableOpacity
            key={product._id}
            style={[styles.recCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => onFlowerPress?.(product.id)}
            activeOpacity={0.8}
          >
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.recImage} />
            ) : (
              <View style={[styles.recImagePlaceholder, { backgroundColor: themeColors.surface }]}>
                <Ionicons name="flower-outline" size={24} color={themeColors.muted} />
              </View>
            )}
            {/* Reason badge */}
            <View style={[styles.reasonBadge, { backgroundColor: themeColors.primary + "15" }]}>
              <Text style={[styles.reasonText, { color: themeColors.primary }]}>
                {product.reason}
              </Text>
            </View>
            <Text style={[styles.recName, { color: themeColors.text }]} numberOfLines={1}>
              {getName(product)}
            </Text>
            <Text style={[styles.recPrice, { color: themeColors.primary }]}>
              {formatPrice(product.price)} {product.currency}
            </Text>
            <TouchableOpacity
              style={[styles.recAddBtn, { backgroundColor: themeColors.primary }]}
              onPress={(e: any) => {
                e.stopPropagation();
                handleAddToCart(product);
              }}
            >
              <Ionicons name="add" size={16} color={themeColors.white} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Trending products section
export function TrendingProductsSection({ onFlowerPress }: { onFlowerPress?: (flowerId: string) => void }) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem } = useCart();

  const trending = useQuery(api.similarProducts.getTrendingProducts, { limit: 10 });

  if (!trending || trending.length === 0) {
    return null;
  }

  const getName = (product: any) => {
    if (locale === "uk" && product.nameUk) return product.nameUk;
    return product.name;
  };

  const handleAddToCart = (product: any) => {
    buttonPress();
    addItem({
      id: product.id,
      name: getName(product),
      price: product.price,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="trending-up" size={20} color={themeColors.warning} />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t("similarProducts.trending")}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {trending.map((product, index) => (
          <TouchableOpacity
            key={product._id}
            style={[styles.trendingCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => onFlowerPress?.(product.id)}
            activeOpacity={0.8}
          >
            {/* Rank badge */}
            <View style={[styles.rankBadge, { backgroundColor: themeColors.warning }]}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.trendingImage} />
            ) : (
              <View style={[styles.trendingImagePlaceholder, { backgroundColor: themeColors.surface }]}>
                <Ionicons name="flower-outline" size={24} color={themeColors.muted} />
              </View>
            )}
            <Text style={[styles.trendingName, { color: themeColors.text }]} numberOfLines={1}>
              {getName(product)}
            </Text>
            <View style={styles.trendingFooter}>
              <Text style={[styles.trendingPrice, { color: themeColors.primary }]}>
                {formatPrice(product.price)} {product.currency}
              </Text>
              <Text style={[styles.orderCount, { color: themeColors.muted }]}>
                {product.orderCount}x
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.trendingAddBtn, { backgroundColor: themeColors.primary }]}
              onPress={(e: any) => {
                e.stopPropagation();
                handleAddToCart(product);
              }}
            >
              <Ionicons name="add" size={14} color={themeColors.white} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  // Similar products card
  card: {
    width: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 120,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    padding: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  florist: {
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // Recommendations card
  recCard: {
    width: 140,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  recImage: {
    width: "100%",
    height: 100,
  },
  recImagePlaceholder: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reasonText: {
    fontSize: 9,
    fontWeight: "600",
  },
  recName: {
    fontSize: 13,
    fontWeight: "600",
    padding: spacing.xs,
    paddingBottom: 0,
  },
  recPrice: {
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.xs,
  },
  recAddBtn: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  // Trending card
  trendingCard: {
    width: 130,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  rankBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    zIndex: 10,
  },
  rankText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  trendingImage: {
    width: "100%",
    height: 90,
  },
  trendingImagePlaceholder: {
    width: "100%",
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  trendingName: {
    fontSize: 12,
    fontWeight: "600",
    padding: spacing.xs,
    paddingBottom: 0,
  },
  trendingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.xs,
  },
  trendingPrice: {
    fontSize: 13,
    fontWeight: "700",
  },
  orderCount: {
    fontSize: 10,
  },
  trendingAddBtn: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
