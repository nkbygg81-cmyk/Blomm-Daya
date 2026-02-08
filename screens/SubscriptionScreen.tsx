import { useState, useEffect } from "react";
import {
View, Text, StyleSheet, ScrollView, TouchableOpacity,
TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "../lib/i18n/useTranslation";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { EmptyState } from "../lib/EmptyState";

type Props = {
onBack: () => void;
};

const PLANS = [
{ id: "weekly" as const, label: "Щотижня", icon: "calendar", price: "від 299 kr/тижд." },
{ id: "biweekly" as const, label: "Раз на 2 тижні", icon: "calendar-outline", price: "від 399 kr/2 тижн." },
{ id: "monthly" as const, label: "Щомісяця", icon: "today-outline", price: "від 499 kr/міс." },
];

export function SubscriptionScreen({ onBack }: Props) {
const { t } = useTranslation();
const [authToken, setAuthToken] = useState<string | null>(null);
const [deviceId, setDeviceId] = useState<string | null>(null);
const [showForm, setShowForm] = useState(false);
const [selectedPlan, setSelectedPlan] = useState<"weekly" | "biweekly" | "monthly">("weekly");
const [preferences, setPreferences] = useState("");
const [address, setAddress] = useState("");
const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [budget, setBudget] = useState("399");
const [creating, setCreating] = useState(false);

useEffect(() => {
AsyncStorage.getItem("buyerAuthToken").then(setAuthToken);
getBuyerDeviceId().then(setDeviceId);
}, []);

const buyer = useQuery(
api.buyerAuth.getCurrentBuyer,
authToken ? { token: authToken } : "skip"
);

const subscriptions = useQuery(
api.subscriptions.listForBuyer,
buyer?.id ? { buyerId: buyer.id as any } : "skip"
);

const createSub = useMutation(api.subscriptions.create);
const updateStatus = useMutation(api.subscriptions.updateStatus);

const handleCreate = async () => {
if (!buyer?.id || !deviceId || !address || !name || !phone) {
Alert.alert("Помилка", "Заповніть всі поля");
return;
}
setCreating(true);
try {
await createSub({
buyerId: buyer.id as any,
buyerDeviceId: deviceId,
plan: selectedPlan,
flowerPreferences: preferences || undefined,
deliveryAddress: address,
recipientName: name,
recipientPhone: phone,
budget: parseInt(budget) || 399,
});
setShowForm(false);
Alert.alert("Успіх!", "Підписку створено. Очікуйте першу доставку!");
} catch (e: any) {
Alert.alert("Помилка", e.message);
} finally {
setCreating(false);
}
};

const handleToggleStatus = (subId: any, currentStatus: string) => {
const newStatus = currentStatus === "active" ? "paused" : "active";
Alert.alert(
newStatus === "paused" ? "Призупинити підписку?" : "Відновити підписку?",
"",
[
{ text: "Скасувати", style: "cancel" },
{
text: "Так",
onPress: () => updateStatus({ subscriptionId: subId, status: newStatus }),
},
]
);
};

const handleCancel = (subId: any) => {
Alert.alert("Скасувати підписку?", "Цю дію не можна відмінити", [
{ text: "Ні", style: "cancel" },
{
text: "Скасувати підписку",
style: "destructive",
onPress: () => updateStatus({ subscriptionId: subId, status: "cancelled" }),
},
]);
};

const statusColors: Record<string, string> = {
active: colors.success,
paused: colors.warning,
cancelled: colors.danger,
};

const statusLabels: Record<string, string> = {
active: "Активна",
paused: "Призупинено",
cancelled: "Скасовано",
};

const planLabels: Record<string, string> = {
weekly: "Щотижня",
biweekly: "Раз на 2 тижні",
monthly: "Щомісяця",
};

return (
<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
{/* Header */}
<View style={styles.header}>
<TouchableOpacity onPress={onBack}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.title}>Підписка на квіти</Text>
<View style={{ width: 24 }} />
</View>

{/* Hero */}
<View style={styles.hero}>
<Ionicons name="flower" size={48} color={colors.white} />
<Text style={styles.heroTitle}>Свіжі квіти регулярно</Text>
<Text style={styles.heroSubtitle}>
Обирайте план доставки — і отримуйте красиві букети автоматично
</Text>
</View>

{/* Existing subscriptions */}
{subscriptions && subscriptions.length > 0 && (
<View style={styles.section}>
<Text style={styles.sectionTitle}>Мої підписки</Text>
{subscriptions.map((sub: any) => (
<View key={sub.id} style={[styles.subCard, shadows.card]}>
<View style={styles.subHeader}>
<Text style={styles.subPlan}>{planLabels[sub.plan]}</Text>
<View style={[styles.statusBadge, { backgroundColor: statusColors[sub.status] + "20" }]}>
<Text style={[styles.statusText, { color: statusColors[sub.status] }]}>
{statusLabels[sub.status]}
</Text>
</View>
</View>
<Text style={styles.subDetail}>
<Ionicons name="location-outline" size={14} color={colors.muted} /> {sub.deliveryAddress}
</Text>
<Text style={styles.subDetail}>
<Ionicons name="cash-outline" size={14} color={colors.muted} /> {sub.budget} kr / доставка
</Text>
{sub.flowerPreferences && (
<Text style={styles.subDetail}>
<Ionicons name="heart-outline" size={14} color={colors.muted} /> {sub.flowerPreferences}
</Text>
)}
<Text style={styles.subDetail}>
<Ionicons name="calendar-outline" size={14} color={colors.muted} /> Наступна доставка: {sub.nextDeliveryDate}
</Text>
{sub.status !== "cancelled" && (
<View style={styles.subActions}>
<TouchableOpacity
style={[styles.subActionBtn, { backgroundColor: colors.warning + "20" }]}
onPress={() => handleToggleStatus(sub.id, sub.status)}
>
<Text style={[styles.subActionText, { color: colors.warning }]}>
{sub.status === "active" ? "Призупинити" : "Відновити"}
</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.subActionBtn, { backgroundColor: colors.danger + "20" }]}
onPress={() => handleCancel(sub.id)}
>
<Text style={[styles.subActionText, { color: colors.danger }]}>Скасувати</Text>
</TouchableOpacity>
</View>
)}
</View>
))}
</View>
)}

{/* Create new */}
{!showForm ? (
<TouchableOpacity style={styles.createButton} onPress={() => setShowForm(true)}>
<Ionicons name="add-circle" size={24} color={colors.white} />
<Text style={styles.createButtonText}>Створити підписку</Text>
</TouchableOpacity>
) : (
<View style={styles.form}>
<Text style={styles.sectionTitle}>Новий план</Text>

{/* Plan selection */}
{PLANS.map((plan) => (
<TouchableOpacity
key={plan.id}
style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
onPress={() => setSelectedPlan(plan.id)}
>
<Ionicons
name={plan.icon as any}
size={24}
color={selectedPlan === plan.id ? colors.white : colors.primary}
/>
<View style={styles.planInfo}>
<Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelActive]}>
{plan.label}
</Text>
<Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceActive]}>
{plan.price}
</Text>
</View>
{selectedPlan === plan.id && (
<Ionicons name="checkmark-circle" size={24} color={colors.white} />
)}
</TouchableOpacity>
))}

<TextInput
style={styles.input}
placeholder="Ім'я отримувача"
value={name}
onChangeText={setName}
placeholderTextColor={colors.muted}
/>
<TextInput
style={styles.input}
placeholder="Телефон отримувача"
value={phone}
onChangeText={setPhone}
keyboardType="phone-pad"
placeholderTextColor={colors.muted}
/>
<TextInput
style={styles.input}
placeholder="Адреса доставки"
value={address}
onChangeText={setAddress}
placeholderTextColor={colors.muted}
/>
<TextInput
style={styles.input}
placeholder="Бюджет (kr за доставку)"
value={budget}
onChangeText={setBudget}
keyboardType="numeric"
placeholderTextColor={colors.muted}
/>
<TextInput
style={[styles.input, styles.textArea]}
placeholder="Вподобання (напр.: троянди, тюльпани, яскраві кольори)"
value={preferences}
onChangeText={setPreferences}
multiline
numberOfLines={3}
placeholderTextColor={colors.muted}
/>

<TouchableOpacity
style={[styles.submitButton, creating && { opacity: 0.7 }]}
onPress={handleCreate}
disabled={creating}
>
{creating ? (
<ActivityIndicator color={colors.white} />
) : (
<Text style={styles.submitButtonText}>Оформити підписку</Text>
)}
</TouchableOpacity>

<TouchableOpacity style={styles.cancelFormBtn} onPress={() => setShowForm(false)}>
<Text style={styles.cancelFormText}>Скасувати</Text>
</TouchableOpacity>
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
hero: {
backgroundColor: colors.primary,
borderRadius: radius.lg,
padding: spacing.xl,
marginHorizontal: spacing.md,
marginBottom: spacing.lg,
alignItems: "center",
...shadows.card,
},
heroTitle: { fontSize: 22, fontWeight: "700", color: colors.white, marginTop: spacing.sm },
heroSubtitle: { fontSize: 14, color: colors.white, opacity: 0.9, textAlign: "center", marginTop: spacing.xs },
section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
subCard: {
backgroundColor: colors.card,
borderRadius: radius.lg,
padding: spacing.lg,
marginBottom: spacing.md,
},
subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
subPlan: { fontSize: 16, fontWeight: "700", color: colors.text },
statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6 },
statusText: { fontSize: 12, fontWeight: "600" },
subDetail: { fontSize: 13, color: colors.muted, marginBottom: 4, lineHeight: 20 },
subActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
subActionBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
subActionText: { fontSize: 13, fontWeight: "600" },
createButton: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
backgroundColor: colors.primary,
borderRadius: radius.lg,
padding: spacing.lg,
marginHorizontal: spacing.md,
gap: spacing.sm,
...shadows.card,
},
createButtonText: { fontSize: 16, fontWeight: "700", color: colors.white },
form: { paddingHorizontal: spacing.md },
planCard: {
flexDirection: "row",
alignItems: "center",
backgroundColor: colors.card,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
borderWidth: 2,
borderColor: colors.border,
},
planCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
planInfo: { flex: 1, marginLeft: spacing.md },
planLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
planLabelActive: { color: colors.white },
planPrice: { fontSize: 12, color: colors.muted, marginTop: 2 },
planPriceActive: { color: colors.white, opacity: 0.9 },
input: {
backgroundColor: colors.card,
borderRadius: radius.md,
padding: spacing.md,
fontSize: 15,
color: colors.text,
borderWidth: 1,
borderColor: colors.border,
marginBottom: spacing.sm,
},
textArea: { minHeight: 80, textAlignVertical: "top" },
submitButton: {
backgroundColor: colors.primary,
borderRadius: radius.md,
padding: spacing.lg,
alignItems: "center",
marginTop: spacing.sm,
},
submitButtonText: { fontSize: 16, fontWeight: "700", color: colors.white },
cancelFormBtn: { alignItems: "center", padding: spacing.md },
cancelFormText: { fontSize: 14, color: colors.muted },
});
