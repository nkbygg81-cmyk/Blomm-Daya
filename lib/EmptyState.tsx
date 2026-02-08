import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "./theme";

type Props = {
icon: keyof typeof Ionicons.glyphMap;
title: string;
subtitle?: string;
actionLabel?: string;
onAction?: () => void;
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
return (
<View style={styles.container}>
<View style={styles.iconCircle}>
<Ionicons name={icon} size={48} color={colors.primary} />
</View>
<Text style={styles.title}>{title}</Text>
{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
{actionLabel && onAction ? (
<TouchableOpacity style={styles.actionButton} onPress={onAction}>
<Text style={styles.actionText}>{actionLabel}</Text>
</TouchableOpacity>
) : null}
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
alignItems: "center",
justifyContent: "center",
paddingVertical: spacing.xl * 3,
paddingHorizontal: spacing.xl,
},
iconCircle: {
width: 96,
height: 96,
borderRadius: 48,
backgroundColor: `${colors.primary}10`,
alignItems: "center",
justifyContent: "center",
marginBottom: spacing.lg,
},
title: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
textAlign: "center",
marginBottom: spacing.sm,
},
subtitle: {
fontSize: 14,
color: colors.muted,
textAlign: "center",
lineHeight: 20,
paddingHorizontal: spacing.lg,
},
actionButton: {
marginTop: spacing.xl,
backgroundColor: colors.primary,
paddingHorizontal: spacing.xl,
paddingVertical: spacing.md,
borderRadius: 12,
},
actionText: {
color: "#fff",
fontSize: 15,
fontWeight: "600",
},
});
