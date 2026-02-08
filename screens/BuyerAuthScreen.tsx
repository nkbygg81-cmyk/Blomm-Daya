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
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";

export function BuyerAuthScreen({
onLoggedIn,
onBack,
}: {
onLoggedIn: (token: string) => void;
onBack?: () => void;
}) {
const { t } = useTranslation();
const sendOtp = useAction(api.buyerAuth.sendOtpEmail);
const verifyOtp = useAction(api.buyerAuth.verifyOtp);

const [email, setEmail] = useState("");
const [code, setCode] = useState("");
const [message, setMessage] = useState<string | null>(null);

const [sending, setSending] = useState(false);
const [verifying, setVerifying] = useState(false);

const emailTrimmed = useMemo(() => email.trim().toLowerCase(), [email]);
const codeTrimmed = useMemo(() => code.trim(), [code]);

const handleSendOtp = async () => {
if (!emailTrimmed) {
setMessage(t("buyerAuth.enterEmail"));
return;
}

setSending(true);
setMessage(null);

try {
const result = await sendOtp({ email: emailTrimmed });
setMessage(result.message);
} catch (error) {
setMessage(t("buyerAuth.errorSendingCode"));
} finally {
setSending(false);
}
};

const handleVerifyOtp = async () => {
if (!emailTrimmed || !codeTrimmed) {
setMessage(t("buyerAuth.enterEmailAndCode"));
return;
}

setVerifying(true);
setMessage(null);

try {
const result = await verifyOtp({ email: emailTrimmed, code: codeTrimmed });
if (result.success && result.token) {
onLoggedIn(result.token);
} else {
setMessage(result.message);
}
} catch (error) {
setMessage(t("buyerAuth.errorVerifyingCode"));
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
{onBack && (
  <Pressable style={styles.backButton} onPress={onBack}>
    <Ionicons name="arrow-back" size={24} color={colors.text} />
  </Pressable>
)}
<View style={styles.content}>
<Text style={styles.title}>Blomm Daya</Text>
<Text style={styles.subtitle}>{t("buyerAuth.subtitle")}</Text>

<View style={styles.form}>
<Text style={styles.label}>Email</Text>
<TextInput
style={styles.input}
placeholder="your@email.com"
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
<Text style={styles.buttonText}>{t("buyerAuth.sendCode")}</Text>
)}
</Pressable>

<Text style={styles.label}>{t("buyerAuth.emailCode")}</Text>
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
<Text style={styles.buttonText}>{t("buyerAuth.login")}</Text>
)}
</Pressable>

{message && (
<View style={styles.messageBox}>
<Text style={styles.messageText}>{message}</Text>
</View>
)}
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
backButton: {
  padding: spacing.lg,
  paddingBottom: 0,
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
});

export default BuyerAuthScreen;