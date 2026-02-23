import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTheme } from "../lib/ThemeContext";
import { useTranslation } from "../lib/i18n/useTranslation";
import { Ionicons } from "@expo/vector-icons";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { buttonPress } from "../lib/haptics";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = (width - 48) / 3;

type Props = {
  navigation: any;
  route?: {
    params?: {
      floristId?: string;
    };
  };
};

export default function CustomerGalleryScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  const floristId = route?.params?.floristId;

  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  const publicGallery = useQuery(
    api.customerGallery.getPublicGallery,
    floristId ? { floristId: floristId as any, limit: 100 } : { limit: 100 }
  );
  
  const myPhotos = useQuery(
    api.customerGallery.getMyPhotos,
    buyerDeviceId ? { buyerDeviceId } : "skip"
  );

  const uploadPhotoMutation = useMutation(api.customerGallery.uploadPhoto);
  const deletePhotoMutation = useMutation(api.customerGallery.deletePhoto);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const isLoading = publicGallery === undefined;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewImageUri(result.assets[0].uri);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!newImageUri || !buyerDeviceId) return;

    setUploading(true);
    try {
      // For demo - use a placeholder URL
      // In production, upload to Convex storage
      const imageUrl = newImageUri;
      
      await uploadPhotoMutation({
        buyerDeviceId,
        imageUrl,
        isPublic,
      });

      Alert.alert(
        t("common.success"),
        isPublic 
          ? "Фото надіслано на модерацію" 
          : "Фото додано до вашої галереї"
      );
      setShowUploadModal(false);
      setNewImageUri(null);
    } catch (error) {
      Alert.alert(t("common.error"), "Не вдалося завантажити фото");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!buyerDeviceId) return;
    
    Alert.alert(
      "Видалити фото?",
      "Ця дія незворотна",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deletePhotoMutation({ photoId: photoId as any, buyerDeviceId });
          },
        },
      ]
    );
  };

  const renderPhoto = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => {
        buttonPress();
        setSelectedImage(item.imageUrl);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.photoImage} />
      {item.floristName && (
        <View style={[styles.floristBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.floristBadgeText} numberOfLines={1}>
            {item.floristName}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMyPhoto = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => {
        buttonPress();
        setSelectedImage(item.imageUrl);
      }}
      onLongPress={() => handleDelete(item._id)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.photoImage} />
      {!item.approved && item.isPublic && (
        <View style={[styles.pendingBadge, { backgroundColor: "#F59E0B" }]}>
          <Text style={styles.pendingBadgeText}>На модерації</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => {
            buttonPress();
            navigation.goBack();
          }}
          style={styles.backButton}
          data-testid="gallery-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("customerGallery.title")}
        </Text>
        <TouchableOpacity
          onPress={() => {
            buttonPress();
            pickImage();
          }}
          style={styles.addButton}
          data-testid="gallery-add-photo"
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={publicGallery}
          renderItem={renderPhoto}
          keyExtractor={(item) => item._id}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={
            myPhotos && myPhotos.length > 0 ? (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("customerGallery.yourPhotos")}
                </Text>
                <FlatList
                  data={myPhotos}
                  renderItem={renderMyPhoto}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.myPhotosContainer}
                />
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                  {t("customerGallery.subtitle")}
                </Text>
              </View>
            ) : (
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("customerGallery.subtitle")}
              </Text>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("customerGallery.empty")}
              </Text>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                onPress={pickImage}
              >
                <Text style={styles.uploadButtonText}>
                  {t("customerGallery.addPhoto")}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Fullscreen Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.fullscreenModal}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={[styles.uploadModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.uploadModalHeader}>
              <Text style={[styles.uploadModalTitle, { color: colors.text }]}>
                Додати фото
              </Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {newImageUri && (
              <Image source={{ uri: newImageUri }} style={styles.previewImage} />
            )}

            <TouchableOpacity
              style={[styles.publicToggle, { backgroundColor: colors.card }]}
              onPress={() => setIsPublic(!isPublic)}
            >
              <Ionicons
                name={isPublic ? "checkbox" : "square-outline"}
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.publicToggleText, { color: colors.text }]}>
                Показати в публічній галереї
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                uploading && { opacity: 0.7 },
              ]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Завантажити</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  myPhotosContainer: {
    paddingBottom: 8,
  },
  photoItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  floristBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  floristBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  pendingBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  uploadButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: width,
    height: width,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
  },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  uploadModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  uploadModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  publicToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  publicToggleText: {
    fontSize: 14,
    marginLeft: 12,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
