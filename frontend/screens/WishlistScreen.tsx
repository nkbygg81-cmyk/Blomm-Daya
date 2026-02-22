import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";
import { useCart } from "../lib/CartContext";
import { useState, useEffect } from "react";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";

type Props = {
  onFlowerPress?: (flowerId: string) => void;
  onBack?: () => void;
};

export function WishlistScreen({ onFlowerPress, onBack }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem } = useCart();
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  const wishlist = useQuery(
    api.wishlist.getWishlist,
    buyerDeviceId ? { buyerDeviceId } : "skip"
  );
  const removeFromWishlist = useMutation(api.wishlist.removeFromWishlist);
  const clearWishlist = useMutation(api.wishlist.clearWishlist);

  const handleRemove = async (flowerId: string) => {
    if (!buyerDeviceId) return;
    buttonPress();
    await removeFromWishlist({ buyerDeviceId, flowerId });
  };

  const handleAddToCart = (item: any) => {
    buttonPress();
    addItem({
      id: item.flowerId,
      name: item.flowerName,
      price: item.flowerPrice,
      imageUrl: item.flowerImage,
      floristName: item.floristName,
    });
  };

  const handleClearAll = () => {
    if (!buyerDeviceId) return;
    Alert.alert(
      t("wishlist.clearTitle"),
      t("wishlist.clearMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: async () => {
            buttonPress();
            await clearWishlist({ buyerDeviceId });
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} data-testid={`wishlist-item-${item.flowerId}`}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => onFlowerPress?.(item.flowerId)}
        activeOpacity={0.7}
      >
        {item.flowerImage ? (
          <Image source={{ uri: item.flowerImage }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="flower-outline" size={32} color={themeColors.muted} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={2}>
            {item.flowerName}
          </Text>
          {item.floristName && (
            <Text style={[styles.florist, { color: themeColors.muted }]}>
              {item.floristName}
            </Text>
          )}
          <Text style={[styles.price, { color: themeColors.primary }]}>
            {formatPrice(item.flowerPrice)} kr
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.cartBtn, { backgroundColor: themeColors.primary }]}
          onPress={() => handleAddToCart(item)}
          data-testid={`add-cart-${item.flowerId}`}
        >
          <Ionicons name="cart-outline" size={20} color={themeColors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.removeBtn, { backgroundColor: themeColors.danger + "20" }]}
          onPress={() => handleRemove(item.flowerId)}
          data-testid={`remove-wishlist-${item.flowerId}`}
        >
          <Ionicons name="heart-dislike-outline" size={20} color={themeColors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="heart-outline" size={64} color={themeColors.muted} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>{t("wishlist.emptyTitle")}</Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.muted }]}>{t("wishlist.emptySubtitle")}</Text>
    </View>
  );

  if (!buyerDeviceId) {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: themeColors.bg }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]} data-testid="wishlist-screen">
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} data-testid="wishlist-back-btn">
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: themeColors.text }]}>{t("wishlist.title")}</Text>
        {wishlist && wishlist.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} data-testid="clear-wishlist-btn">
            <Text style={[styles.clearText, { color: themeColors.danger }]}>{t("wishlist.clearAll")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={wishlist || []}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  clearBtn: {
    padding: spacing.xs,
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    padding: spacing.sm,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  florist: {
    fontSize: 13,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  actions: {
    justifyContent: "center",
    padding: spacing.sm,
    gap: spacing.xs,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBtn: {},
  removeBtn: {},
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
