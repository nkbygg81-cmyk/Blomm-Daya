import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

type PhotoReview = {
  _id: string;
  imageUrl: string;
  caption?: string;
  rating: number;
  buyerName?: string;
  status?: string;
  createdAt: number;
};

type Props = {
  floristId: string;
  orderId?: string;
  onBack?: () => void;
  showAddReview?: boolean;
};

export function PhotoReviewsComponent({ floristId, orderId, onBack, showAddReview = false }: Props) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(showAddReview);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Real data from Convex
  const photoReviews = useQuery(
    api.photoReviews.getFloristPhotoReviews,
    floristId ? { floristId: floristId as any, limit: 50 } : "skip"
  );
  
  const submitPhotoReviewMutation = useMutation(api.photoReviews.submitPhotoReview);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const isLoading = photoReviews === undefined;

  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("photoReviews.permissionNeeded"),
        t("photoReviews.permissionMessage")
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedImage || !buyerDeviceId || !orderId) {
      Alert.alert(t("common.error"), t("photoReviews.addPhoto"));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // 2. Read file as base64 and upload
      const base64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: "base64" as const,
      });
      
      // 3. Upload to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
      });
      
      const { storageId } = await response.json();
      
      // 4. Get the public URL for the uploaded image
      const imageUrl = `https://blissful-bison-657.convex.site/getImage?storageId=${storageId}`;
      
      // 5. Submit the photo review
      await submitPhotoReviewMutation({
        orderId: orderId as any,
        buyerDeviceId,
        floristId: floristId as any,
        imageUrl,
        caption: caption || undefined,
        rating,
      });
      
      Alert.alert(t("photoReviews.success"), t("photoReviews.successMessage"));
      setShowAddModal(false);
      setSelectedImage(null);
      setCaption("");
      setRating(5);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      Alert.alert(t("common.error"), error?.message || t("aiChat.errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!interactive}
          onPress={() => {
            if (interactive) {
              buttonPress();
              setRating(star);
            }
          }}
        >
          <Ionicons
            name={star <= currentRating ? "star" : "star-outline"}
            size={interactive ? 32 : 16}
            color={star <= currentRating ? "#FFD700" : themeColors.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPhotoCard = ({ item }: { item: PhotoReview }) => (
    <TouchableOpacity
      style={[styles.photoCard, { backgroundColor: themeColors.card }]}
      onPress={() => setFullscreenImage(item.imageUrl)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.photoImage} />
      <View style={styles.photoOverlay}>
        {renderStars(item.rating)}
        {item.buyerName && (
          <Text style={styles.photoAuthor} numberOfLines={1}>
            {item.buyerName}
          </Text>
        )}
      </View>
      {item.caption && (
        <Text style={[styles.photoCaption, { color: themeColors.text }]} numberOfLines={2}>
          {item.caption}
        </Text>
      )}
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="camera-outline" size={64} color={themeColors.muted} />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {t("photoReviews.noPhotos")}
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: themeColors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={20} color={themeColors.white} />
        <Text style={[styles.addButtonText, { color: themeColors.white }]}>
          {t("photoReviews.addPhoto")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      {onBack && (
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t("photoReviews.title")}
          </Text>
          <TouchableOpacity
            style={styles.addIconBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle-outline" size={28} color={themeColors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Grid or Empty State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (photoReviews && photoReviews.length > 0) ? (
        <FlatList
          data={photoReviews}
          renderItem={renderPhotoCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState />
      )}

      {/* Add Review Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {t("photoReviews.addPhoto")}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Image Picker */}
              <TouchableOpacity
                style={[
                  styles.imagePicker,
                  { borderColor: themeColors.border, backgroundColor: themeColors.surface },
                ]}
                onPress={handlePickImage}
              >
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Ionicons name="camera-outline" size={48} color={themeColors.muted} />
                    <Text style={[styles.imagePickerText, { color: themeColors.muted }]}>
                      {t("photoReviews.uploadPhoto")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Rating */}
              <View style={styles.ratingSection}>
                <Text style={[styles.sectionLabel, { color: themeColors.text }]}>
                  {t("photoReviews.rating")}
                </Text>
                {renderStars(rating, true)}
              </View>

              {/* Caption */}
              <View style={styles.captionSection}>
                <Text style={[styles.sectionLabel, { color: themeColors.text }]}>
                  {t("photoReviews.caption")}
                </Text>
                <TextInput
                  style={[
                    styles.captionInput,
                    { backgroundColor: themeColors.surface, color: themeColors.text, borderColor: themeColors.border },
                  ]}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder={t("photoReviews.caption")}
                  placeholderTextColor={themeColors.muted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: themeColors.primary },
                  (!selectedImage || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitReview}
                disabled={!selectedImage || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color={themeColors.white} />
                    <Text style={[styles.submitButtonText, { color: themeColors.white }]}>
                      {t("photoReviews.submitting")}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={themeColors.white} />
                    <Text style={[styles.submitButtonText, { color: themeColors.white }]}>
                      {t("photoReviews.submit")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={!!fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          activeOpacity={1}
          onPress={() => setFullscreenImage(null)}
        >
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Compact version for embedding in product/florist pages
export function PhotoReviewsGallery({ floristId }: { floristId: string }) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  
  // Real data from Convex
  const photos = useQuery(
    api.photoReviews.getFloristPhotoReviews,
    floristId ? { floristId: floristId as any, limit: 10 } : "skip"
  );

  if (!photos || photos.length === 0) return null;

  return (
    <View style={styles.galleryContainer}>
      <View style={styles.galleryHeader}>
        <Text style={[styles.galleryTitle, { color: themeColors.text }]}>
          {t("photoReviews.customerPhotos")}
        </Text>
        <TouchableOpacity>
          <Text style={[styles.galleryViewAll, { color: themeColors.primary }]}>
            {t("photoReviews.viewAll")}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((photo) => (
          <TouchableOpacity key={photo._id} style={styles.galleryPhoto}>
            <Image source={{ uri: photo.imageUrl }} style={styles.galleryImage} />
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
    justifyContent: "space-between",
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
  addIconBtn: {
    width: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContent: {
    padding: spacing.md,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  photoCard: {
    width: "48%",
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    aspectRatio: 1,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: spacing.xs,
  },
  photoAuthor: {
    color: "white",
    fontSize: 12,
    marginTop: 2,
  },
  photoCaption: {
    padding: spacing.sm,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    aspectRatio: 4 / 3,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerText: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
  ratingSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  starsContainer: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  captionSection: {
    marginBottom: spacing.lg,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
  fullscreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
  },
  galleryContainer: {
    marginVertical: spacing.md,
  },
  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  galleryViewAll: {
    fontSize: 14,
    fontWeight: "500",
  },
  galleryPhoto: {
    marginLeft: spacing.md,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  galleryImage: {
    width: 100,
    height: 100,
  },
});
