import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../lib/i18n/useTranslation";

type Props = {
floristId: string;
onBack: () => void;
};

export function FloristProfileScreen({ floristId, onBack }: Props) {
const insets = useSafeAreaInsets();
const { t } = useTranslation();
const florist = useQuery(api.florists.getById, { floristId: floristId as any });
const updateProfile = useMutation(api.florists.updateProfile);
const toggleAvailability = useMutation(api.florists.toggleAvailability);

const [saving, setSaving] = useState(false);
const [formData, setFormData] = useState({
name: "",
businessName: "",
email: "",
phone: "",
address: "",
city: "",
country: "",
workingHours: "",
deliveryRadius: "",
minOrderAmount: "",
bio: "",
});

useEffect(() => {
if (florist) {
setFormData({
name: florist.name || "",
businessName: florist.businessName || "",
email: florist.email || "",
phone: florist.phone || "",
address: florist.address || "",
city: florist.city || "",
country: florist.country || "",
workingHours: florist.workingHours || "",
deliveryRadius: florist.deliveryRadius?.toString() || "",
minOrderAmount: florist.minOrderAmount?.toString() || "",
bio: florist.bio || "",
});
}
}, [florist]);

const handleSave = async () => {
try {
setSaving(true);

await updateProfile({
floristId: floristId as any,
name: formData.name || undefined,
businessName: formData.businessName || undefined,
email: formData.email || undefined,
phone: formData.phone || undefined,
address: formData.address || undefined,
city: formData.city || undefined,
country: formData.country || undefined,
workingHours: formData.workingHours || undefined,
deliveryRadius: formData.deliveryRadius ? parseFloat(formData.deliveryRadius) : undefined,
minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
bio: formData.bio || undefined,
});

Alert.alert(t("common.success"), t("floristProfile.profileUpdated"));
} catch (error) {
Alert.alert(t("common.error"), t("floristProfile.profileUpdateError"));
} finally {
setSaving(false);
}
};

const handleToggleAvailability = async (value: boolean) => {
try {
await toggleAvailability({
floristId: floristId as any,
available: value,
});
} catch (error) {
Alert.alert(t("common.error"), t("floristProfile.statusChangeError"));
}
};

if (!florist) {
return (
<View style={[styles.container, styles.centered]}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

return (
<View style={[styles.container, { paddingTop: insets.top }]}>
<View style={styles.header}>
<TouchableOpacity onPress={onBack} style={styles.backButton}>
<Ionicons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.title}>{t("floristProfile.editTitle")}</Text>
<View style={{ width: 40 }} />
</View>

<ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
{/* Availability Toggle */}
<View style={styles.availabilityCard}>
<View style={styles.availabilityInfo}>
<View style={[styles.statusDot, { backgroundColor: florist.available ? colors.success : colors.muted }]} />
<View>
<Text style={styles.availabilityTitle}>
{florist.available ? t("floristProfile.acceptingOrders") : t("floristProfile.notAcceptingOrders")}
</Text>
<Text style={styles.availabilitySubtitle}>
{florist.available ? t("floristProfile.visibleInCatalog") : t("floristProfile.notVisible")}
</Text>
</View>
</View>
<Switch
value={florist.available ?? false}
onValueChange={handleToggleAvailability}
trackColor={{ false: colors.muted, true: colors.success }}
thumbColor={colors.white}
/>
</View>

{/* Basic Info */}
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("floristProfile.basicInfo")}</Text>

<View style={styles.inputGroup}>
<Text style={styles.label}>{t("floristProfile.name")}</Text>
<TextInput
style={styles.input}
value={formData.name}
onChangeText={(text) => setFormData({ ...formData, name: text })}
placeholder={t("floristProfile.yourName")}
placeholderTextColor={colors.muted}
/>
</View>

<View style={styles.inputGroup}>
<Text style={styles.label}>{t("floristProfile.businessName")}</Text>
<TextInput
style={styles.input}
value={formData.businessName}
onChangeText={(text) => setFormData({ ...formData, businessName: text })}
placeholder={t("floristProfile.shopName")}
placeholderTextColor={colors.muted}
/>
</View>

<View style={styles.inputGroup}>
<Text style={styles.label}>{t("floristProfile.aboutYou")}</Text>
<TextInput
style={[styles.input, styles.textArea]}
value={formData.bio}
onChangeText={(text) => setFormData({ ...formData, bio: text })}
placeholder={t("floristProfile.aboutYouPlaceholder")}
placeholderTextColor={colors.muted}
multiline
numberOfLines={4}
/>
</View>
</View>

{/* Contact Info */}
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("floristProfile.contactInfo")}</Text>

<View style={styles.inputGroup}>
<Text style={styles.label}>Email</Text>
<TextInput
style={styles.input}
value={formData.email}
onChangeText={(text) => setFormData({ ...formData, email: text })}
placeholder="email@example.com"
placeholderTextColor={colors.muted}
keyboardType="email-address"
autoCapitalize="none"
/>
</View>

<View style={styles.inputGroup}>
<Text style={styles.label}>{t("checkout.phone")}</Text>
<TextInput
style={styles.input}
value={formData.phone}
onChangeText={(text) => setFormData({ ...formData, phone: text })}
placeholder="+380..."
placeholderTextColor={colors.muted}
keyboardType="phone-pad"
/>
</View>
</View>

{/* Location */}
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("floristProfile.addressSection")}</Text>

<View style={styles.inputGroup}>
<Text style={styles.label}>{t("floristProfile.shopAddress")}</Text>
<TextInput
style={styles.input}
value={formData.address}
onChangeText={(text) => setFormData({ ...formData, address: text })}
placeholder={t("floristProfile.streetBuilding")}
placeholderTextColor={colors.muted}
/>
</View>

<View style={styles.row}>
<View style={[styles.inputGroup, { flex: 1 }]}>
<Text style={styles.label}>{t("floristProfile.city")}</Text>
<TextInput
style={styles.input}
value={formData.city}
onChangeText={(text) => setFormData({ ...formData, city: text })}
placeholder="Київ"
placeholderTextColor={colors.muted}
/>
</View>

<View style={[styles.inputGroup, { flex: 1 }]}>
<Text style={styles.label}>{t("floristProfile.country")}</Text>
<TextInput
style={styles.input}
value={formData.country}
onChangeText={(text) => setFormData({ ...formData, country: text })}
placeholder="Ukraine"
placeholderTextColor={colors.muted}
/>
</View>
</View>
</View>

{/* Business Settings */}
<View style={styles.section}>
<Text style={styles.sectionTitle}>{t("floristProfile.deliverySettings")}</Text>

<View style={styles.inputGroup}>
<Text style={styles.label}>{t("floristProfile.workingHours")}</Text>
<TextInput
style={styles.input}
value={formData.workingHours}
onChangeText={(text) => setFormData({ ...formData, workingHours: text })}
placeholder={t("floristProfile.workingHoursPlaceholder")}
placeholderTextColor={colors.muted}
/>
</View>

<View style={styles.row}>
<View style={[styles.inputGroup, { flex: 1 }]}>
<Text style={styles.label}>{t("floristProfile.deliveryRadius")}</Text>
<TextInput
style={styles.input}
value={formData.deliveryRadius}
onChangeText={(text) => setFormData({ ...formData, deliveryRadius: text })}
placeholder="10"
placeholderTextColor={colors.muted}
keyboardType="numeric"
/>
</View>

<View style={[styles.inputGroup, { flex: 1 }]}>
<Text style={styles.label}>{t("floristProfile.minOrder")}</Text>
<TextInput
style={styles.input}
value={formData.minOrderAmount}
onChangeText={(text) => setFormData({ ...formData, minOrderAmount: text })}
placeholder="300"
placeholderTextColor={colors.muted}
keyboardType="numeric"
/>
</View>
</View>
</View>

{/* Rating Info */}
{florist.rating && (
<View style={styles.ratingCard}>
<Ionicons name="star" size={24} color={colors.warning} />
<View>
<Text style={styles.ratingValue}>{florist.rating.toFixed(1)}</Text>
<Text style={styles.ratingLabel}>{t("floristProfile.yourRating")}</Text>
</View>
</View>
)}

<TouchableOpacity
style={[styles.saveButton, saving && styles.saveButtonDisabled]}
onPress={handleSave}
disabled={saving}
>
{saving ? (
<ActivityIndicator size="small" color={colors.white} />
) : (
<>
<Ionicons name="checkmark" size={20} color={colors.white} />
<Text style={styles.saveButtonText}>{t("floristProfile.saveChanges")}</Text>
</>
)}
</TouchableOpacity>
</ScrollView>
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.bg,
},
centered: {
justifyContent: "center",
alignItems: "center",
},
header: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
borderBottomWidth: 1,
borderBottomColor: colors.border,
backgroundColor: colors.card,
},
backButton: {
padding: spacing.sm,
},
title: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
},
scrollView: {
flex: 1,
},
content: {
padding: spacing.lg,
paddingBottom: spacing.xl * 2,
},
availabilityCard: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
backgroundColor: colors.card,
padding: spacing.lg,
borderRadius: radius.lg,
marginBottom: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
availabilityInfo: {
flexDirection: "row",
alignItems: "center",
gap: spacing.md,
},
statusDot: {
width: 12,
height: 12,
borderRadius: 6,
},
availabilityTitle: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
},
availabilitySubtitle: {
fontSize: 13,
color: colors.muted,
marginTop: 2,
},
section: {
backgroundColor: colors.card,
padding: spacing.lg,
borderRadius: radius.lg,
marginBottom: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
sectionTitle: {
fontSize: 16,
fontWeight: "700",
color: colors.text,
marginBottom: spacing.md,
},
inputGroup: {
marginBottom: spacing.md,
},
label: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
marginBottom: spacing.sm,
},
input: {
backgroundColor: colors.bg,
borderWidth: 1,
borderColor: colors.border,
borderRadius: radius.md,
padding: spacing.md,
fontSize: 15,
color: colors.text,
},
textArea: {
minHeight: 100,
textAlignVertical: "top",
},
row: {
flexDirection: "row",
gap: spacing.md,
},
ratingCard: {
flexDirection: "row",
alignItems: "center",
gap: spacing.md,
backgroundColor: colors.card,
padding: spacing.lg,
borderRadius: radius.lg,
marginBottom: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
...shadows.card,
},
ratingValue: {
fontSize: 24,
fontWeight: "700",
color: colors.text,
},
ratingLabel: {
fontSize: 13,
color: colors.muted,
},
saveButton: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
gap: spacing.sm,
backgroundColor: colors.primary,
padding: spacing.lg,
borderRadius: radius.lg,
...shadows.card,
},
saveButtonDisabled: {
opacity: 0.6,
},
saveButtonText: {
fontSize: 16,
fontWeight: "600",
color: colors.white,
},
});