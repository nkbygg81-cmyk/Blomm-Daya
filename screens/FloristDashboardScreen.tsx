import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, FlatList, Alert, ActivityIndicator, TextInput, Modal } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useTranslation } from "../lib/i18n/useTranslation";

type PortfolioPhoto = {
  _id: string;
  imageUrl: string | null;
  description?: string;
  price?: number;
};

type SelectedAsset = {
  uri: string;
  assetId: string | null;
};

type Props = {
floristId: string;
onNavigateToOrders: (status?: string) => void;
};

export function FloristDashboardScreen({ floristId, onNavigateToOrders }: Props) {
const { t } = useTranslation();

const orders = useQuery(api.floristOrders.listForFlorist, { 
floristId: floristId as any 
});

const portfolioPhotos = useQuery(api.florists.getPortfolioPhotos, {
floristId: floristId as any,
});

const generatePortfolioUploadUrl = useMutation(api.florists.generatePortfolioUploadUrl);
const addPortfolioPhoto = useMutation(api.florists.addPortfolioPhoto);
const deletePortfolioPhoto = useMutation(api.florists.deletePortfolioPhoto);

const [uploading, setUploading] = useState(false);
const [showPhotoModal, setShowPhotoModal] = useState(false);
const [photoUri, setPhotoUri] = useState<string | null>(null);
const [photoAssetId, setPhotoAssetId] = useState<string | null>(null);
const [photoDescription, setPhotoDescription] = useState("");
const [photoPrice, setPhotoPrice] = useState("");
const [pendingAssets, setPendingAssets] = useState<SelectedAsset[]>([]);
const [pendingIndex, setPendingIndex] = useState(0);

const resetPhotoModal = () => {
  setShowPhotoModal(false);
  setPhotoUri(null);
  setPhotoAssetId(null);
  setPhotoDescription("");
  setPhotoPrice("");
  setPendingAssets([]);
  setPendingIndex(0);
};

const pendingCount = orders?.filter((o: any) => o.status === "pending").length || 0;
const confirmedCount = orders?.filter((o: any) => o.status === "confirmed").length || 0;
const deliveredCount = orders?.filter((o: any) => o.status === "delivered").length || 0;
const totalRevenue =
  orders
    ?.filter((o: any) => o.status === "delivered")
    .reduce((sum: number, o: any) => sum + (typeof o.total === "number" ? o.total : 0), 0) || 0;

const stats = [
  { label: t("floristDashboard.pending"), value: pendingCount, color: colors.warning, icon: "time-outline", status: "pending" },
  { label: t("floristDashboard.confirmed"), value: confirmedCount, color: colors.info, icon: "checkmark-circle-outline", status: "confirmed" },
  { label: t("floristDashboard.delivered"), value: deliveredCount, color: colors.success, icon: "checkmark-done-outline", status: "delivered" },
  { label: t("floristDashboard.revenue"), value: totalRevenue, color: colors.primary, icon: "cash-outline" },
];

const handleAddPhoto = async () => {
const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

if (permissionResult.granted === false) {
Alert.alert(t("floristDashboard.permissionNeeded"), t("floristDashboard.permissionMessage"));
return;
}

const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Images,
allowsMultipleSelection: true,
quality: 0.8,
});

if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
  const assets = (result.assets as any[]).map((a) => ({
    uri: String(a.uri),
    assetId: typeof a.assetId === "string" ? a.assetId : null,
  })) as SelectedAsset[];

  setPendingAssets(assets);
  setPendingIndex(0);
  setPhotoUri(assets[0]?.uri ?? null);
  setPhotoAssetId(assets[0]?.assetId ?? null);
  setPhotoDescription("");
  setPhotoPrice("");
  setShowPhotoModal(true);
}
};

const handleUploadPhoto = async () => {
if (!photoUri) return;

if (!photoDescription.trim()) {
Alert.alert(t("common.error"), t("floristDashboard.errorNoDescription"));
return;
}

if (!photoPrice.trim()) {
Alert.alert(t("common.error"), t("floristDashboard.errorNoPrice"));
return;
}

const normalizedPrice = photoPrice.replace(",", ".");
const priceNumber = Number.parseFloat(normalizedPrice);
if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
Alert.alert(t("common.error"), t("floristDashboard.errorInvalidPrice"));
return;
}

try {
setUploading(true);

// Upload to a0 image service
// Always upload a local file:// URI.
// ImagePicker may return `ph://` (iOS Photos) or `content://` (Android),
// which often break multipart uploads.
let sourceUri: string = photoUri;
if (sourceUri.startsWith("ph://") || sourceUri.startsWith("content://")) {
  if (!photoAssetId) {
    // Some devices/OS versions don't provide assetId; we'll still try to convert the URI.
  }
  if (photoAssetId) {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) {
      throw new Error("Потрібен дозвіл на доступ до фото (Media Library)");
    }
    const info = await MediaLibrary.getAssetInfoAsync(photoAssetId);
    const resolved = (info as any)?.localUri ?? (info as any)?.uri;
    if (typeof resolved === "string") {
      sourceUri = resolved;
    }
  }
}

// Convert to a cached JPEG file so the server always accepts it.
let converted;
try {
  converted = await ImageManipulator.manipulateAsync(
    sourceUri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );
} catch (e) {
  throw new Error(
    `Не вдалося підготувати фото для завантаження (URI: ${sourceUri}). ${
      e instanceof Error ? e.message : String(e)
    }`
  );
}
const fileUri = converted.uri;
const mimeType = "image/jpeg";

// Upload to Convex file storage
const uploadUrl = await generatePortfolioUploadUrl({});
const fetchFn = (globalThis as any).fetch as any;

// Turn local file into a Blob
const fileResp = await fetchFn(fileUri);
const blob = await fileResp.blob();

const uploadResponse = await fetchFn(uploadUrl, {
  method: "POST",
  headers: {
    "Content-Type": mimeType,
  },
  body: blob,
});

if (!uploadResponse.ok) {
  const text = await uploadResponse.text().catch(() => "");
  throw new Error(`Upload failed: ${uploadResponse.status} ${text}`);
}

const uploadText = await uploadResponse.text();
let uploadJson: any;
try {
  uploadJson = JSON.parse(uploadText);
} catch {
  throw new Error(`Upload response is not JSON: ${uploadText.slice(0, 200)}`);
}

const storageId = uploadJson?.storageId;
if (!storageId || typeof storageId !== "string") {
  throw new Error(`Upload response missing storageId: ${JSON.stringify(uploadJson)}`);
}

// Save to Convex
await addPortfolioPhoto({
floristId: floristId as any,
imageStorageId: storageId as any,
description: photoDescription,
price: priceNumber,
});

Alert.alert(t("common.success"), t("floristDashboard.photoAdded"));

const nextIndex = pendingIndex + 1;
if (pendingAssets.length > 0 && nextIndex < pendingAssets.length) {
  setPendingIndex(nextIndex);
  setPhotoUri(pendingAssets[nextIndex]?.uri ?? null);
  setPhotoAssetId(pendingAssets[nextIndex]?.assetId ?? null);
  setPhotoDescription("");
  setPhotoPrice("");
} else {
  resetPhotoModal();
}
} catch (error) {
console.error(error);
const message =
error instanceof Error
? error.message
: typeof error === "string"
  ? error
  : JSON.stringify(error);
Alert.alert(t("common.error"), message);
} finally {
setUploading(false);
}
};

const handleDeletePhoto = (photoId: any) => {
Alert.alert(
t("floristDashboard.deletePhoto"),
t("floristDashboard.deletePhotoConfirm"),
[
{ text: t("common.cancel"), style: "cancel" },
{
text: t("common.delete"),
style: "destructive",
onPress: async () => {
try {
await deletePortfolioPhoto({ photoId });
} catch (error) {
Alert.alert(t("common.error"), t("floristDashboard.errorDeletePhoto"));
}
},
},
]
);
};

return (
<ScrollView style={styles.container} contentContainerStyle={styles.content}>
<Text style={styles.title}>{t("floristDashboard.title")}</Text>

{/* Portfolio Section - moved to top for better visibility */}
<View style={styles.portfolioSection}>
<View style={styles.portfolioHeader}>
<Text style={styles.sectionTitle}>{t("floristDashboard.myPortfolio")}</Text>
<TouchableOpacity
style={styles.addPhotoButton}
onPress={handleAddPhoto}
disabled={uploading}
>
{uploading ? (
<ActivityIndicator size="small" color={colors.primary} />
) : (
<>
<Ionicons name="add-circle" size={20} color={colors.primary} />
<Text style={styles.addPhotoText}>{t("floristDashboard.addPhoto")}</Text>
</>
)}
</TouchableOpacity>
</View>

{portfolioPhotos && portfolioPhotos.length > 0 ? (
<FlatList
data={portfolioPhotos as unknown as PortfolioPhoto[]}
scrollEnabled={false}
numColumns={2}
keyExtractor={(item: PortfolioPhoto) => String(item._id)}
columnWrapperStyle={styles.portfolioGrid}
renderItem={({ item }: { item: PortfolioPhoto }) => (
<View style={styles.portfolioCard}>
<Image
  source={{
    uri:
      item.imageUrl ??
      "https://api.a0.dev/assets/image?text=Bouquet&aspect=1:1",
  }}
  style={styles.portfolioImage}
  resizeMode="cover"
/>
<TouchableOpacity
style={styles.deleteButton}
onPress={() => handleDeletePhoto(item._id)}
>
<Ionicons name="trash" size={18} color={colors.white} />
</TouchableOpacity>
<View style={styles.portfolioInfo}>
<Text style={styles.portfolioDescription} numberOfLines={2}>{item.description}</Text>
{item.price && (
<Text style={styles.portfolioPrice}>{item.price} kr</Text>
)}
</View>
</View>
)}
/>
) : (
<View style={styles.emptyPortfolio}>
<Ionicons name="images-outline" size={48} color={colors.muted} />
<Text style={styles.emptyText}>{t("floristDashboard.addPhotoToPortfolio")}</Text>
<Text style={styles.emptySubtext}>{t("floristDashboard.buyersWillSee")}</Text>
</View>
)}
</View>

<View style={styles.statsGrid}>
{stats.map((stat, index) => (
<TouchableOpacity
key={index}
style={[styles.statCard, { borderColor: stat.color }]}
onPress={() => {
if (stat.status) {
onNavigateToOrders(stat.status);
}
}}
activeOpacity={stat.status ? 0.7 : 1}
>
<Ionicons name={stat.icon as any} size={32} color={stat.color} />
<Text style={styles.statValue}>{stat.value}</Text>
<Text style={styles.statLabel}>{stat.label}</Text>
</TouchableOpacity>
))}
</View>

<TouchableOpacity
style={styles.actionButton}
onPress={() => onNavigateToOrders()}
>
<Ionicons name="list" size={24} color={colors.white} />
<Text style={styles.actionButtonText}>{t("floristDashboard.allOrders")}</Text>
</TouchableOpacity>

{/* Photo Details Modal */}
<Modal
  visible={showPhotoModal}
  animationType="slide"
  transparent
  onRequestClose={resetPhotoModal}
>
<View style={styles.modalContainer}>
<View style={styles.modalContent}>
<View style={styles.modalHeader}>
<TouchableOpacity onPress={resetPhotoModal}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<View style={styles.modalTitleWrap}>
  <Text style={styles.modalTitle}>{t("floristDashboard.bouquetDetails")}</Text>
  {pendingAssets.length > 1 && (
    <Text style={styles.modalProgress}>
      {pendingIndex + 1}/{pendingAssets.length}
    </Text>
  )}
</View>
<View style={{ width: 24 }} />
</View>

{photoUri && (
<Image source={{ uri: photoUri }} style={styles.modalImage} />
)}

<ScrollView style={styles.modalForm}>
<Text style={styles.label}>{t("floristDashboard.bouquetDescription")}</Text>
<TextInput
style={styles.input}
placeholder={t("floristDashboard.enterDescription")}
value={photoDescription}
onChangeText={setPhotoDescription}
/>

<Text style={styles.label}>{t("floristDashboard.price")}</Text>
<TextInput
style={styles.input}
placeholder={t("floristDashboard.enterPrice")}
value={photoPrice}
onChangeText={setPhotoPrice}
keyboardType="decimal-pad"
/>
</ScrollView>

<View style={styles.modalFooter}>
  <TouchableOpacity
    style={styles.cancelButton}
    onPress={resetPhotoModal}
    disabled={uploading}
  >
    <Text style={styles.cancelButtonText}>{t("floristDashboard.cancelButton")}</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
    onPress={handleUploadPhoto}
    disabled={uploading}
  >
    {uploading ? (
      <ActivityIndicator size="small" color={colors.white} />
    ) : (
      <Text style={styles.uploadButtonText}>
        {pendingAssets.length > 1 && pendingIndex + 1 < pendingAssets.length
          ? `${t("floristDashboard.uploadPhoto")} → ${pendingIndex + 2}/${pendingAssets.length}`
          : t("floristDashboard.uploadPhoto")}
      </Text>
    )}
  </TouchableOpacity>
</View>
</View>
</View>
</Modal>
</ScrollView>
);
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: colors.bg,
},
content: {
  padding: spacing.lg,
},
title: {
  fontSize: 24,
  fontWeight: "700",
  color: colors.text,
  marginBottom: spacing.lg,
},
statsGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
  marginBottom: spacing.lg,
},
statCard: {
  flex: 1,
  minWidth: 150,
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 2,
  padding: spacing.lg,
  alignItems: "center",
  gap: spacing.xs,
  ...shadows.card,
},
statValue: {
  fontSize: 32,
  fontWeight: "700",
  color: colors.text,
},
statLabel: {
  fontSize: 14,
  color: colors.muted,
  textAlign: "center",
},
actionButton: {
  backgroundColor: colors.primary,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  padding: spacing.md,
  borderRadius: radius.lg,
  gap: spacing.sm,
  marginBottom: spacing.lg,
  ...shadows.card,
},
actionButtonText: {
  color: colors.white,
  fontSize: 16,
  fontWeight: "600",
},
portfolioSection: {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.card,
},
portfolioHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.lg,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
},
addPhotoButton: {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  padding: spacing.md,
  borderRadius: radius.md,
  backgroundColor: `${colors.primary}10`,
},
addPhotoText: {
  fontSize: 12,
  fontWeight: "600",
  color: colors.primary,
},
portfolioCard: {
  flex: 1,
  marginBottom: spacing.md,
  marginHorizontal: spacing.xs,
  backgroundColor: colors.bg,
  borderRadius: radius.lg,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: colors.border,
  position: "relative",
  ...shadows.card,
},
portfolioImage: {
  width: "100%",
  aspectRatio: 1,
  backgroundColor: colors.muted + "20",
},
portfolioInfo: {
  padding: spacing.md,
  gap: spacing.xs,
},
portfolioDescription: {
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
},
portfolioPrice: {
  fontSize: 16,
  fontWeight: "700",
  color: colors.primary,
},
deleteButton: {
  position: "absolute",
  top: spacing.sm,
  right: spacing.sm,
  backgroundColor: colors.danger,
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  ...shadows.fab,
},
emptyPortfolio: {
  alignItems: "center",
  paddingVertical: spacing.xl,
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
  marginTop: spacing.xs,
  textAlign: "center",
},
modalContainer: {
  flex: 1,
  backgroundColor: colors.bg,
},
modalContent: {
  flex: 1,
},
modalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.card,
},
modalTitleWrap: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
},
modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
},
modalProgress: {
  fontSize: 12,
  color: colors.muted,
},
modalImage: {
  width: "100%",
  height: 300,
  backgroundColor: colors.muted + "20",
},
modalForm: {
  padding: spacing.lg,
  flex: 1,
},
label: {
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
  marginTop: spacing.md,
},
input: {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  padding: spacing.md,
  fontSize: 15,
  color: colors.text,
},
modalFooter: {
  flexDirection: "row",
  gap: spacing.md,
  padding: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  backgroundColor: colors.card,
},
cancelButton: {
  flex: 1,
  paddingVertical: spacing.md,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: "center",
},
cancelButtonText: {
  color: colors.text,
  fontSize: 16,
  fontWeight: "600",
},
uploadButton: {
  flex: 1,
  paddingVertical: spacing.md,
  borderRadius: radius.md,
  backgroundColor: colors.primary,
  alignItems: "center",
},
uploadButtonDisabled: {
  opacity: 0.6,
},
uploadButtonText: {
  color: colors.white,
  fontSize: 16,
  fontWeight: "600",
},
portfolioGrid: {
  justifyContent: "space-between",
},
});