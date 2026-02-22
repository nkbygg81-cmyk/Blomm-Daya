import { useState, useRef } from "react";
import {
StyleSheet,
Text,
View,
TextInput,
TouchableOpacity,
FlatList,
Image,
ActivityIndicator,
KeyboardAvoidingView,
Platform,
Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { useTranslation } from "../lib/i18n/useTranslation";
import { useCart } from "../lib/CartContext";
import { buttonPress, buttonPressMedium } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";

type Flower = {
id: string;
name: string;
description: string | null;
price: number;
currency: string;
imageUrl: string | null;
floristName?: string;
};

type Recommendation = {
flowerId: string;
reason: string;
flower: Flower;
};

type Props = {
onBack: () => void;
onFlowerPress: (flower: Flower) => void;
};

const QUICK_PROMPTS_KEYS = [
"ai.quickBirthday",
"ai.quickRomantic",
"ai.quickSympathy",
"ai.quickWedding",
"ai.quickThankYou",
] as const;

export function AIRecommendationScreen({ onBack, onFlowerPress }: Props) {
const { t } = useTranslation();
const { addItem } = useCart();
const insets = useSafeAreaInsets();
const flowers = useQuery(api.flowers.listPublicFlowersWithLocation, {});

const [query, setQuery] = useState("");
const [loading, setLoading] = useState(false);
const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
const [aiMessage, setAiMessage] = useState("");
const [hasSearched, setHasSearched] = useState(false);
const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

const pulseAnim = useRef(new Animated.Value(1)).current;

const startPulse = () => {
Animated.loop(
Animated.sequence([
Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
])
).start();
};

const stopPulse = () => {
pulseAnim.stopAnimation();
pulseAnim.setValue(1);
};

const handleSearch = async (searchQuery?: string) => {
const q = searchQuery || query;
if (!q.trim() || !flowers || flowers.length === 0) return;

buttonPressMedium();
setLoading(true);
setRecommendations([]);
setAiMessage("");
setHasSearched(true);
startPulse();

try {
// Prepare flower catalog for AI (limit to 50 to keep prompt manageable)
const catalog = flowers.slice(0, 50).map((f: any) => ({
id: f.id,
name: f.name,
description: f.description || "",
price: f.price,
currency: f.currency,
floristName: f.floristName || "",
}));

const response = await fetch("https://api.a0.dev/ai/llm", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
messages: [
{
role: "system",
content: `You are a professional florist consultant for Blomm Daya flower delivery app. 
The user will describe what they need (occasion, preferences, budget, etc.) and you must recommend the best flowers from our catalog.

IMPORTANT: Only recommend flowers that exist in the catalog provided. Match flower IDs exactly.
Respond in the same language as the user's message.
Be warm, helpful, and knowledgeable about flowers.`,
},
{
role: "user",
content: `Here is our flower catalog:\n${JSON.stringify(catalog)}\n\nCustomer request: "${q}"`,
},
],
schema: {
type: "object",
properties: {
message: {
type: "string",
description: "A friendly personalized message to the customer explaining your recommendations (2-3 sentences)",
},
recommendations: {
type: "array",
items: {
type: "object",
properties: {
flowerId: { type: "string", description: "The exact id from the catalog" },
reason: { type: "string", description: "Why this flower is perfect for their request (1-2 sentences)" },
},
required: ["flowerId", "reason"],
},
description: "Top 3-5 recommended flowers from the catalog",
},
},
required: ["message", "recommendations"],
},
}),
});

const data = await response.json();

if (data.schema_data) {
setAiMessage(data.schema_data.message || "");

const recs: Recommendation[] = (data.schema_data.recommendations || [])
.map((rec: any) => {
const flower = flowers.find((f: any) => f.id === rec.flowerId);
if (!flower) return null;
return { flowerId: rec.flowerId, reason: rec.reason, flower };
})
.filter(Boolean) as Recommendation[];

setRecommendations(recs);
}
} catch (error) {
console.error("AI recommendation failed:", error);
setAiMessage(t("ai.error"));
} finally {
setLoading(false);
stopPulse();
}
};

const handleAddToCart = (flower: Flower) => {
buttonPressMedium();
addItem({
id: flower.id,
name: flower.name,
price: flower.price,
imageUrl: flower.imageUrl,
});
};

const quickPrompts = QUICK_PROMPTS_KEYS.map((key) => t(key));

return (
<KeyboardAvoidingView
style={[styles.container, { paddingTop: insets.top }]}
behavior={Platform.OS === "ios" ? "padding" : undefined}
>
{/* Header */}
<View style={styles.header}>
<TouchableOpacity onPress={() => { buttonPress(); onBack(); }} style={styles.backButton}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<View style={styles.headerTitleRow}>
<Ionicons name="sparkles" size={22} color={colors.primary} />
<Text style={styles.headerTitle}>{t("ai.title")}</Text>
</View>
<View style={{ width: 40 }} />
</View>

<FlatList
data={recommendations}
keyExtractor={(item: Recommendation) => item.flowerId}
contentContainerStyle={styles.listContent}
keyboardShouldPersistTaps="handled"
ListHeaderComponent={
<View>
{/* AI Intro */}
<View style={styles.aiIntro}>
<View style={styles.aiIconContainer}>
<Ionicons name="sparkles" size={32} color={colors.white} />
</View>
<Text style={styles.aiIntroTitle}>{t("ai.subtitle")}</Text>
<Text style={styles.aiIntroText}>{t("ai.description")}</Text>
</View>

{/* Search Input */}
<View style={styles.inputContainer}>
<TextInput
style={styles.input}
placeholder={t("ai.placeholder")}
placeholderTextColor={colors.muted}
value={query}
onChangeText={setQuery}
multiline
maxLength={200}
/>
<TouchableOpacity
style={[styles.sendButton, (!query.trim() || loading) && styles.sendButtonDisabled]}
onPress={() => handleSearch()}
disabled={!query.trim() || loading}
>
{loading ? (
<ActivityIndicator size="small" color={colors.white} />
) : (
<Ionicons name="send" size={20} color={colors.white} />
)}
</TouchableOpacity>
</View>

{/* Quick Prompts */}
{!hasSearched && (
<View style={styles.quickPrompts}>
<Text style={styles.quickPromptsTitle}>{t("ai.tryAsking")}</Text>
{quickPrompts.map((prompt: string, index: number) => (
<TouchableOpacity
key={index}
style={styles.quickPromptChip}
onPress={() => {
buttonPress();
setQuery(prompt);
handleSearch(prompt);
}}
>
<Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
<Text style={styles.quickPromptText}>{prompt}</Text>
</TouchableOpacity>
))}
</View>
)}

{/* Loading State */}
{loading && (
<Animated.View style={[styles.loadingContainer, { opacity: pulseAnim }]}>
<Ionicons name="sparkles" size={28} color={colors.primary} />
<Text style={styles.loadingText}>{t("ai.thinking")}</Text>
</Animated.View>
)}

{/* AI Message */}
{aiMessage && !loading && (
<View style={styles.aiMessageContainer}>
<Ionicons name="sparkles" size={18} color={colors.primary} style={{ marginTop: 2 }} />
<Text style={styles.aiMessageText}>{aiMessage}</Text>
</View>
)}

{/* Results Header */}
{recommendations.length > 0 && (
<Text style={styles.resultsTitle}>
{t("ai.recommendations")} ({recommendations.length})
</Text>
)}

{/* No Results */}
{hasSearched && !loading && recommendations.length === 0 && aiMessage && (
<View style={styles.noResults}>
<Ionicons name="flower-outline" size={48} color={colors.muted} />
<Text style={styles.noResultsText}>{t("ai.noResults")}</Text>
</View>
)}
</View>
}
renderItem={({ item }: { item: Recommendation }) => (
<TouchableOpacity
style={styles.recCard}
onPress={() => { buttonPress(); onFlowerPress(item.flower); }}
activeOpacity={0.8}
>
{item.flower.imageUrl && !brokenImages[item.flower.id] ? (
<Image
source={{ uri: item.flower.imageUrl }}
style={styles.recImage}
resizeMode="cover"
onError={() => setBrokenImages((prev: Record<string, true>) => ({ ...prev, [item.flower.id]: true }))}
/>
) : (
<View style={[styles.recImage, styles.recImagePlaceholder]}>
<Ionicons name="flower-outline" size={36} color={colors.muted} />
</View>
)}
<View style={styles.recContent}>
<Text style={styles.recName} numberOfLines={1}>{item.flower.name}</Text>
{item.flower.floristName && (
<Text style={styles.recFlorist} numberOfLines={1}>
<Ionicons name="storefront-outline" size={11} color={colors.muted} /> {item.flower.floristName}
</Text>
)}
<View style={styles.recReasonContainer}>
<Ionicons name="sparkles" size={12} color={colors.primary} />
<Text style={styles.recReason} numberOfLines={3}>{item.reason}</Text>
</View>
<View style={styles.recFooter}>
<Text style={styles.recPrice}>
{formatPrice(item.flower.price)} {item.flower.currency}
</Text>
<TouchableOpacity
style={styles.addToCartButton}
onPress={(e: any) => {
e.stopPropagation();
handleAddToCart(item.flower);
}}
>
<Ionicons name="cart-outline" size={16} color={colors.white} />
<Text style={styles.addToCartText}>{t("common.add")}</Text>
</TouchableOpacity>
</View>
</View>
</TouchableOpacity>
)}
/>
</KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.bg,
},
header: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderBottomWidth: 1,
borderBottomColor: colors.border,
backgroundColor: colors.white,
},
backButton: {
width: 40,
height: 40,
justifyContent: "center",
alignItems: "center",
},
headerTitleRow: {
flexDirection: "row",
alignItems: "center",
gap: spacing.xs,
},
headerTitle: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
},
listContent: {
padding: spacing.md,
paddingBottom: spacing.xl * 2,
},
aiIntro: {
alignItems: "center",
paddingVertical: spacing.xl,
marginBottom: spacing.lg,
},
aiIconContainer: {
width: 64,
height: 64,
borderRadius: 32,
backgroundColor: colors.primary,
justifyContent: "center",
alignItems: "center",
marginBottom: spacing.md,
...shadows.fab,
},
aiIntroTitle: {
fontSize: 20,
fontWeight: "700",
color: colors.text,
textAlign: "center",
marginBottom: spacing.xs,
},
aiIntroText: {
fontSize: 14,
color: colors.muted,
textAlign: "center",
lineHeight: 20,
paddingHorizontal: spacing.xl,
},
inputContainer: {
flexDirection: "row",
alignItems: "flex-end",
backgroundColor: colors.white,
borderRadius: radius.lg,
borderWidth: 2,
borderColor: colors.primary,
paddingLeft: spacing.md,
paddingRight: spacing.xs,
paddingVertical: spacing.xs,
marginBottom: spacing.lg,
...shadows.card,
},
input: {
flex: 1,
fontSize: 16,
color: colors.text,
maxHeight: 100,
paddingVertical: spacing.sm,
},
sendButton: {
width: 42,
height: 42,
borderRadius: 21,
backgroundColor: colors.primary,
justifyContent: "center",
alignItems: "center",
},
sendButtonDisabled: {
backgroundColor: colors.muted,
opacity: 0.5,
},
quickPrompts: {
marginBottom: spacing.lg,
},
quickPromptsTitle: {
fontSize: 14,
fontWeight: "600",
color: colors.muted,
marginBottom: spacing.sm,
},
quickPromptChip: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.white,
borderRadius: radius.md,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm + 2,
marginBottom: spacing.sm,
borderWidth: 1,
borderColor: colors.primaryLight,
gap: spacing.sm,
},
quickPromptText: {
fontSize: 14,
color: colors.text,
flex: 1,
},
loadingContainer: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
paddingVertical: spacing.xl,
gap: spacing.sm,
},
loadingText: {
fontSize: 16,
fontWeight: "500",
color: colors.primary,
},
aiMessageContainer: {
flexDirection: "row",
backgroundColor: colors.primaryLight,
borderRadius: radius.lg,
padding: spacing.md,
marginBottom: spacing.lg,
gap: spacing.sm,
},
aiMessageText: {
flex: 1,
fontSize: 15,
color: colors.text,
lineHeight: 22,
},
resultsTitle: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
marginBottom: spacing.md,
},
noResults: {
alignItems: "center",
paddingVertical: spacing.xl,
},
noResultsText: {
fontSize: 15,
color: colors.muted,
marginTop: spacing.sm,
},
recCard: {
flexDirection: "row",
backgroundColor: colors.white,
borderRadius: radius.lg,
marginBottom: spacing.md,
overflow: "hidden",
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
recImage: {
width: 110,
height: 140,
backgroundColor: colors.bg,
},
recImagePlaceholder: {
justifyContent: "center",
alignItems: "center",
},
recContent: {
flex: 1,
padding: spacing.sm,
justifyContent: "space-between",
},
recName: {
fontSize: 15,
fontWeight: "700",
color: colors.text,
},
recFlorist: {
fontSize: 11,
color: colors.muted,
marginTop: 2,
},
recReasonContainer: {
flexDirection: "row",
gap: 4,
marginTop: spacing.xs,
},
recReason: {
flex: 1,
fontSize: 12,
color: colors.text,
lineHeight: 17,
opacity: 0.8,
},
recFooter: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
marginTop: spacing.xs,
},
recPrice: {
fontSize: 16,
fontWeight: "700",
color: colors.primary,
},
addToCartButton: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.primary,
borderRadius: radius.sm,
paddingHorizontal: spacing.sm,
paddingVertical: spacing.xs,
gap: 4,
},
addToCartText: {
fontSize: 12,
fontWeight: "600",
color: colors.white,
},
});