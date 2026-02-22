import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Image,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../convex/_generated/dataModel";
import * as Location from "expo-location";
import { useTranslation } from "../lib/i18n/useTranslation";

type Props = {
  buyerId: Id<"buyers">;
  buyerName?: string;
  buyerDeviceId: string;
  onBack: () => void;
  onConsultationStarted: (consultationId: Id<"consultations">) => void;
};

export function FloristSelectionScreen({ buyerId, buyerName, buyerDeviceId, onBack, onConsultationStarted }: Props) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const { t } = useTranslation();
  
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });
      }
    })();
  }, []);

  const florists = useQuery(api.consultations.getAvailableFlorists, {
    userLat: userLocation?.lat,
    userLon: userLocation?.lon,
  });
  const startConsultation = useMutation(api.consultations.startConsultation);

  const [selectedFlorist, setSelectedFlorist] = useState<Id<"florists"> | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  const closePortfolioModal = () => {
    setShowPortfolioModal(false);
    setPortfolioImages([]);
  };

  const quickQuestions = [
    t("floristSelection.quickQ1"),
    t("floristSelection.quickQ2"),
    t("floristSelection.quickQ3"),
    t("floristSelection.quickQ4"),
  ];

  const handleStartChat = async (message: string) => {
    if (!selectedFlorist || !message.trim()) return;

    try {
      const consultationId = await startConsultation({
        buyerId,
        buyerName,
        buyerDeviceId,
        floristId: selectedFlorist,
        initialMessage: message.trim(),
      });

      setShowMessageModal(false);
      setInitialMessage("");
      onConsultationStarted(consultationId);
    } catch (error) {
      console.error("Failed to start consultation:", error);
    }
  };

  const handleViewPortfolio = (florist: any) => {
    if (florist.portfolioPhotos && florist.portfolioPhotos.length > 0) {
      const input = (florist.portfolioPhotos as unknown[])
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.trim());

      const uniquePhotos = Array.from(new Set<string>(input));
      setPortfolioImages(uniquePhotos);
      setShowPortfolioModal(true);
    }
  };

  const renderFlorist = ({ item }: any) => (
    <TouchableOpacity
      style={styles.floristCard}
      onPress={() => {
        setSelectedFlorist(item.id);
        setShowMessageModal(true);
      }}
    >
      <View style={styles.floristHeader}>
        <View style={styles.floristInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.floristName}>{item.businessName}</Text>
            {item.isOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.locationRow}>
            {item.city && (
              <Text style={styles.floristCity}>
                <Ionicons name="location-outline" size={12} color={colors.muted} /> {item.city}
              </Text>
            )}
            {item.distance !== null && (
              <Text style={styles.distanceText}>
                • {item.distance < 1 ? `${Math.round(item.distance * 1000)} м` : `${item.distance} км`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFA500" />
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Portfolio Preview */}
      {item.portfolioPhotos && item.portfolioPhotos.length > 0 && (
        <TouchableOpacity
          style={styles.portfolioPreview}
          onPress={() => handleViewPortfolio(item)}
        >
          {(() => {
            const input = (item.portfolioPhotos as unknown[])
              .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
              .map((u) => u.trim());

            const previewPhotos: string[] = Array.from(new Set<string>(input)).slice(0, 3);

            return previewPhotos.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.previewImage} />
            ));
          })()}
          {item.portfolioCount > 3 && (
            <View style={styles.morePhotos}>
              <Text style={styles.morePhotosText}>+{item.portfolioCount - 3}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.floristStats}>
        <View style={styles.stat}>
          <Ionicons name="car" size={16} color={colors.success} />
          <Text style={styles.statText}>{t("floristSelection.deliveryIncluded")}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          <Text style={styles.statText}>{item.totalOrders} {t("floristSelection.orders")}</Text>
        </View>
        {item.portfolioCount > 0 && (
          <View style={styles.stat}>
            <Ionicons name="images-outline" size={16} color={colors.primary} />
            <Text style={styles.statText}>{item.portfolioCount} {t("floristSelection.photos")}</Text>
          </View>
        )}
        {item.responseTime && (
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.statText}>{item.responseTime}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => {
          setSelectedFlorist(item.id);
          setShowMessageModal(true);
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={18} color={colors.white} />
        <Text style={styles.chatButtonText}>{t("floristSelection.ask")}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("floristSelection.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          {t("floristSelection.infoText")}
        </Text>
      </View>

      {/* Florist List */}
      <FlatList
        data={florists ?? []}
        keyExtractor={(item: any) => item.id}
        renderItem={renderFlorist}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="flower-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>{t("floristSelection.emptyTitle")}</Text>
          </View>
        }
      />

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("floristSelection.yourQuestion")}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>{t("floristSelection.quickQuestions")}</Text>
            {quickQuestions.map((q, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickQuestion}
                onPress={() => handleStartChat(q)}
              >
                <Text style={styles.quickQuestionText}>{q}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}

            <Text style={styles.modalSubtitle}>{t("floristSelection.orWriteOwn")}</Text>
            <TextInput
              style={styles.messageInput}
              placeholder={t("floristSelection.inputPlaceholder")}
              value={initialMessage}
              onChangeText={setInitialMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendButton, !initialMessage.trim() && styles.sendButtonDisabled]}
              onPress={() => handleStartChat(initialMessage)}
              disabled={!initialMessage.trim()}
            >
              <Text style={styles.sendButtonText}>{t("floristSelection.send")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Portfolio Modal */}
      <Modal
        visible={showPortfolioModal}
        animationType="fade"
        transparent
        onRequestClose={closePortfolioModal}
      >
        <View style={styles.portfolioModalContainer}>
          <View style={styles.portfolioModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("floristSelection.portfolioTitle")}</Text>
              <TouchableOpacity onPress={closePortfolioModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={portfolioImages}
              extraData={portfolioImages}
              keyExtractor={(item: string) => item}
              numColumns={2}
              columnWrapperStyle={styles.portfolioGridRow}
              renderItem={({ item }: { item: string }) => (
                <View style={styles.portfolioGridItem}>
                  <Image source={{ uri: item }} style={styles.portfolioFullImage} />
                </View>
              )}
              contentContainerStyle={styles.portfolioGrid}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
  },
  floristCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floristHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  floristInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  floristName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  floristCity: {
    fontSize: 12,
    color: colors.muted,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  distanceText: {
    fontSize: 12,
    color: colors.muted,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  portfolioPreview: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.muted + "20",
  },
  morePhotos: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.muted + "40",
    justifyContent: "center",
    alignItems: "center",
  },
  morePhotosText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  floristStats: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: "wrap",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statText: {
    fontSize: 12,
    color: colors.muted,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  chatButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  quickQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  quickQuestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    marginBottom: spacing.lg,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  portfolioModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  portfolioModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    maxHeight: "90%",
  },
  portfolioGrid: {
    paddingBottom: spacing.lg,
  },
  portfolioGridRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  portfolioGridItem: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  portfolioFullImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.muted + "20",
  },
  portfolioItemInfo: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  portfolioItemDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  portfolioItemPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
});