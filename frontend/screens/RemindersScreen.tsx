import { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Image,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

import { colors, spacing, radius, shadows } from "../lib/theme";
import { api } from "../convex/_generated/api";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { buttonPress, buttonPressHeavy } from "../lib/haptics";
import { useCart } from "../lib/CartContext";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../lib/i18n/useTranslation";

type ReminderType = "birthday" | "anniversary" | "valentines" | "other";

const typeLabels: Record<ReminderType, string> = {
  birthday: "🎂 День народження",
  anniversary: "💍 Річниця",
  valentines: "💝 День закоханих",
  other: "🌸 Інше",
};

const typeOccasions: Record<ReminderType, string> = {
  birthday: "день народження",
  anniversary: "річниця",
  valentines: "День Святого Валентина",
  other: "особлива подія",
};

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raw = (dateStr ?? "").trim();

  // Accept: YYYY-MM-DD (optionally with trailing chars) OR legacy YYYYMMDD
  let y: number | undefined;
  let m: number | undefined;
  let d: number | undefined;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    y = Number(isoMatch[1]);
    m = Number(isoMatch[2]);
    d = Number(isoMatch[3]);
  } else if (/^\d{8}$/.test(raw)) {
    y = Number(raw.slice(0, 4));
    m = Number(raw.slice(4, 6));
    d = Number(raw.slice(6, 8));
  }

  if (!y || !m || !d) return 9999;

  const target = new Date(today.getFullYear(), m - 1, d);
  if (target < today) target.setFullYear(target.getFullYear() + 1);

  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

export function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { addItem } = useCart();
  const { t } = useTranslation();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [didClaim, setDidClaim] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);

  // Form state
  const [personName, setPersonName] = useState("");
  const [date, setDate] = useState("");
  const [selectedType, setSelectedType] = useState<ReminderType>("birthday");
  const [daysBefore, setDaysBefore] = useState("3");
  const [note, setNote] = useState("");

  useEffect(() => {
    getBuyerDeviceId().then(setDeviceId);
    AsyncStorage.getItem("buyerAuthToken").then(setAuthToken);
  }, []);

  const buyer = useQuery(
    api.buyerAuth.getCurrentBuyer,
    authToken ? { token: authToken } : "skip"
  );

  const remindersDeviceIds = useMemo(() => {
    const ids: string[] = [];
    if (deviceId) ids.push(deviceId);

    // Legacy fallback: some older builds used Android build id as the "device id".
    const legacyBuildId = typeof Device.osBuildId === "string" ? Device.osBuildId : "";
    if (legacyBuildId.trim()) ids.push(legacyBuildId.trim());

    return Array.from(new Set(ids));
  }, [deviceId]);

  const remindersArgs = useMemo(() => {
    if (remindersDeviceIds.length === 0) return null;
    if (buyer?.id) return { buyerId: buyer.id, deviceIds: remindersDeviceIds };
    return { deviceIds: remindersDeviceIds };
  }, [buyer?.id, remindersDeviceIds]);

  const reminders = useQuery(
    api.reminders.listRemindersForBuyer,
    remindersArgs ?? "skip"
  );

  const claimRemindersToBuyer = useMutation(api.reminders.claimRemindersToBuyer);

  useEffect(() => {
    if (didClaim) return;
    if (!buyer?.id) return;
    if (remindersDeviceIds.length === 0) return;

    setDidClaim(true);
    void claimRemindersToBuyer({ buyerId: buyer.id, deviceIds: remindersDeviceIds });
  }, [buyer?.id, claimRemindersToBuyer, didClaim, remindersDeviceIds]);

  const upcomingReminders = useMemo(() => {
    if (!reminders) return [] as any[];

    return reminders
      .filter((r: any) => r.enabled)
      .map((r: any) => ({ ...r, _daysLeft: getDaysUntil(r.date) }))
      .sort((a: any, b: any) => a._daysLeft - b._daysLeft)
      .slice(0, 3);
  }, [reminders]);

  const addReminder = useMutation(api.reminders.addReminder);
  const deleteReminder = useMutation(api.reminders.deleteReminder);
  const toggleReminder = useMutation(api.reminders.toggleReminder);

  // Get flowers for recommendations
  const flowers = useQuery(api.flowers.listPublicFlowers, { limit: 20 });

  // Get recommended flowers based on occasion type
  const getRecommendedFlowers = (type: ReminderType) => {
    if (!flowers) return [];
    // Simple recommendation: return first 4 flowers
    // In production, this could be AI-powered based on occasion
    return flowers.slice(0, 4);
  };

  const handleAddToCart = (flower: any) => {
    buttonPressHeavy();
    addItem({
      id: flower.id,
      name: flower.name,
      price: flower.price,
      imageUrl: flower.imageUrl,
    });
    Alert.alert(t("remindersScreen.addedToCart"), t("remindersScreen.addedToCartMessage", { name: flower.name }), [
      { text: t("remindersScreen.continue"), style: "cancel" },
      { 
        text: t("remindersScreen.toCart"), 
        onPress: () => navigation.navigate("Cart") 
      },
    ]);
  };

  const handleQuickOrder = (reminder: any) => {
    buttonPress();
    setSelectedReminder(reminder);
  };

  const handleCloseRecommendations = () => {
    setSelectedReminder(null);
  };

  async function scheduleNotification(r: {
    personName: string;
    date: string;
    type: ReminderType;
    daysBefore: number;
  }) {
    const days = getDaysUntil(r.date) - r.daysBefore;
    if (days < 0) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeLabels[r.type]} - ${r.personName}`,
        body: t("remindersScreen.notifInDays", { days: r.daysBefore }),
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: days * 86400 },
    });
  }

  const handleSubmit = async () => {
    if (!deviceId || !personName.trim() || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert(t("common.error"), t("remindersScreen.formError"));
      return;
    }
    buttonPressHeavy();
    try {
      await addReminder({
        deviceId,
        buyerId: buyer?.id,
        personName: personName.trim(),
        date,
        type: selectedType,
        daysBefore: parseInt(daysBefore) || 3,
        note: note.trim() || undefined,
      });
      await scheduleNotification({
        personName: personName.trim(),
        date,
        type: selectedType,
        daysBefore: parseInt(daysBefore) || 3,
      });
      setShowForm(false);
      setPersonName("");
      setDate("");
      setNote("");
      setSelectedType("birthday");
      setDaysBefore("3");
    } catch (e) {
      Alert.alert(t("common.error"), t("remindersScreen.addError"));
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t("remindersScreen.deleteTitle"), t("remindersScreen.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          buttonPressHeavy();
          deleteReminder({ reminderId: id as any });
        },
      },
    ]);
  };

  const renderFlowerCard = (flower: any, isSmall = false) => (
    <TouchableOpacity
      key={flower.id}
      style={[styles.flowerCard, isSmall && styles.flowerCardSmall]}
      onPress={() => handleAddToCart(flower)}
    >
      <Image
        source={{ uri: flower.imageUrl || "https://api.a0.dev/assets/image?text=Bouquet&aspect=1:1" }}
        style={[styles.flowerImage, isSmall && styles.flowerImageSmall]}
      />
      <Text style={styles.flowerName} numberOfLines={1}>{flower.name}</Text>
      <Text style={styles.flowerPrice}>{flower.price} kr</Text>
      <View style={styles.addToCartButton}>
        <Ionicons name="cart-outline" size={14} color={colors.white} />
        <Text style={styles.addToCartText}>{t("remindersScreen.add")}</Text>
      </View>
    </TouchableOpacity>
  );

  // Recommendations modal for selected reminder
  const renderRecommendationsModal = () => {
    if (!selectedReminder) return null;
    const recommended = getRecommendedFlowers(selectedReminder.type);
    
    return (
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t("remindersScreen.bouquetsFor", { name: selectedReminder.personName })}
            </Text>
            <TouchableOpacity onPress={handleCloseRecommendations}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            {t("remindersScreen.recommendedFor", { occasion: typeOccasions[selectedReminder.type as ReminderType] })}
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendationsScroll}
          >
            {recommended.map((flower: any) => renderFlowerCard(flower))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.browseAllButton}
            onPress={() => {
              handleCloseRecommendations();
              navigation.navigate("Shop");
            }}
          >
            <Text style={styles.browseAllText}>{t("remindersScreen.browseAll")}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Upcoming events section with recommendations */}
        {upcomingReminders.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionTitle}>{t("remindersScreen.upcomingEvents")}</Text>
            {upcomingReminders.map((r: any) => {
              const daysLeft = r._daysLeft;
              const recommended = getRecommendedFlowers(r.type);
              return (
                <View key={r._id} style={styles.upcomingCard}>
                  <View style={styles.upcomingHeader}>
                    <View>
                      <Text style={styles.upcomingName}>{r.personName}</Text>
                      <Text style={styles.upcomingType}>{typeLabels[r.type as ReminderType]}</Text>
                    </View>
                    <View style={styles.daysLeftBadge}>
                      <Text style={styles.daysLeftNumber}>{daysLeft}</Text>
                      <Text style={styles.daysLeftLabel}>{t("remindersScreen.days")}</Text>
                    </View>
                  </View>
                  
                  {recommended.length > 0 && (
                    <>
                      <Text style={styles.recommendTitle}>{t("remindersScreen.recommendedBouquets")}</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.miniFlowersScroll}
                      >
                        {recommended.slice(0, 3).map((flower: any) => renderFlowerCard(flower, true))}
                        <TouchableOpacity
                          style={styles.moreButton}
                          onPress={() => handleQuickOrder(r)}
                        >
                          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                          <Text style={styles.moreButtonText}>{t("remindersScreen.more")}</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Add form section */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t("remindersScreen.newReminder")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("remindersScreen.namePlaceholder")}
              value={personName}
              onChangeText={setPersonName}
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              placeholder={t("remindersScreen.datePlaceholder")}
              value={date}
              onChangeText={setDate}
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              placeholder={t("remindersScreen.notePlaceholder")}
              value={note}
              onChangeText={setNote}
              placeholderTextColor={colors.muted}
            />
            <View style={styles.typeSelector}>
              {(Object.keys(typeLabels) as ReminderType[]).map((tp) => (
                <TouchableOpacity
                  key={tp}
                  style={[
                    styles.typeChip,
                    selectedType === tp && styles.typeChipActive,
                  ]}
                  onPress={() => {
                    buttonPress();
                    setSelectedType(tp);
                  }}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selectedType === tp && styles.typeChipTextActive,
                    ]}
                  >
                    {typeLabels[tp]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.daysRow}>
              <Text style={styles.daysLabel}>{t("remindersScreen.remindBefore")}</Text>
              <TextInput
                style={styles.daysInput}
                value={daysBefore}
                onChangeText={setDaysBefore}
                keyboardType="numeric"
              />
              <Text style={styles.daysLabel}>{t("remindersScreen.daysBefore")}</Text>
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  buttonPress();
                  setShowForm(false);
                }}
              >
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>{t("remindersScreen.add")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* All reminders list */}
        <Text style={styles.sectionTitle}>{t("remindersScreen.allReminders")}</Text>
        {reminders?.map((r: any) => {
          const daysLeft = getDaysUntil(r.date);
          return (
            <View key={r._id} style={styles.reminderCard}>
              <View style={styles.reminderMain}>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderName}>{r.personName}</Text>
                  <Text style={styles.reminderType}>
                    {typeLabels[r.type as ReminderType]}
                  </Text>
                  <Text style={styles.reminderDate}>
                    {r.date} • {t("remindersScreen.inDays", { days: daysLeft })}
                  </Text>
                  {r.note && <Text style={styles.reminderNote}>📝 {r.note}</Text>}
                </View>
                <View style={styles.reminderActions}>
                  <Switch
                    value={r.enabled}
                    onValueChange={() => {
                      buttonPress();
                      toggleReminder({ reminderId: r._id });
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => handleQuickOrder(r)}
                  >
                    <Ionicons name="gift-outline" size={16} color={colors.white} />
                    <Text style={styles.orderButtonText}>{t("remindersScreen.order")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(r._id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {(deviceId && reminders && reminders.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>{t("remindersScreen.noRemindersYet")}</Text>
            <Text style={styles.emptySubtext}>
              {t("remindersScreen.noRemindersSubtext")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add button */}
      {!showForm && (
        <TouchableOpacity
          style={[styles.addButton, { bottom: insets.bottom + spacing.lg }]}
          onPress={() => {
            buttonPress();
            setShowForm(true);
          }}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Recommendations modal */}
      {renderRecommendationsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  
  // Section styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  
  // Upcoming section
  upcomingSection: {
    marginBottom: spacing.md,
  },
  upcomingCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.card,
  },
  upcomingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  upcomingName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  upcomingType: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  daysLeftBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
    minWidth: 50,
  },
  daysLeftNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.white,
  },
  daysLeftLabel: {
    fontSize: 10,
    color: colors.white,
    opacity: 0.9,
  },
  recommendTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  miniFlowersScroll: {
    gap: spacing.sm,
  },
  
  // Flower cards
  flowerCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center",
    width: 110,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flowerCardSmall: {
    width: 90,
    padding: spacing.xs,
  },
  flowerImage: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  flowerImageSmall: {
    width: 60,
    height: 60,
  },
  flowerName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: 2,
  },
  flowerPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    gap: 4,
  },
  addToCartText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.white,
  },
  moreButton: {
    width: 70,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    minHeight: 100,
  },
  moreButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },

  // Reminder cards
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  reminderMain: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reminderInfo: { flex: 1 },
  reminderName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  reminderType: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  reminderDate: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  reminderNote: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
    fontStyle: "italic",
  },
  reminderActions: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  orderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    gap: 4,
  },
  orderButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },

  // Form styles
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.text,
  },
  typeChipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  daysLabel: {
    fontSize: 14,
    color: colors.text,
  },
  daysInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    width: 60,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  formButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  // Add button
  addButton: {
    position: "absolute",
    right: spacing.lg,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },

  // Modal styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  recommendationsScroll: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  browseAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  browseAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
});