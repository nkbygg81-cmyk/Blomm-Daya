import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../lib/theme";
import { useState } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import Slider from "@react-native-community/slider";

export type FilterState = {
  priceMin: number;
  priceMax: number;
  categories: string[];
  occasions: string[];
  colors: string[];
  minRating: number;
  sortBy: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  maxPrice: number;
};

const OCCASIONS = [
  { id: "birthday", icon: "gift-outline", labelKey: "filters.occasions.birthday" },
  { id: "wedding", icon: "heart-outline", labelKey: "filters.occasions.wedding" },
  { id: "anniversary", icon: "wine-outline", labelKey: "filters.occasions.anniversary" },
  { id: "romantic", icon: "rose-outline", labelKey: "filters.occasions.romantic" },
  { id: "sympathy", icon: "flower-outline", labelKey: "filters.occasions.sympathy" },
  { id: "congratulations", icon: "trophy-outline", labelKey: "filters.occasions.congratulations" },
  { id: "thank_you", icon: "hand-left-outline", labelKey: "filters.occasions.thankYou" },
  { id: "new_baby", icon: "balloon-outline", labelKey: "filters.occasions.newBaby" },
];

const FLOWER_COLORS = [
  { id: "red", color: "#DC2626", labelKey: "filters.colors.red" },
  { id: "pink", color: "#EC4899", labelKey: "filters.colors.pink" },
  { id: "white", color: "#F3F4F6", labelKey: "filters.colors.white" },
  { id: "yellow", color: "#FBBF24", labelKey: "filters.colors.yellow" },
  { id: "orange", color: "#F97316", labelKey: "filters.colors.orange" },
  { id: "purple", color: "#8B5CF6", labelKey: "filters.colors.purple" },
  { id: "blue", color: "#3B82F6", labelKey: "filters.colors.blue" },
  { id: "mixed", color: "linear", labelKey: "filters.colors.mixed" },
];

const SORT_OPTIONS = [
  { id: "relevance", labelKey: "filters.sort.relevance" },
  { id: "price_asc", labelKey: "filters.sort.priceAsc" },
  { id: "price_desc", labelKey: "filters.sort.priceDesc" },
  { id: "rating", labelKey: "filters.sort.rating" },
  { id: "newest", labelKey: "filters.sort.newest" },
];

export function AdvancedFiltersModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  maxPrice,
}: Props) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const toggleOccasion = (id: string) => {
    buttonPress();
    setFilters((prev) => ({
      ...prev,
      occasions: prev.occasions.includes(id)
        ? prev.occasions.filter((o) => o !== id)
        : [...prev.occasions, id],
    }));
  };

  const toggleColor = (id: string) => {
    buttonPress();
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(id)
        ? prev.colors.filter((c) => c !== id)
        : [...prev.colors, id],
    }));
  };

  const handleReset = () => {
    buttonPress();
    setFilters({
      priceMin: 0,
      priceMax: maxPrice,
      categories: [],
      occasions: [],
      colors: [],
      minRating: 0,
      sortBy: "relevance",
    });
  };

  const handleApply = () => {
    buttonPress();
    onApply(filters);
    onClose();
  };

  const activeFiltersCount =
    (filters.priceMin > 0 ? 1 : 0) +
    (filters.priceMax < maxPrice ? 1 : 0) +
    filters.occasions.length +
    filters.colors.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.sortBy !== "relevance" ? 1 : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{t("filters.title")}</Text>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Text style={styles.resetText}>{t("filters.reset")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("filters.price.title")}</Text>
              <View style={styles.priceLabels}>
                <Text style={styles.priceValue}>{filters.priceMin} kr</Text>
                <Text style={styles.priceValue}>{filters.priceMax} kr</Text>
              </View>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>{t("filters.price.min")}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={maxPrice}
                  step={50}
                  value={filters.priceMin}
                  onValueChange={(val) =>
                    setFilters((prev) => ({ ...prev, priceMin: val }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
              </View>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>{t("filters.price.max")}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={maxPrice}
                  step={50}
                  value={filters.priceMax}
                  onValueChange={(val) =>
                    setFilters((prev) => ({ ...prev, priceMax: val }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
              </View>
            </View>

            {/* Occasions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("filters.occasions.title")}</Text>
              <View style={styles.chipsContainer}>
                {OCCASIONS.map((occasion) => {
                  const isSelected = filters.occasions.includes(occasion.id);
                  return (
                    <TouchableOpacity
                      key={occasion.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleOccasion(occasion.id)}
                    >
                      <Ionicons
                        name={occasion.icon as any}
                        size={16}
                        color={isSelected ? colors.white : colors.text}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {t(occasion.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Colors */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("filters.colors.title")}</Text>
              <View style={styles.colorsContainer}>
                {FLOWER_COLORS.map((colorItem) => {
                  const isSelected = filters.colors.includes(colorItem.id);
                  return (
                    <TouchableOpacity
                      key={colorItem.id}
                      style={[styles.colorChip, isSelected && styles.colorChipSelected]}
                      onPress={() => toggleColor(colorItem.id)}
                    >
                      {colorItem.id === "mixed" ? (
                        <View style={styles.mixedColor}>
                          <View style={[styles.mixedPart, { backgroundColor: "#DC2626" }]} />
                          <View style={[styles.mixedPart, { backgroundColor: "#FBBF24" }]} />
                          <View style={[styles.mixedPart, { backgroundColor: "#EC4899" }]} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: colorItem.color },
                            colorItem.id === "white" && styles.whiteBorder,
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.colorText,
                          isSelected && styles.colorTextSelected,
                        ]}
                      >
                        {t(colorItem.labelKey)}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("filters.rating.title")}</Text>
              <View style={styles.ratingContainer}>
                {[0, 3, 4, 4.5].map((rating) => {
                  const isSelected = filters.minRating === rating;
                  return (
                    <TouchableOpacity
                      key={rating}
                      style={[styles.ratingChip, isSelected && styles.ratingChipSelected]}
                      onPress={() => {
                        buttonPress();
                        setFilters((prev) => ({ ...prev, minRating: rating }));
                      }}
                    >
                      {rating === 0 ? (
                        <Text style={[styles.ratingText, isSelected && styles.ratingTextSelected]}>
                          {t("filters.rating.any")}
                        </Text>
                      ) : (
                        <>
                          <Ionicons
                            name="star"
                            size={14}
                            color={isSelected ? colors.white : colors.warning}
                          />
                          <Text style={[styles.ratingText, isSelected && styles.ratingTextSelected]}>
                            {rating}+
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("filters.sort.title")}</Text>
              <View style={styles.sortContainer}>
                {SORT_OPTIONS.map((option) => {
                  const isSelected = filters.sortBy === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.sortOption, isSelected && styles.sortOptionSelected]}
                      onPress={() => {
                        buttonPress();
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: option.id as FilterState["sortBy"],
                        }));
                      }}
                    >
                      <Text
                        style={[
                          styles.sortText,
                          isSelected && styles.sortTextSelected,
                        ]}
                      >
                        {t(option.labelKey)}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>
                {t("filters.apply")}{" "}
                {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  resetButton: {
    padding: spacing.xs,
  },
  resetText: {
    color: colors.primary,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  section: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  sliderContainer: {
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
  colorsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  whiteBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  mixedColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  mixedPart: {
    flex: 1,
    height: "100%",
  },
  colorText: {
    fontSize: 13,
    color: colors.text,
  },
  colorTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  ratingTextSelected: {
    color: colors.white,
  },
  sortContainer: {
    gap: spacing.xs,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  sortText: {
    fontSize: 14,
    color: colors.text,
  },
  sortTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
