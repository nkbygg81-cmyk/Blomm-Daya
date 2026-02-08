import { useState } from "react";
import {
View, Text, StyleSheet, ScrollView, TouchableOpacity,
TextInput, Alert, Image, FlatList,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

type Props = {
floristId: string;
onBack: () => void;
};

export function FloristStoriesManageScreen({ floristId, onBack }: Props) {
const stories = useQuery(api.floristStories.listForFlorist, {
floristId: floristId as any,
});
const createStory = useMutation(api.floristStories.create);
const removeStory = useMutation(api.floristStories.remove);

const [imageUrl, setImageUrl] = useState("");
const [caption, setCaption] = useState("");
const [creating, setCreating] = useState(false);
const [localImageUri, setLocalImageUri] = useState<string | null>(null);

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [9, 16],
    quality: 0.8,
  });
  if (!result.canceled && result.assets[0]) {
    setLocalImageUri(result.assets[0].uri);
    setImageUrl("");
  }
};

const handleCreate = async () => {
  const finalUrl = localImageUri || imageUrl.trim();
  if (!finalUrl) {
    Alert.alert("Помилка", "Оберіть або вставте фото");
    return;
  }
  setCreating(true);
  try {
    await createStory({
      floristId: floristId as any,
      imageUrl: finalUrl,
      caption: caption.trim() || undefined,
    });
    setImageUrl("");
    setCaption("");
    setLocalImageUri(null);
    Alert.alert("Успіх!", "Історію опубліковано на 24 години");
  } catch (e: any) {
    Alert.alert("Помилка", e.message);
  } finally {
    setCreating(false);
  }
};

const handleRemove = (storyId: any) => {
Alert.alert("Видалити історію?", "", [
{ text: "Скасувати", style: "cancel" },
{
text: "Видалити",
style: "destructive",
onPress: () => removeStory({ storyId }),
},
]);
};

const isExpired = (expiresAt: number) => Date.now() > expiresAt;
const timeLeft = (expiresAt: number) => {
const diff = expiresAt - Date.now();
if (diff <= 0) return "Закінчилось";
const hours = Math.floor(diff / (1000 * 60 * 60));
const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
return `${hours} год ${mins} хв`;
};

return (
<ScrollView style={styles.container}>
<View style={styles.header}>
<TouchableOpacity onPress={onBack}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.title}>Мої історії</Text>
<View style={{ width: 24 }} />
</View>

{/* Create story */}
<View style={[styles.createCard, shadows.card]}>
<Text style={styles.sectionTitle}>Нова історія</Text>
<Text style={styles.hint}>
Публікуйте фото ваших робіт — покупці побачать їх у стрічці
</Text>

<TouchableOpacity style={styles.pickImageBtn} onPress={pickImage}>
  <Ionicons name="image-outline" size={22} color={colors.primary} />
  <Text style={styles.pickImageText}>Обрати фото з галереї</Text>
</TouchableOpacity>

{localImageUri ? (
<Image
source={{ uri: localImageUri }}
style={styles.preview}
resizeMode="cover"
/>
) : null}

<TextInput
style={styles.input}
placeholder="Або вставте URL фото (https://...)"
value={localImageUri ? "" : imageUrl}
onChangeText={(text) => {
  setLocalImageUri(null);
  setImageUrl(text);
}}
placeholderTextColor={colors.muted}
autoCapitalize="none"
editable={!localImageUri}
/>
{!localImageUri && imageUrl.trim() !== "" && (
<Image
source={{ uri: imageUrl }}
style={styles.preview}
resizeMode="cover"
/>
)}
<TextInput
style={styles.input}
placeholder="Опис (необов'язково)"
value={caption}
onChangeText={setCaption}
placeholderTextColor={colors.muted}
/>
<TouchableOpacity
style={[styles.publishBtn, creating && { opacity: 0.7 }]}
onPress={handleCreate}
disabled={creating}
>
<Ionicons name="add-circle" size={20} color={colors.white} />
<Text style={styles.publishText}>Опублікувати</Text>
</TouchableOpacity>
</View>

{/* Existing stories */}
{stories && stories.length > 0 && (
<View style={styles.section}>
<Text style={styles.sectionTitle}>Активні ({stories.filter((s: any) => !isExpired(s.expiresAt)).length})</Text>
{stories.map((story: any) => (
<View key={story.id} style={[styles.storyCard, isExpired(story.expiresAt) && styles.storyExpired]}>
<Image source={{ uri: story.imageUrl }} style={styles.storyThumb} />
<View style={styles.storyInfo}>
{story.caption && <Text style={styles.storyCaption} numberOfLines={1}>{story.caption}</Text>}
<Text style={styles.storyTime}>
{isExpired(story.expiresAt) ? "Закінчилось" : `Залишилось: ${timeLeft(story.expiresAt)}`}
</Text>
</View>
<TouchableOpacity onPress={() => handleRemove(story.id)}>
<Ionicons name="trash-outline" size={20} color={colors.danger} />
</TouchableOpacity>
</View>
))}
</View>
)}

<View style={{ height: 40 }} />
</ScrollView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.bg },
header: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
},
title: { fontSize: 18, fontWeight: "700", color: colors.text },
createCard: {
backgroundColor: colors.card,
borderRadius: radius.lg,
padding: spacing.lg,
marginHorizontal: spacing.md,
marginBottom: spacing.lg,
},
sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
hint: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
input: {
backgroundColor: colors.bg,
borderRadius: radius.md,
padding: spacing.md,
fontSize: 15,
color: colors.text,
borderWidth: 1,
borderColor: colors.border,
marginBottom: spacing.sm,
},
preview: {
width: "100%",
height: 200,
borderRadius: radius.md,
marginBottom: spacing.sm,
backgroundColor: colors.border,
},
pickImageBtn: {
flexDirection: "row",
alignItems: "center",
gap: spacing.sm,
marginBottom: spacing.sm,
},
pickImageText: { fontSize: 14, color: colors.text },
publishBtn: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
backgroundColor: colors.primary,
borderRadius: radius.md,
padding: spacing.md,
gap: spacing.xs,
},
publishText: { fontSize: 15, fontWeight: "700", color: colors.white },
section: { paddingHorizontal: spacing.md },
storyCard: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.card,
borderRadius: radius.md,
padding: spacing.sm,
marginBottom: spacing.sm,
borderWidth: 1,
borderColor: colors.border,
},
storyExpired: { opacity: 0.5 },
storyThumb: { width: 56, height: 56, borderRadius: radius.sm, marginRight: spacing.md },
storyInfo: { flex: 1 },
storyCaption: { fontSize: 14, fontWeight: "600", color: colors.text },
storyTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
});

// ... existing code ...