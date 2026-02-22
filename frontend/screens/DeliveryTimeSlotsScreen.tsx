import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";

type Props = {
  floristId?: string;
  onSlotSelected: (slot: {
    date: string;
    slotId: string;
    label: string;
    extraFee: number;
  }) => void;
  onBack?: () => void;
};

export function DeliveryTimeSlotsScreen({ floristId, onSlotSelected, onBack }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  
  // Generate next 7 days
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push({
        date: date.toISOString().split("T")[0],
        dayName: i === 0 ? t("deliverySlots.today") : i === 1 ? t("deliverySlots.tomorrow") : 
          date.toLocaleDateString("uk-UA", { weekday: "short" }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString("uk-UA", { month: "short" }),
      });
    }
    return result;
  }, [t]);

  const [selectedDate, setSelectedDate] = useState(dates[0].date);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const slots = useQuery(api.deliveryTimeSlots.getAvailableSlots, {
    floristId: floristId as any,
    date: selectedDate,
  });

  const handleSelectSlot = (slot: any) => {
    if (!slot.available) return;
    buttonPress();
    setSelectedSlot(slot.id);
  };

  const handleConfirm = () => {
    if (!selectedSlot || !slots) return;
    const slot = slots.find((s) => s.id === selectedSlot);
    if (slot) {
      buttonPress();
      onSlotSelected({
        date: selectedDate,
        slotId: slot.id,
        label: slot.label,
        extraFee: slot.extraFee,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t("deliverySlots.title")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Selection */}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {t("deliverySlots.selectDate")}
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesContainer}
        >
          {dates.map((d) => (
            <TouchableOpacity
              key={d.date}
              style={[
                styles.dateCard,
                {
                  backgroundColor: selectedDate === d.date 
                    ? themeColors.primary 
                    : themeColors.surface,
                  borderColor: selectedDate === d.date 
                    ? themeColors.primary 
                    : themeColors.border,
                },
              ]}
              onPress={() => {
                buttonPress();
                setSelectedDate(d.date);
                setSelectedSlot(null);
              }}
            >
              <Text style={[
                styles.dateDayName,
                { color: selectedDate === d.date ? themeColors.white : themeColors.muted }
              ]}>
                {d.dayName}
              </Text>
              <Text style={[
                styles.dateDayNum,
                { color: selectedDate === d.date ? themeColors.white : themeColors.text }
              ]}>
                {d.dayNum}
              </Text>
              <Text style={[
                styles.dateMonth,
                { color: selectedDate === d.date ? themeColors.white : themeColors.muted }
              ]}>
                {d.month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time Slots */}
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: spacing.lg }]}>
          {t("deliverySlots.selectTime")}
        </Text>
        
        {!slots ? (
          <ActivityIndicator size="large" color={themeColors.primary} style={styles.loader} />
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor: selectedSlot === slot.id 
                      ? themeColors.primary 
                      : slot.available 
                        ? themeColors.surface 
                        : themeColors.bg,
                    borderColor: selectedSlot === slot.id 
                      ? themeColors.primary 
                      : slot.available 
                        ? themeColors.border 
                        : themeColors.border + "50",
                    opacity: slot.available ? 1 : 0.5,
                  },
                ]}
                onPress={() => handleSelectSlot(slot)}
                disabled={!slot.available}
              >
                <Ionicons
                  name={slot.id.includes("express") ? "flash" : "time-outline"}
                  size={24}
                  color={
                    selectedSlot === slot.id 
                      ? themeColors.white 
                      : slot.available 
                        ? themeColors.primary 
                        : themeColors.muted
                  }
                />
                <Text style={[
                  styles.slotLabel,
                  {
                    color: selectedSlot === slot.id 
                      ? themeColors.white 
                      : slot.available 
                        ? themeColors.text 
                        : themeColors.muted,
                  }
                ]}>
                  {slot.label}
                </Text>
                {slot.extraFee > 0 && (
                  <Text style={[
                    styles.slotFee,
                    {
                      color: selectedSlot === slot.id 
                        ? themeColors.white 
                        : themeColors.warning,
                    }
                  ]}>
                    +{formatPrice(slot.extraFee)} kr
                  </Text>
                )}
                {!slot.available && (
                  <Text style={[styles.slotUnavailable, { color: themeColors.danger }]}>
                    {t("deliverySlots.unavailable")}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            { backgroundColor: themeColors.primary },
            !selectedSlot && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selectedSlot}
        >
          <Ionicons name="checkmark-circle" size={20} color={themeColors.white} />
          <Text style={[styles.confirmBtnText, { color: themeColors.white }]}>
            {t("common.confirm")}
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  datesContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  dateCard: {
    width: 70,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  dateDayName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  dateDayNum: {
    fontSize: 20,
    fontWeight: "700",
  },
  dateMonth: {
    fontSize: 12,
    marginTop: 2,
  },
  loader: {
    marginTop: spacing.xl,
  },
  slotsGrid: {
    gap: spacing.sm,
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  slotLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  slotFee: {
    fontSize: 13,
    fontWeight: "600",
  },
  slotUnavailable: {
    fontSize: 12,
    fontWeight: "500",
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
