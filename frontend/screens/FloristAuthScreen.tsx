import { useMemo, useState } from "react";
import {
ActivityIndicator,
Pressable,
StyleSheet,
Text,
TextInput,
View,
KeyboardAvoidingView,
Platform,
} from "react-native";
import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { registerForPushNotificationsAsync } from "../lib/notifications";
import { useTranslation } from "../lib/i18n/useTranslation";

export function FloristAuthScreen({
onLoggedIn,
onBackToBuyer,
onRegister,
}: {
onLoggedIn: (token: string, floristId: string) => void;
onBackToBuyer: () => void;
onRegister: () => void;
}) {
const { t } = useTranslation();
const sendOtp = useAction(api.floristAuth.sendOtpEmail);
const verifyOtp = useAction(api.floristAuth.verifyOtp);
const registerPushToken = useMutation(api.notifications.registerPushToken);

const [email, setEmail] = useState("");
const [code, setCode] = useState("");
const [message, setMessage] = useState<string | null>(null);

const [sending, setSending] = useState(false);
const [verifying, setVerifying] = useState(false);

const emailTrimmed = useMemo(() => email.trim().toLowerCase(), [email]);
const codeTrimmed = useMemo(() => code.trim(), [code]);

const handleSendOtp = async () => {
if (!emailTrimmed) {
setMessage(t("floristAuth.enterEmail"));
return;
}

setSending(true);
setMessage(null);

try {
const result = await sendOtp({ email: emailTrimmed });
setMessage(result.message);
} catch (error) {
setMessage(t("floristAuth.errorSendingCode"));
} finally {
setSending(false);
}
};

const handleVerifyOtp = async () => {
if (!emailTrimmed || !codeTrimmed) {
setMessage(t("floristAuth.enterEmailAndCode"));
return;
}

setVerifying(true);
setMessage(null);

try {
const result = await verifyOtp({ email: emailTrimmed, code: codeTrimmed });
if (result.success && result.token && result.floristId) {
// Register push token for florist notifications
try {
  const pushToken = await registerForPushNotificationsAsync();
  if (pushToken) {
    await registerPushToken({
      userId: result.floristId,
      userType: "florist",
      token: pushToken,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  }
} catch (e) {
  // Silent fail - not critical for login
  console.log("Failed to register push token:", e);
}

onLoggedIn(result.token, result.floristId);
} else {
setMessage(result.message);
}
} catch (error) {
setMessage(t("floristAuth.errorVerifyingCode"));
} finally {
setVerifying(false);
}
};

return (
<SafeAreaView style={styles.safe}>
<KeyboardAvoidingView
behavior={Platform.OS === "ios" ? "padding" : "height"}
style={styles.container}
>
<View style={styles.content}>
<Text style={styles.title}>🏪 Blomm Daya</Text>
<Text style={styles.subtitle}>{t("floristAuth.subtitle")}</Text>

<View style={styles.form}>
<Text style={styles.label}>Email</Text>
<TextInput
style={styles.input}
placeholder="florist@example.com"
placeholderTextColor={colors.muted}
value={email}
onChangeText={setEmail}
keyboardType="email-address"
autoCapitalize="none"
autoCorrect={false}
editable={!sending && !verifying}
/>

<Pressable
style={[styles.button, sending && styles.buttonDisabled]}
onPress={handleSendOtp}
disabled={sending || verifying}
>
{sending ? (
<ActivityIndicator color="#fff" />
) : (
<Text style={styles.buttonText}>{t("floristAuth.sendCode")}</Text>
)}
</Pressable>

<Text style={styles.label}>{t("floristAuth.emailCode")}</Text>
<TextInput
style={styles.input}
placeholder="123456"
placeholderTextColor={colors.muted}
value={code}
onChangeText={setCode}
keyboardType="number-pad"
maxLength={6}
editable={!sending && !verifying}
/>

<Pressable
style={[styles.button, verifying && styles.buttonDisabled]}
onPress={handleVerifyOtp}
disabled={sending || verifying}
>
{verifying ? (
<ActivityIndicator color="#fff" />
) : (
<Text style={styles.buttonText}>{t("floristAuth.login")}</Text>
)}
</Pressable>

{message && (
<View style={styles.messageBox}>
<Text style={styles.messageText}>{message}</Text>
</View>
)}

<View style={styles.divider}>
<View style={styles.dividerLine} />
<Text style={styles.dividerText}>{t("floristAuth.or")}</Text>
<View style={styles.dividerLine} />
</View>

<Pressable style={styles.registerButton} onPress={onRegister}>
<Ionicons name="add-circle-outline" size={20} color={colors.primary} />
<Text style={styles.registerButtonText}>{t("floristAuth.noAccountApply")}</Text>
</Pressable>

<Pressable style={styles.backButton} onPress={onBackToBuyer}>
<Text style={styles.backButtonText}>{t("floristAuth.imBuyer")}</Text>
</Pressable>
</View>
</View>
</KeyboardAvoidingView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
safe: {
flex: 1,
backgroundColor: colors.bg,
},
container: {
flex: 1,
},
content: {
flex: 1,
padding: spacing.xl,
justifyContent: "center",
},
title: {
fontSize: 32,
fontWeight: "700",
color: colors.primary,
textAlign: "center",
marginBottom: spacing.sm,
},
subtitle: {
fontSize: 16,
color: colors.muted,
textAlign: "center",
marginBottom: spacing.xl,
},
form: {
gap: spacing.md,
},
label: {
fontSize: 14,
fontWeight: "600",
color: colors.text,
marginBottom: -spacing.sm,
},
input: {
backgroundColor: "#fff",
borderWidth: 1,
borderColor: colors.border,
borderRadius: 8,
padding: spacing.md,
fontSize: 16,
color: colors.text,
},
button: {
backgroundColor: colors.primary,
padding: spacing.md,
borderRadius: 8,
alignItems: "center",
marginTop: spacing.sm,
},
buttonDisabled: {
opacity: 0.6,
},
buttonText: {
color: "#fff",
fontSize: 16,
fontWeight: "600",
},
messageBox: {
backgroundColor: "#F3F4F6",
padding: spacing.md,
borderRadius: 8,
},
messageText: {
fontSize: 14,
color: colors.text,
textAlign: "center",
},
divider: {
flexDirection: "row",
alignItems: "center",
marginVertical: spacing.md,
},
dividerLine: {
flex: 1,
height: 1,
backgroundColor: colors.border,
},
dividerText: {
marginHorizontal: spacing.md,
fontSize: 14,
color: colors.muted,
},
registerButton: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
padding: spacing.md,
borderRadius: 8,
borderWidth: 2,
borderColor: colors.primary,
backgroundColor: "#fff",
gap: spacing.sm,
},
registerButtonText: {
fontSize: 16,
fontWeight: "600",
color: colors.primary,
},
backButton: {
marginTop: spacing.lg,
padding: spacing.sm,
alignItems: "center",
},
backButtonText: {
fontSize: 14,
color: colors.primary,
fontWeight: "500",
},
});

export default FloristAuthScreen;