import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { buttonPress } from "../lib/haptics";

type Props = {
  onBack: () => void;
};

const AMOUNT_OPTIONS = [200, 500, 1000, 2000, 5000];

export function GiftCertificatesScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"buy" | "my" | "redeem">("buy");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Buy form state
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [checkedCertificate, setCheckedCertificate] = useState<any>(null);
  
  useEffect(() => {
    getBuyerDeviceId().then(setDeviceId);
  }, []);

  const myCertificates = useQuery(
    api.giftCertificates.listMyGiftCertificates,
    deviceId ? { buyerDeviceId: deviceId } : "skip"
  );

  const certificateInfo = useQuery(
    api.giftCertificates.checkCode,
    redeemCode.length >= 4 ? { code: redeemCode } : "skip"
  );

  const createCertificate = useMutation(api.giftCertificates.create);

  const handleAmountSelect = (amount: number) => {
    buttonPress();
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, "");
    setCustomAmount(num);
    if (num) {
      setSelectedAmount(parseInt(num, 10) || 0);
    }
  };

  const handleBuy = async () => {
    if (!deviceId) return;
    
    const finalAmount = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    
    if (finalAmount < 100 || finalAmount > 10000) {
      Alert.alert(t("giftCertificates.error"), t("giftCertificates.amountError"));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createCertificate({
        amount: finalAmount,
        purchasedByDeviceId: deviceId,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
        message: message || undefined,
      });

      Alert.alert(
        t("giftCertificates.success"),
        t("giftCertificates.successMessage", { code: result.code }),
        [
          {
            text: t("giftCertificates.share"),
            onPress: () => handleShare(result.code, finalAmount),
          },
          { text: t("common.ok") },
        ]
      );

      // Reset form
      setRecipientName("");
      setRecipientEmail("");
      setMessage("");
      setCustomAmount("");
      setSelectedAmount(500);
      setTab("my");
    } catch (error: any) {
      Alert.alert(t("giftCertificates.error"), error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async (code: string, amount: number) => {
    try {
      await Share.share({
        message: t("giftCertificates.shareMessage", { code, amount: String(amount) }),
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return colors.success;
      case "fully_redeemed": return colors.muted;
      case "expired": return colors.danger;
      default: return colors.muted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("giftCertificates.title")}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "buy" && styles.tabActive]}
          onPress={() => setTab("buy")}
        >
          <Text style={[styles.tabText, tab === "buy" && styles.tabTextActive]}>
            {t("giftCertificates.buy")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "my" && styles.tabActive]}
          onPress={() => setTab("my")}
        >
          <Text style={[styles.tabText, tab === "my" && styles.tabTextActive]}>
            {t("giftCertificates.myCertificates")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "redeem" && styles.tabActive]}
          onPress={() => setTab("redeem")}
        >
          <Text style={[styles.tabText, tab === "redeem" && styles.tabTextActive]}>
            {t("giftCertificates.check")}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Buy Tab */}
          {tab === "buy" && (
            <View style={styles.buyContainer}>
              <View style={styles.giftIcon}>
                <Ionicons name="gift" size={48} color={colors.primary} />
              </View>
              
              <Text style={styles.sectionTitle}>{t("giftCertificates.selectAmount")}</Text>
              
              <View style={styles.amountGrid}>
                {AMOUNT_OPTIONS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountButton,
                      selectedAmount === amount && !customAmount && styles.amountButtonActive,
                    ]}
                    onPress={() => handleAmountSelect(amount)}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        selectedAmount === amount && !customAmount && styles.amountTextActive,
                      ]}
                    >
                      {amount} kr
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.orText}>{t("giftCertificates.or")}</Text>

              <TextInput
                style={styles.input}
                placeholder={t("giftCertificates.customAmount")}
                placeholderTextColor={colors.muted}
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
              />

              <Text style={styles.sectionTitle}>{t("giftCertificates.recipientInfo")}</Text>

              <TextInput
                style={styles.input}
                placeholder={t("giftCertificates.recipientName")}
                placeholderTextColor={colors.muted}
                value={recipientName}
                onChangeText={setRecipientName}
              />

              <TextInput
                style={styles.input}
                placeholder={t("giftCertificates.recipientEmail")}
                placeholderTextColor={colors.muted}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder={t("giftCertificates.personalMessage")}
                placeholderTextColor={colors.muted}
                value={message}
                onChangeText={setMessage}
                multiline
              />

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t("giftCertificates.summary")}</Text>
                <Text style={styles.summaryAmount}>
                  {customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount} kr
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.buyButton, isCreating && styles.buyButtonDisabled]}
                onPress={handleBuy}
                disabled={isCreating}
              >
                <Ionicons name="gift" size={20} color="#fff" />
                <Text style={styles.buyButtonText}>
                  {isCreating ? t("common.loading") : t("giftCertificates.buyNow")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* My Certificates Tab */}
          {tab === "my" && (
            <View style={styles.listContainer}>
              {!myCertificates || myCertificates.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="gift-outline" size={64} color={colors.muted} />
                  <Text style={styles.emptyTitle}>{t("giftCertificates.noCertificates")}</Text>
                  <Text style={styles.emptySubtitle}>{t("giftCertificates.noCertificatesHint")}</Text>
                </View>
              ) : (
                myCertificates.map((cert) => (
                  <View key={cert.id} style={styles.certificateCard}>
                    <View style={styles.certificateHeader}>
                      <Text style={styles.certificateCode}>{cert.code}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cert.status) + "20" }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(cert.status) }]}>
                          {t(`giftCertificates.status.${cert.status}`)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.certificateBody}>
                      <View style={styles.amountRow}>
                        <Text style={styles.remainingAmount}>{cert.remainingAmount} kr</Text>
                        <Text style={styles.initialAmount}>/ {cert.initialAmount} kr</Text>
                      </View>
                      
                      {cert.recipientName && (
                        <Text style={styles.recipientText}>
                          <Ionicons name="person-outline" size={14} color={colors.muted} /> {cert.recipientName}
                        </Text>
                      )}
                      
                      <Text style={styles.dateText}>
                        {t("giftCertificates.created")}: {formatDate(cert.createdAt)}
                      </Text>
                      
                      {cert.expiresAt && (
                        <Text style={styles.dateText}>
                          {t("giftCertificates.expires")}: {formatDate(cert.expiresAt)}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => handleShare(cert.code, cert.remainingAmount)}
                    >
                      <Ionicons name="share-outline" size={18} color={colors.primary} />
                      <Text style={styles.shareButtonText}>{t("giftCertificates.share")}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Redeem/Check Tab */}
          {tab === "redeem" && (
            <View style={styles.redeemContainer}>
              <View style={styles.giftIcon}>
                <Ionicons name="barcode-outline" size={48} color={colors.primary} />
              </View>

              <Text style={styles.sectionTitle}>{t("giftCertificates.enterCode")}</Text>

              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="GIFT-XXXXXXXX"
                placeholderTextColor={colors.muted}
                value={redeemCode}
                onChangeText={(text) => setRedeemCode(text.toUpperCase())}
                autoCapitalize="characters"
              />

              {certificateInfo && (
                <View style={[
                  styles.certificateInfoCard,
                  certificateInfo.isValid ? styles.validCard : styles.invalidCard
                ]}>
                  <View style={styles.infoRow}>
                    <Ionicons 
                      name={certificateInfo.isValid ? "checkmark-circle" : "close-circle"} 
                      size={24} 
                      color={certificateInfo.isValid ? colors.success : colors.danger} 
                    />
                    <Text style={styles.infoTitle}>
                      {certificateInfo.isValid 
                        ? t("giftCertificates.validCertificate")
                        : t("giftCertificates.invalidCertificate")
                      }
                    </Text>
                  </View>

                  {certificateInfo.message && (
                    <Text style={styles.infoMessage}>{certificateInfo.message}</Text>
                  )}

                  <View style={styles.balanceDisplay}>
                    <Text style={styles.balanceLabel}>{t("giftCertificates.balance")}</Text>
                    <Text style={styles.balanceValue}>{certificateInfo.remainingAmount} kr</Text>
                  </View>

                  <View style={styles.initialDisplay}>
                    <Text style={styles.initialLabel}>{t("giftCertificates.initialValue")}</Text>
                    <Text style={styles.initialValue}>{certificateInfo.initialAmount} kr</Text>
                  </View>
                </View>
              )}

              {redeemCode.length >= 4 && !certificateInfo && (
                <View style={styles.notFoundCard}>
                  <Ionicons name="help-circle-outline" size={32} color={colors.muted} />
                  <Text style={styles.notFoundText}>{t("giftCertificates.notFound")}</Text>
                </View>
              )}

              <Text style={styles.hintText}>{t("giftCertificates.redeemHint")}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  placeholder: {
    width: 36,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  tabTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  buyContainer: {
    gap: spacing.md,
  },
  giftIcon: {
    alignSelf: "center",
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: 50,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  amountButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: "30%",
    alignItems: "center",
  },
  amountButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amountText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  amountTextActive: {
    color: "#fff",
  },
  orText: {
    textAlign: "center",
    color: colors.muted,
    marginVertical: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 2,
  },
  summaryCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.text,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  listContainer: {
    gap: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  certificateCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certificateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  certificateCode: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  certificateBody: {
    gap: spacing.xs,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  remainingAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  initialAmount: {
    fontSize: 16,
    color: colors.muted,
  },
  recipientText: {
    fontSize: 14,
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  redeemContainer: {
    gap: spacing.md,
  },
  certificateInfoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 2,
    marginTop: spacing.md,
  },
  validCard: {
    borderColor: colors.success,
  },
  invalidCard: {
    borderColor: colors.danger,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  infoMessage: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  balanceDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.success,
  },
  initialDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  initialLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  initialValue: {
    fontSize: 16,
    color: colors.text,
  },
  notFoundCard: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notFoundText: {
    fontSize: 14,
    color: colors.muted,
  },
  hintText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
