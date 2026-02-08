import { useState, useEffect } from "react";
import {
View, Text, StyleSheet, ScrollView, TouchableOpacity,
ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";

type Props = {
flowerNames: string[];
onBack: () => void;
};

type CachedTip = {
flowerName: string;
tips: string[];
wateringSchedule: string;
sunlight: string;
lifespan: string;
};

export function FlowerCareTipsScreen({ flowerNames, onBack }: Props) {
const [tips, setTips] = useState<CachedTip[]>([]);
const [loading, setLoading] = useState(true);
const [expandedFlower, setExpandedFlower] = useState<string | null>(null);

const saveTips = useMutation(api.flowerCareTips.save);

useEffect(() => {
const loadTips = async () => {
setLoading(true);
const allTips: CachedTip[] = [];

for (const name of flowerNames.slice(0, 5)) {
try {
// Try to generate tips via AI
const response = await fetch("https://api.a0.dev/ai/llm", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
messages: [
{
role: "system",
content: "You are a florist expert. Give practical flower care tips in Ukrainian. Be concise.",
},
{
role: "user",
content: `Give care tips for "${name}" flowers/bouquet. Return JSON.`,
},
],
schema: {
type: "object",
properties: {
tips: { type: "array", items: { type: "string" } },
wateringSchedule: { type: "string" },
sunlight: { type: "string" },
lifespan: { type: "string" },
},
required: ["tips", "wateringSchedule", "sunlight", "lifespan"],
},
}),
});

const data = await response.json();
if (data.schema_data) {
const tip: CachedTip = {
flowerName: name,
...data.schema_data,
};
allTips.push(tip);

// Cache in DB
try {
await saveTips({
flowerName: name,
tips: data.schema_data.tips,
wateringSchedule: data.schema_data.wateringSchedule,
sunlight: data.schema_data.sunlight,
lifespan: data.schema_data.lifespan,
});
} catch {}
}
} catch (e) {
console.log("Failed to get tips for", name, e);
}
}

setTips(allTips);
setLoading(false);
};

if (flowerNames.length > 0) {
loadTips();
} else {
setLoading(false);
}
}, [flowerNames.join(",")]);

return (
<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<TouchableOpacity onPress={onBack}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.title}>Догляд за квітами</Text>
<View style={{ width: 24 }} />
</View>

<View style={styles.hero}>
<Ionicons name="leaf" size={40} color={colors.success} />
<Text style={styles.heroTitle}>Як продовжити життя квітам</Text>
<Text style={styles.heroSubtitle}>
AI-поради для кожного букета з вашого замовлення
</Text>
</View>

{loading ? (
<View style={styles.loadingContainer}>
<ActivityIndicator size="large" color={colors.primary} />
<Text style={styles.loadingText}>Генеруємо поради...</Text>
</View>
) : tips.length === 0 ? (
<View style={styles.emptyContainer}>
<Ionicons name="leaf-outline" size={48} color={colors.muted} />
<Text style={styles.emptyText}>Немає квітів для порад</Text>
</View>
) : (
tips.map((tip) => (
<TouchableOpacity
key={tip.flowerName}
style={[styles.tipCard, shadows.card]}
onPress={() =>
setExpandedFlower(expandedFlower === tip.flowerName ? null : tip.flowerName)
}
activeOpacity={0.8}
>
<View style={styles.tipHeader}>
<View style={styles.flowerIcon}>
<Ionicons name="flower" size={24} color={colors.primary} />
</View>
<Text style={styles.flowerName}>{tip.flowerName}</Text>
<Ionicons
name={expandedFlower === tip.flowerName ? "chevron-up" : "chevron-down"}
size={20}
color={colors.muted}
/>
</View>

{/* Quick stats always visible */}
<View style={styles.quickStats}>
<View style={styles.statItem}>
<Ionicons name="water" size={16} color={colors.info} />
<Text style={styles.statText}>{tip.wateringSchedule}</Text>
</View>
<View style={styles.statItem}>
<Ionicons name="sunny" size={16} color={colors.warning} />
<Text style={styles.statText}>{tip.sunlight}</Text>
</View>
<View style={styles.statItem}>
<Ionicons name="time" size={16} color={colors.success} />
<Text style={styles.statText}>{tip.lifespan}</Text>
</View>
</View>

{/* Expanded tips */}
{expandedFlower === tip.flowerName && (
<View style={styles.tipsExpanded}>
{tip.tips.map((t, i) => (
<View key={i} style={styles.tipRow}>
<View style={styles.tipBullet}>
<Text style={styles.tipBulletText}>{i + 1}</Text>
</View>
<Text style={styles.tipText}>{t}</Text>
</View>
))}
</View>
)}
</TouchableOpacity>
))
)}

{/* General tips */}
<View style={styles.generalSection}>
<Text style={styles.sectionTitle}>Загальні поради</Text>
{[
{ icon: "water", text: "Міняйте воду кожні 2 дні", color: colors.info },
{ icon: "cut-outline", text: "Підрізайте стебла під кутом 45°", color: colors.success },
{ icon: "thermometer-outline", text: "Тримайте подалі від прямого сонця", color: colors.warning },
{ icon: "snow-outline", text: "Уникайте протягів та нагрівачів", color: colors.danger },
].map((tip, i) => (
<View key={i} style={styles.generalTip}>
<Ionicons name={tip.icon as any} size={20} color={tip.color} />
<Text style={styles.generalTipText}>{tip.text}</Text>
</View>
))}
</View>

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
hero: {
alignItems: "center",
paddingVertical: spacing.xl,
paddingHorizontal: spacing.lg,
marginHorizontal: spacing.md,
backgroundColor: colors.success + "15",
borderRadius: radius.lg,
marginBottom: spacing.lg,
},
heroTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
heroSubtitle: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.xs },
loadingContainer: { alignItems: "center", paddingVertical: spacing.xl * 2 },
loadingText: { fontSize: 14, color: colors.muted, marginTop: spacing.md },
emptyContainer: { alignItems: "center", paddingVertical: spacing.xl * 2 },
emptyText: { fontSize: 16, color: colors.muted, marginTop: spacing.md },
tipCard: {
backgroundColor: colors.card,
borderRadius: radius.lg,
padding: spacing.lg,
marginHorizontal: spacing.md,
marginBottom: spacing.md,
},
tipHeader: { flexDirection: "row", alignItems: "center" },
flowerIcon: {
width: 40,
height: 40,
borderRadius: 20,
backgroundColor: colors.primaryLight,
justifyContent: "center",
alignItems: "center",
marginRight: spacing.md,
},
flowerName: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
quickStats: {
flexDirection: "row",
marginTop: spacing.md,
gap: spacing.sm,
},
statItem: {
flex: 1,
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.bg,
padding: spacing.sm,
borderRadius: radius.sm,
gap: 4,
},
statText: { fontSize: 11, color: colors.text, flex: 1 },
tipsExpanded: { marginTop: spacing.md, gap: spacing.sm },
tipRow: { flexDirection: "row", alignItems: "flex-start" },
tipBullet: {
width: 24,
height: 24,
borderRadius: 12,
backgroundColor: colors.primary,
justifyContent: "center",
alignItems: "center",
marginRight: spacing.sm,
marginTop: 2,
},
tipBulletText: { fontSize: 12, fontWeight: "700", color: colors.white },
tipText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
generalSection: { paddingHorizontal: spacing.md, marginTop: spacing.md },
sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
generalTip: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.card,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
gap: spacing.md,
},
generalTipText: { fontSize: 14, color: colors.text },
});
