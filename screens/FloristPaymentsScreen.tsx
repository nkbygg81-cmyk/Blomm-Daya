import {
StyleSheet,
Text,
View,
ScrollView,
TouchableOpacity,
Alert,
ActivityIndicator,
Linking,
} from "react-native";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";

type Props = {
floristId: string;
};

export function FloristPaymentsScreen({ floristId }: Props) {
const { t } = useTranslation();
const [connecting, setConnecting] = useState(false);

// Query payment status
const paymentStatus = useQuery(api.stripeConnectMutations.getFloristPaymentStatus, {
floristId: floristId as any,
});

// Action to get account status
const getAccountStatus = useAction(api.stripeConnect.getConnectAccountStatus);

// Action to create connect account link
const createConnectLink = useAction(api.stripeConnect.createConnectAccountLink);

const handleConnectStripe = async () => {
  try {
    setConnecting(true);
    const result = await createConnectLink({ floristId: floristId as any });

    if (!result?.success) {
      const message =
        typeof result?.message === "string" && result.message.length
          ? result.message
          : t("floristPayments.failedCreateLink");

      const buttons: { text: string; onPress?: () => void; style?: any }[] = [];
      if (typeof result?.dashboardUrl === "string" && result.dashboardUrl.length) {
        buttons.push({
          text: t("floristPayments.openDashboard"),
          onPress: () => {
            void Linking.openURL(result.dashboardUrl!);
          },
        });
      }
      buttons.push({ text: "OK", style: "cancel" });

      Alert.alert("Stripe", message, buttons);
      return;
    }

    Alert.alert(
      "Stripe Connect",
      t("floristPayments.connectLinkCreated"),
      [
        {
          text: t("floristPayments.openInBrowser"),
          onPress: async () => {
            const can = await Linking.canOpenURL(result.url!);
            if (can) {
              await Linking.openURL(result.url!);
            } else {
              Alert.alert(t("common.error"), t("floristPayments.couldNotOpenLink"));
            }
          },
        },
        {
          text: t("floristPayments.copyLink"),
          onPress: () => {
            void Clipboard.setStringAsync(result.url!);
            Alert.alert(t("common.success"), t("floristPayments.linkCopied"));
          },
        },
        {
          text: t("floristPayments.close"),
          style: "cancel",
        },
      ]
    );
  } catch (error) {
    Alert.alert(
      t("common.error"),
      error instanceof Error ? error.message : t("floristPayments.failedCreateLink")
    );
  } finally {
    setConnecting(false);
  }
};

const handleCheckStatus = async () => {
try {
setConnecting(true);
const status = await getAccountStatus({ floristId: floristId as any });

const statusText = status.connected
? `${t("floristPayments.status")} ${
status.chargesEnabled && status.payoutsEnabled
? t("floristPayments.accountActive")
: status.detailsSubmitted
? t("floristPayments.onVerification")
: t("floristPayments.notFilled")
}`
: t("floristPayments.notConnected");

Alert.alert(t("floristPayments.stripeConnectStatus"), statusText);
} catch (error) {
Alert.alert(
t("common.error"),
error instanceof Error ? error.message : t("floristPayments.couldNotGetStatus")
);
} finally {
setConnecting(false);
}
};

if (!paymentStatus) {
return (
<View style={styles.container}>
<ActivityIndicator size="large" color={colors.primary} />
</View>
);
}

return (
<ScrollView style={styles.container} contentContainerStyle={styles.content}>
<Text style={styles.title}>{t("floristPayments.title")}</Text>

{/* Status Card */}
<View
style={[
styles.statusCard,
{
borderColor: paymentStatus.hasStripeAccount
? colors.success
: colors.warning,
},
]}
>
<View style={styles.statusHeader}>
<Ionicons
name={paymentStatus.hasStripeAccount ? "checkmark-circle" : "warning"}
size={32}
color={
paymentStatus.hasStripeAccount ? colors.success : colors.warning
}
/>
<View style={styles.statusText}>
<Text style={styles.statusTitle}>Stripe Connect</Text>
<Text style={styles.statusSubtitle}>
{paymentStatus.hasStripeAccount
? paymentStatus.accountStatus === "verified"
? t("floristPayments.accountActive")
: t("floristPayments.onVerification")
: t("floristPayments.notConnected")}
</Text>
</View>
</View>

{!paymentStatus.hasStripeAccount && (
<TouchableOpacity
style={[styles.button, styles.primaryButton]}
onPress={handleConnectStripe}
disabled={connecting}
>
{connecting ? (
<ActivityIndicator size="small" color="#fff" />
) : (
<>
<Ionicons name="link" size={20} color="#fff" />
<Text style={styles.buttonText}>
{t("floristPayments.connectStripe")}
</Text>
</>
)}
</TouchableOpacity>
)}

{paymentStatus.hasStripeAccount && (
<TouchableOpacity
style={[styles.button, styles.secondaryButton]}
onPress={handleCheckStatus}
disabled={connecting}
>
{connecting ? (
<ActivityIndicator size="small" color={colors.primary} />
) : (
<>
<Ionicons name="refresh" size={20} color={colors.primary} />
<Text style={[styles.buttonText, { color: colors.primary }]}>
{t("floristPayments.checkStatus")}
</Text>
</>
)}
</TouchableOpacity>
)}
</View>

{/* Info Section */}
<View style={styles.infoSection}>
<Text style={styles.sectionTitle}>{t("floristPayments.howItWorks")}</Text>

<View style={styles.infoItem}>
<View style={styles.numberBadge}>
<Text style={styles.numberBadgeText}>1</Text>
</View>
<View style={styles.infoContent}>
<Text style={styles.infoTitle}>{t("floristPayments.step1Title")}</Text>
<Text style={styles.infoText}>
{t("floristPayments.step1Text")}
</Text>
</View>
</View>

<View style={styles.infoItem}>
<View style={styles.numberBadge}>
<Text style={styles.numberBadgeText}>2</Text>
</View>
<View style={styles.infoContent}>
<Text style={styles.infoTitle}>{t("floristPayments.step2Title")}</Text>
<Text style={styles.infoText}>
{t("floristPayments.step2Text")}
</Text>
</View>
</View>

<View style={styles.infoItem}>
<View style={styles.numberBadge}>
<Text style={styles.numberBadgeText}>3</Text>
</View>
<View style={styles.infoContent}>
<Text style={styles.infoTitle}>{t("floristPayments.step3Title")}</Text>
<Text style={styles.infoText}>
{t("floristPayments.step3Text")}
</Text>
</View>
</View>
</View>

{/* Commission Info */}
<View style={styles.commissionSection}>
<Text style={styles.sectionTitle}>{t("floristPayments.payoutStructure")}</Text>

<View style={styles.commissionGrid}>
<View style={styles.commissionCard}>
<Text style={styles.commissionLabel}>{t("floristPayments.platformCommission")}</Text>
<Text style={styles.commissionValue}>15%</Text>
</View>

<View style={styles.commissionCard}>
<Text style={styles.commissionLabel}>{t("floristPayments.yourEarnings")}</Text>
<Text style={[styles.commissionValue, { color: colors.success }]}>
85%
</Text>
</View>
</View>

<View style={styles.exampleBox}>
<Text style={styles.exampleTitle}>{t("floristPayments.example")}</Text>
<View style={styles.exampleRow}>
<Text style={styles.exampleLabel}>{t("floristPayments.orderFor")}</Text>
<Text style={styles.exampleValue}>1000 kr</Text>
</View>
<View style={styles.divider} />
<View style={styles.exampleRow}>
<Text style={styles.exampleLabel}>{t("floristPayments.commission15")}</Text>
<Text style={[styles.exampleValue, { color: colors.danger }]}>
-150 kr
</Text>
</View>
<View style={styles.exampleRow}>
<Text style={styles.exampleLabel}>{t("floristPayments.youReceive")}</Text>
<Text style={[styles.exampleValue, { color: colors.success }]}>
+850 kr
</Text>
</View>
</View>
</View>

{/* Account Info */}
{paymentStatus.hasStripeAccount && (
<View style={styles.accountSection}>
<Text style={styles.sectionTitle}>{t("floristPayments.accountInfo")}</Text>
<View style={styles.accountInfo}>
<View style={styles.infoRow}>
<Text style={styles.infoLabel}>{t("floristPayments.stripeConnectId")}</Text>
<Text
style={styles.infoValue}
selectable
numberOfLines={1}
>
{paymentStatus.stripeConnectAccountId}
</Text>
</View>
<View style={styles.infoRow}>
<Text style={styles.infoLabel}>{t("floristPayments.status")}</Text>
<Text
style={[
styles.infoValue,
{
color:
paymentStatus.accountStatus === "verified"
? colors.success
: colors.warning,
},
]}
>
{paymentStatus.accountStatus === "verified"
? t("floristPayments.statusActive")
: paymentStatus.accountStatus === "pending"
? t("floristPayments.statusPending")
: t("floristPayments.statusUnknown")}
</Text>
</View>
</View>
</View>
)}
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
statusCard: {
backgroundColor: colors.card,
borderRadius: 12,
borderWidth: 2,
padding: spacing.lg,
marginBottom: spacing.lg,
gap: spacing.md,
},
statusHeader: {
flexDirection: "row",
gap: spacing.md,
alignItems: "flex-start",
},
statusText: {
flex: 1,
gap: spacing.xs,
},
statusTitle: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
},
statusSubtitle: {
fontSize: 14,
color: colors.muted,
},
button: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
padding: spacing.md,
borderRadius: 8,
gap: spacing.sm,
},
primaryButton: {
backgroundColor: colors.primary,
},
secondaryButton: {
backgroundColor: colors.primaryLight,
},
buttonText: {
color: "#fff",
fontSize: 16,
fontWeight: "600",
},
sectionTitle: {
fontSize: 18,
fontWeight: "700",
color: colors.text,
marginBottom: spacing.md,
},
infoSection: {
backgroundColor: colors.card,
borderRadius: 12,
padding: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
marginBottom: spacing.lg,
},
infoItem: {
flexDirection: "row",
gap: spacing.md,
marginBottom: spacing.lg,
},
numberBadge: {
width: 40,
height: 40,
borderRadius: 20,
backgroundColor: colors.primary,
alignItems: "center",
justifyContent: "center",
},
numberBadgeText: {
color: "#fff",
fontSize: 18,
fontWeight: "700",
},
infoContent: {
flex: 1,
gap: spacing.xs,
},
infoTitle: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
},
infoText: {
fontSize: 14,
color: colors.muted,
lineHeight: 20,
},
commissionSection: {
backgroundColor: colors.card,
borderRadius: 12,
padding: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
marginBottom: spacing.lg,
},
commissionGrid: {
flexDirection: "row",
gap: spacing.md,
marginBottom: spacing.lg,
},
commissionCard: {
flex: 1,
backgroundColor: colors.bg,
borderRadius: 8,
padding: spacing.md,
alignItems: "center",
gap: spacing.sm,
},
commissionLabel: {
fontSize: 14,
color: colors.muted,
},
commissionValue: {
fontSize: 24,
fontWeight: "700",
color: colors.primary,
},
exampleBox: {
backgroundColor: colors.bg,
borderRadius: 8,
padding: spacing.md,
gap: spacing.sm,
},
exampleTitle: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
marginBottom: spacing.sm,
},
exampleRow: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
paddingVertical: spacing.xs,
},
exampleLabel: {
fontSize: 14,
color: colors.muted,
},
exampleValue: {
fontSize: 16,
fontWeight: "600",
color: colors.text,
},
divider: {
height: 1,
backgroundColor: colors.border,
marginVertical: spacing.sm,
},
accountSection: {
backgroundColor: colors.card,
borderRadius: 12,
padding: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
marginBottom: spacing.lg,
},
accountInfo: {
gap: spacing.md,
},
infoRow: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
paddingVertical: spacing.md,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
infoLabel: {
fontSize: 14,
color: colors.muted,
},
infoValue: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
flex: 1,
textAlign: "right",
marginLeft: spacing.md,
},
});