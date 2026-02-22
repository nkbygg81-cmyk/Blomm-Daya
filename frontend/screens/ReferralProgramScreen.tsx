import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
  Clipboard,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";

type Props = {
  buyerId: string;
  onBack?: () => void;
};

export function ReferralProgramScreen({ buyerId, onBack }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [copying, setCopying] = useState(false);

  // Get referral data for this buyer
  const referralData = useQuery(api.referrals.getMyReferralData, {
    buyerId: buyerId as any,
  });

  // Get referral settings
  const settings = useQuery(api.admin.getReferralSettings, {});

  // Generate referral code if needed
  const generateCode = useMutation(api.referrals.generateReferralCode);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleGenerateCode = async () => {
    buttonPress();
    try {
      await generateCode({ buyerId: buyerId as any });
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    }
  };

  const handleCopyCode = () => {
    buttonPress();
    if (referralData?.referralCode) {
      Clipboard.setString(referralData.referralCode);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  const handleShareCode = async () => {
    buttonPress();
    if (!referralData?.referralCode) return;

    const shareMessage = t("referral.shareMessage", {
      code: referralData.referralCode,
      bonus: settings?.referrerBonus || 50,
    });

    try {
      await Share.share({
        message: shareMessage,
        title: t("referral.shareTitle"),
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  if (!referralData || !settings) {
    return (
      <View style={[styles.loading, { backgroundColor: themeColors.bg }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const totalEarned = referralData.completedReferrals * (settings.referrerBonus || 50);
  const pendingBonus = referralData.pendingReferrals * (settings.referrerBonus || 50);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[themeColors.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: themeColors.text }]}>{t("referral.title")}</Text>
      </View>

      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: themeColors.primary }]}>
        <Ionicons name="gift" size={48} color={themeColors.white} />
        <Text style={styles.heroTitle}>{t("referral.heroTitle")}</Text>
        <Text style={styles.heroSubtitle}>
          {t("referral.heroSubtitle", { bonus: settings.referrerBonus || 50 })}
        </Text>
      </View>

      {/* Referral Code Section */}
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t("referral.yourCode")}</Text>
        
        {referralData.referralCode ? (
          <>
            <View style={[styles.codeBox, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <Text style={[styles.codeText, { color: themeColors.primary }]}>
                {referralData.referralCode}
              </Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                <Ionicons 
                  name={copying ? "checkmark" : "copy-outline"} 
                  size={20} 
                  color={copying ? themeColors.success : themeColors.primary} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.shareButtons}>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: themeColors.primary }]}
                onPress={handleShareCode}
                data-testid="share-referral-button"
              >
                <Ionicons name="share-social" size={20} color={themeColors.white} />
                <Text style={styles.shareButtonText}>{t("referral.share")}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: themeColors.primary }]}
            onPress={handleGenerateCode}
            data-testid="generate-code-button"
          >
            <Ionicons name="add-circle" size={20} color={themeColors.white} />
            <Text style={styles.generateButtonText}>{t("referral.generateCode")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t("referral.stats")}</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="people" size={24} color={themeColors.info} />
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {referralData.totalReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>
              {t("referral.totalReferrals")}
            </Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="checkmark-circle" size={24} color={themeColors.success} />
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {referralData.completedReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>
              {t("referral.completed")}
            </Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="time" size={24} color={themeColors.warning} />
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {referralData.pendingReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>
              {t("referral.pending")}
            </Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="cash" size={24} color={themeColors.primary} />
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {formatPrice(totalEarned)} kr
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>
              {t("referral.earned")}
            </Text>
          </View>
        </View>

        {pendingBonus > 0 && (
          <View style={[styles.pendingBonusBox, { backgroundColor: themeColors.warning + "20", borderColor: themeColors.warning }]}>
            <Ionicons name="hourglass" size={20} color={themeColors.warning} />
            <Text style={[styles.pendingBonusText, { color: themeColors.text }]}>
              {t("referral.pendingBonus", { amount: formatPrice(pendingBonus) })}
            </Text>
          </View>
        )}
      </View>

      {/* How it works */}
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t("referral.howItWorks")}</Text>
        
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.text }]}>
                {t("referral.step1Title")}
              </Text>
              <Text style={[styles.stepDescription, { color: themeColors.muted }]}>
                {t("referral.step1Desc")}
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.text }]}>
                {t("referral.step2Title")}
              </Text>
              <Text style={[styles.stepDescription, { color: themeColors.muted }]}>
                {t("referral.step2Desc")}
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: themeColors.text }]}>
                {t("referral.step3Title")}
              </Text>
              <Text style={[styles.stepDescription, { color: themeColors.muted }]}>
                {t("referral.step3Desc", { 
                  referrerBonus: settings.referrerBonus || 50,
                  referredBonus: settings.referredBonus || 25 
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Referral History */}
      {referralData.referrals && referralData.referrals.length > 0 && (
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t("referral.history")}</Text>
          
          {referralData.referrals.map((ref: any, index: number) => (
            <View
              key={index}
              style={[
                styles.referralItem,
                { borderBottomColor: themeColors.border },
                index === referralData.referrals.length - 1 && styles.referralItemLast,
              ]}
            >
              <View style={[styles.referralAvatar, { backgroundColor: themeColors.surface }]}>
                <Ionicons name="person" size={20} color={themeColors.muted} />
              </View>
              <View style={styles.referralInfo}>
                <Text style={[styles.referralName, { color: themeColors.text }]}>
                  {ref.referredName || t("referral.anonymous")}
                </Text>
                <Text style={[styles.referralDate, { color: themeColors.muted }]}>
                  {new Date(ref.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.referralStatus,
                { backgroundColor: ref.status === "completed" ? themeColors.success + "20" : themeColors.warning + "20" }
              ]}>
                <Text style={[
                  styles.referralStatusText,
                  { color: ref.status === "completed" ? themeColors.success : themeColors.warning }
                ]}>
                  {ref.status === "completed" ? t("referral.statusCompleted") : t("referral.statusPending")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: spacing.md,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },
  copyButton: {
    padding: spacing.xs,
  },
  shareButtons: {
    marginTop: spacing.md,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
  pendingBonusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  pendingBonusText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  stepsContainer: {
    gap: spacing.sm,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginLeft: 15,
  },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  referralItemLast: {
    borderBottomWidth: 0,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 14,
    fontWeight: "600",
  },
  referralDate: {
    fontSize: 12,
  },
  referralStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  referralStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
