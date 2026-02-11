import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from "react-native";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../lib/CartContext";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTranslation } from "../lib/i18n/useTranslation";

type Flower = {
  id: string;
  name: string;
  nameUk?: string;
  nameSv?: string;
  description: string | null;
  descriptionUk?: string | null;
  descriptionSv?: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
};

type Props = {
  flower: Flower;
  onBack: () => void;
  onAskFlorist?: () => void;
};

export function FlowerDetailScreen({ flower, onBack, onAskFlorist }: Props) {
  const { addItem } = useCart();
  const { t, locale } = useTranslation();
  const dateLocale = t("dateLocale");

  // Вибір правильного поля залежно від мови
  let name = flower.name;
  let description = flower.description;
  if (locale === "uk" && flower.nameUk) name = flower.nameUk;
  if (locale === "sv" && flower.nameSv) name = flower.nameSv;
  if (locale === "uk" && flower.descriptionUk) description = flower.descriptionUk;
  if (locale === "sv" && flower.descriptionSv) description = flower.descriptionSv;

  // Get reviews and ratings
  const reviews = useQuery(api.reviews.listForFlower, { flowerId: flower.id, limit: 5 });
  const ratingData = useQuery(api.reviews.getAverageRating, { flowerId: flower.id });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image
          source={{
            uri: flower.imageUrl || "https://api.a0.dev/assets/image?text=Flower&aspect=1:1",
          }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{name}</Text>
              {ratingData && ratingData.count > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#FFA500" />
                  <Text style={styles.ratingText}>
                    {ratingData.average.toFixed(1)} ({ratingData.count})
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.price}>
            {flower.price} {flower.currency || "kr"}
          </Text>

          {description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("flowerDetail.description")}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          )}

          {/* Reviews Section */}
          {reviews && reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("flowerDetail.reviews")} ({reviews.length})</Text>
              {reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.buyerName || t("flowerDetail.anonymous")}</Text>
                    <View style={styles.reviewRating}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Ionicons key={i} name="star" size={14} color="#FFA500" />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString(dateLocale)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonGroup}>
            {onAskFlorist && (
              <TouchableOpacity
                style={styles.askFloristButton}
                onPress={onAskFlorist}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.white} />
                <Text style={styles.askFloristButtonText}>{t("flowerDetail.askFlorist")}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                addItem({
                  id: flower.id,
                  name,
                  price: flower.price,
                  imageUrl: flower.imageUrl,
                });
                onBack();
              }}
            >
              <Ionicons name="cart" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>{t("flowerDetail.addToCart")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  nameContainer: {
    flex: 1,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.xs,
    fontWeight: "600",
  },
  reviewCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  reviewRating: {
    flexDirection: "row",
  },
  reviewComment: {
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textLight,
  },
  container: { flex: 1, backgroundColor: colors.bg },
  backButton: {
    position: "absolute",
    top: 50,
    left: spacing.md,
    zIndex: 10,
    backgroundColor: colors.white,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: { paddingBottom: spacing.xl },
  image: {
    width: "100%",
    height: 400,
    backgroundColor: colors.border,
  },
  content: { padding: spacing.lg },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonGroup: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  askFloristButton: {
    backgroundColor: "#8B5CF6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
  },
  askFloristButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});