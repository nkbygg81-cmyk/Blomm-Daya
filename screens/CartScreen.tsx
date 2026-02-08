import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ScrollView } from "react-native";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../lib/CartContext";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCallback } from "react";
import { buttonPress, buttonPressHeavy } from "../lib/haptics";
import { useTranslation } from "../lib/i18n/useTranslation";
import { EmptyState } from "../lib/EmptyState";
import { formatPrice } from "../lib/formatPrice";

type Props = {
  onCheckout: () => void;
};

export function CartScreen({ onCheckout }: Props) {
  const { items, gifts, removeItem, updateQty, addGift, removeGift, updateGiftQty, totalPrice } = useCart();
  const availableGifts = useQuery(api.gifts.listAvailable, {});
  const { t } = useTranslation();

  const renderGiftItem = useCallback(({ item: gift }: { item: any }) => {
    const inCart = gifts.find((g: any) => g.id === gift._id);
    return (
      <TouchableOpacity
        style={[styles.giftCard, inCart && styles.giftCardActive]}
        onPress={() => {
          buttonPress();
          addGift({
            id: gift._id,
            name: gift.name,
            price: gift.price,
            imageUrl: gift.imageUrl || gift.image || null,
          });
        }}
      >
        <Image
          source={{ uri: gift.imageUrl || gift.image || "https://api.a0.dev/assets/image?text=Gift&aspect=1:1" }}
          style={styles.giftImage}
        />
        <Text style={styles.giftName} numberOfLines={1}>{gift.name}</Text>
        <Text style={styles.giftPrice}>{formatPrice(gift.price)} kr</Text>
        {inCart && (
          <View style={styles.giftBadge}>
            <Text style={styles.giftBadgeText}>{inCart.qty}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [gifts, addGift]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="cart-outline"
          title={t("cart.empty")}
          subtitle={t("cart.emptySubtext")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>{t("cart.flowers")}</Text>
        {items.map((item: any) => (
          <View key={item.id} style={styles.cartItem}>
            <Image
              source={{
                uri: item.imageUrl || "https://api.a0.dev/assets/image?text=Flower&aspect=1:1",
              }}
              style={styles.itemImage}
            />
            <View style={styles.itemContent}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(item.price)} kr</Text>

              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => {
                    buttonPress();
                    updateQty(item.id, item.qty - 1);
                  }}
                >
                  <Ionicons name="remove" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => {
                    buttonPress();
                    updateQty(item.id, item.qty + 1);
                  }}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                buttonPress();
                removeItem(item.id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        ))}

        {availableGifts && availableGifts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("cart.addGift")}</Text>
            <FlatList
              data={availableGifts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any) => item._id}
              renderItem={renderGiftItem}
              contentContainerStyle={styles.giftsScroll}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
            />
          </>
        )}

        {gifts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("cart.selectedGifts")}</Text>
            {gifts.map((gift: any) => (
              <View key={gift.id} style={styles.cartItem}>
                <Image
                  source={{
                    uri: gift.imageUrl || "https://api.a0.dev/assets/image?text=Gift&aspect=1:1",
                  }}
                  style={styles.itemImage}
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {gift.name}
                  </Text>
                  <Text style={styles.itemPrice}>{formatPrice(gift.price)} kr</Text>

                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => {
                        buttonPress();
                        updateGiftQty(gift.id, gift.qty - 1);
                      }}
                    >
                      <Ionicons name="remove" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{gift.qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => {
                        buttonPress();
                        updateGiftQty(gift.id, gift.qty + 1);
                      }}
                    >
                      <Ionicons name="add" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    buttonPress();
                    removeGift(gift.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t("cart.total")}:</Text>
          <Text style={styles.totalPrice}>{formatPrice(totalPrice)} kr</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton} onPress={() => {
          buttonPressHeavy();
          onCheckout();
        }}>
          <Text style={styles.checkoutButtonText}>{t("cart.checkout")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.md, paddingBottom: 140 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    minWidth: 24,
    textAlign: "center",
  },
  removeButton: {
    padding: spacing.sm,
  },
  giftsScroll: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  giftCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    minWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  giftCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  giftImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  giftName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  giftPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "center",
  },
  giftBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  giftBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});