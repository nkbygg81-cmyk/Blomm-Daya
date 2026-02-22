import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";

type Props = {
  onBack: () => void;
  orderId?: string;
  onCardGenerated?: (cardId: string, text: string) => void;
};

export function GreetingCardScreen({ onBack, orderId, onCardGenerated }: Props) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCardId, setGeneratedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  const occasions = useQuery(api.greetingCards.getOccasions, {});
  const generateGreeting = useMutation(api.greetingCards.generateGreeting);
  const updateGreetingText = useMutation(api.greetingCards.updateGreetingText);
  const myCards = useQuery(
    api.greetingCards.getMyGreetingCards,
    buyerDeviceId ? { buyerDeviceId, limit: 20 } : "skip"
  );

  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  const getOccasionName = (occasion: any) => {
    if (locale === "uk") return occasion.nameUk;
    if (locale === "sv") return occasion.nameSv;
    return occasion.nameEn;
  };

  const handleGenerate = async () => {
    if (!selectedOccasion || !recipientName.trim() || !buyerDeviceId) {
      Alert.alert(t("common.error"), t("greetingCards.selectOccasion"));
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateGreeting({
        buyerDeviceId,
        occasion: selectedOccasion,
        recipientName: recipientName.trim(),
        senderName: senderName.trim() || undefined,
        language: locale,
        orderId: orderId as any,
      });

      setGeneratedText(result.text);
      setGeneratedCardId(result.cardId);
      setCustomText(result.text);
      
      if (onCardGenerated) {
        onCardGenerated(result.cardId, result.text);
      }
    } catch (error) {
      console.error("Error generating greeting:", error);
      Alert.alert(t("common.error"), t("aiChat.errorMessage"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCustomText = async () => {
    if (!generatedCardId || !customText.trim()) return;
    
    try {
      await updateGreetingText({
        cardId: generatedCardId as any,
        customText: customText.trim(),
      });
      setGeneratedText(customText);
      setIsEditing(false);
      buttonPress();
    } catch (error) {
      console.error("Error saving custom text:", error);
    }
  };

  const handleRegenerate = () => {
    setGeneratedText(null);
    setCustomText("");
    setGeneratedCardId(null);
    handleGenerate();
  };

  const handleSelectPastCard = (card: any) => {
    setGeneratedText(card.customText || card.generatedText);
    setCustomText(card.customText || card.generatedText);
    setGeneratedCardId(card._id);
    setActiveTab("generate");
    
    if (onCardGenerated) {
      onCardGenerated(card._id, card.customText || card.generatedText);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t("greetingCards.title")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "generate" && styles.tabActive]}
          onPress={() => setActiveTab("generate")}
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={activeTab === "generate" ? themeColors.primary : themeColors.muted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "generate" ? themeColors.primary : themeColors.muted },
            ]}
          >
            {t("greetingCards.generateCard")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === "history" ? themeColors.primary : themeColors.muted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "history" ? themeColors.primary : themeColors.muted },
            ]}
          >
            {t("greetingCards.myCards")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "generate" ? (
          <>
            {/* Generated Card Result */}
            {generatedText && !isEditing ? (
              <View style={[styles.resultCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultLabel, { color: themeColors.muted }]}>
                    {t("greetingCards.generatedText")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editBtn}
                  >
                    <Ionicons name="pencil-outline" size={18} color={themeColors.primary} />
                    <Text style={[styles.editBtnText, { color: themeColors.primary }]}>
                      {t("greetingCards.editText")}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resultText, { color: themeColors.text }]}>
                  {generatedText}
                </Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeColors.surface }]}
                    onPress={handleRegenerate}
                  >
                    <Ionicons name="refresh-outline" size={18} color={themeColors.primary} />
                    <Text style={[styles.actionBtnText, { color: themeColors.primary }]}>
                      {t("greetingCards.regenerate")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
                    onPress={onBack}
                  >
                    <Ionicons name="checkmark" size={18} color={themeColors.white} />
                    <Text style={[styles.actionBtnText, { color: themeColors.white }]}>
                      {t("greetingCards.useThisText")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isEditing ? (
              <View style={[styles.editCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.editLabel, { color: themeColors.muted }]}>
                  {t("greetingCards.customText")}
                </Text>
                <TextInput
                  style={[styles.editInput, { color: themeColors.text, borderColor: themeColors.border }]}
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  numberOfLines={8}
                  placeholder={t("greetingCards.customText")}
                  placeholderTextColor={themeColors.muted}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeColors.surface }]}
                    onPress={() => {
                      setIsEditing(false);
                      setCustomText(generatedText || "");
                    }}
                  >
                    <Text style={[styles.actionBtnText, { color: themeColors.muted }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
                    onPress={handleSaveCustomText}
                  >
                    <Ionicons name="checkmark" size={18} color={themeColors.white} />
                    <Text style={[styles.actionBtnText, { color: themeColors.white }]}>
                      {t("common.save")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Subtitle */}
                <Text style={[styles.subtitle, { color: themeColors.muted }]}>
                  {t("greetingCards.subtitle")}
                </Text>

                {/* Occasion Selection */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    {t("greetingCards.selectOccasion")}
                  </Text>
                  <View style={styles.occasionsGrid}>
                    {occasions?.map((occasion) => (
                      <TouchableOpacity
                        key={occasion.id}
                        style={[
                          styles.occasionCard,
                          {
                            backgroundColor: selectedOccasion === occasion.id
                              ? themeColors.primary
                              : themeColors.surface,
                            borderColor: selectedOccasion === occasion.id
                              ? themeColors.primary
                              : themeColors.border,
                          },
                        ]}
                        onPress={() => {
                          buttonPress();
                          setSelectedOccasion(occasion.id);
                        }}
                      >
                        <Ionicons
                          name={occasion.icon as any}
                          size={24}
                          color={
                            selectedOccasion === occasion.id
                              ? themeColors.white
                              : themeColors.primary
                          }
                        />
                        <Text
                          style={[
                            styles.occasionText,
                            {
                              color: selectedOccasion === occasion.id
                                ? themeColors.white
                                : themeColors.text,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {getOccasionName(occasion)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Recipient Name */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    {t("greetingCards.recipientName")} *
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.surface, color: themeColors.text, borderColor: themeColors.border }]}
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder={t("greetingCards.recipientName")}
                    placeholderTextColor={themeColors.muted}
                  />
                </View>

                {/* Sender Name */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    {t("greetingCards.senderName")}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.surface, color: themeColors.text, borderColor: themeColors.border }]}
                    value={senderName}
                    onChangeText={setSenderName}
                    placeholder={t("greetingCards.senderName")}
                    placeholderTextColor={themeColors.muted}
                  />
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  style={[
                    styles.generateBtn,
                    { backgroundColor: themeColors.primary },
                    (!selectedOccasion || !recipientName.trim() || isGenerating) && styles.generateBtnDisabled,
                  ]}
                  onPress={handleGenerate}
                  disabled={!selectedOccasion || !recipientName.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <ActivityIndicator size="small" color={themeColors.white} />
                      <Text style={[styles.generateBtnText, { color: themeColors.white }]}>
                        {t("greetingCards.generating")}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color={themeColors.white} />
                      <Text style={[styles.generateBtnText, { color: themeColors.white }]}>
                        {t("greetingCards.generateCard")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          // History Tab
          <View style={styles.historyContainer}>
            {myCards && myCards.length > 0 ? (
              myCards.map((card) => (
                <TouchableOpacity
                  key={card._id}
                  style={[styles.historyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  onPress={() => handleSelectPastCard(card)}
                >
                  <View style={styles.historyCardHeader}>
                    <Text style={[styles.historyCardOccasion, { color: themeColors.primary }]}>
                      {(t as any)(`greetingCards.occasions.${card.occasion}`) || card.occasion}
                    </Text>
                    <Text style={[styles.historyCardDate, { color: themeColors.muted }]}>
                      {new Date(card.createdAt).toLocaleDateString(locale === "uk" ? "uk-UA" : locale === "sv" ? "sv-SE" : "en-US")}
                    </Text>
                  </View>
                  <Text style={[styles.historyCardRecipient, { color: themeColors.text }]}>
                    {card.recipientName}
                  </Text>
                  <Text style={[styles.historyCardText, { color: themeColors.muted }]} numberOfLines={3}>
                    {card.customText || card.generatedText}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <Ionicons name="document-text-outline" size={48} color={themeColors.muted} />
                <Text style={[styles.emptyHistoryText, { color: themeColors.muted }]}>
                  {t("greetingCards.noCards")}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  occasionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  occasionCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  occasionText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  resultActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  editCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  historyContainer: {
    gap: spacing.md,
  },
  historyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  historyCardOccasion: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  historyCardDate: {
    fontSize: 12,
  },
  historyCardRecipient: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  historyCardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyHistoryText: {
    fontSize: 16,
    marginTop: spacing.md,
  },
});
