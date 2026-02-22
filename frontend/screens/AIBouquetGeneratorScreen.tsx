import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import { formatPrice } from "../lib/formatPrice";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { useCart } from "../lib/CartContext";

type Props = {
  onBack?: () => void;
  onFlowerPress?: (flowerId: string) => void;
};

type Suggestion = {
  name: string;
  description: string;
  estimatedPrice: number;
  flowers: string[];
  colors: string[];
  matchingProducts: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  }[];
};

export function AIBouquetGeneratorScreen({ onBack, onFlowerPress }: Props) {
  const { t, locale } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem } = useCart();
  
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [budget, setBudget] = useState("1000");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const styles_list = useQuery(api.aiBouquetGenerator.getBouquetStyles, {});
  const generateSuggestions = useMutation(api.aiBouquetGenerator.generateBouquetSuggestions);

  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || !buyerDeviceId) return;
    
    setIsGenerating(true);
    try {
      const result = await generateSuggestions({
        buyerDeviceId,
        prompt: prompt.trim(),
        style: selectedStyle || undefined,
        budget: parseInt(budget) || 1000,
      });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCart = (product: any) => {
    buttonPress();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
  };

  const getStyleName = (style: any) => {
    return (t as any)(`aiBouquet.styles.${style.id}`) || style.name;
  };

  return (
    <View style={[componentStyles.container, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={[componentStyles.header, { borderBottomColor: themeColors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={componentStyles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={[componentStyles.title, { color: themeColors.text }]}>
            {t("aiBouquet.title")}
          </Text>
          <Text style={[componentStyles.subtitle, { color: themeColors.muted }]}>
            {t("aiBouquet.subtitle")}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={componentStyles.content} showsVerticalScrollIndicator={false}>
        {/* Prompt Input */}
        <View style={componentStyles.section}>
          <View style={[componentStyles.inputContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Ionicons name="sparkles" size={20} color={themeColors.primary} />
            <TextInput
              style={[componentStyles.input, { color: themeColors.text }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder={t("aiBouquet.placeholder")}
              placeholderTextColor={themeColors.muted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Style Selection */}
        <View style={componentStyles.section}>
          <Text style={[componentStyles.sectionTitle, { color: themeColors.text }]}>
            {t("aiBouquet.selectStyle")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {styles_list?.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  componentStyles.styleCard,
                  {
                    backgroundColor: selectedStyle === style.id ? themeColors.primary : themeColors.surface,
                    borderColor: selectedStyle === style.id ? themeColors.primary : themeColors.border,
                  },
                ]}
                onPress={() => {
                  buttonPress();
                  setSelectedStyle(selectedStyle === style.id ? null : style.id);
                }}
              >
                <Text style={[
                  componentStyles.styleName,
                  { color: selectedStyle === style.id ? themeColors.white : themeColors.text }
                ]}>
                  {getStyleName(style)}
                </Text>
                <Text style={[
                  componentStyles.styleDesc,
                  { color: selectedStyle === style.id ? themeColors.white + "CC" : themeColors.muted }
                ]}>
                  {style.description}
                </Text>
                <View style={componentStyles.colorsRow}>
                  {style.colors.slice(0, 3).map((color, i) => (
                    <View
                      key={i}
                      style={[
                        componentStyles.colorDot,
                        { backgroundColor: getColorHex(color) }
                      ]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Budget */}
        <View style={componentStyles.section}>
          <Text style={[componentStyles.sectionTitle, { color: themeColors.text }]}>
            {t("aiBouquet.budget")}
          </Text>
          <View style={[componentStyles.budgetContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <TouchableOpacity
              style={componentStyles.budgetBtn}
              onPress={() => setBudget(String(Math.max(100, parseInt(budget) - 100)))}
            >
              <Ionicons name="remove" size={20} color={themeColors.primary} />
            </TouchableOpacity>
            <TextInput
              style={[componentStyles.budgetInput, { color: themeColors.text }]}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
            <Text style={[componentStyles.budgetCurrency, { color: themeColors.muted }]}>kr</Text>
            <TouchableOpacity
              style={componentStyles.budgetBtn}
              onPress={() => setBudget(String(parseInt(budget) + 100))}
            >
              <Ionicons name="add" size={20} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            componentStyles.generateBtn,
            { backgroundColor: themeColors.primary },
            (!prompt.trim() || isGenerating) && componentStyles.generateBtnDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color={themeColors.white} />
              <Text style={[componentStyles.generateBtnText, { color: themeColors.white }]}>
                {t("aiBouquet.generating")}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color={themeColors.white} />
              <Text style={[componentStyles.generateBtnText, { color: themeColors.white }]}>
                {t("aiBouquet.generate")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={componentStyles.suggestionsSection}>
            <Text style={[componentStyles.sectionTitle, { color: themeColors.text }]}>
              {t("aiBouquet.suggestions")}
            </Text>
            {suggestions.map((suggestion, index) => (
              <View
                key={index}
                style={[componentStyles.suggestionCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              >
                <Text style={[componentStyles.suggestionName, { color: themeColors.text }]}>
                  {suggestion.name}
                </Text>
                <Text style={[componentStyles.suggestionDesc, { color: themeColors.muted }]}>
                  {suggestion.description}
                </Text>
                
                {/* Flowers */}
                <View style={componentStyles.flowersRow}>
                  {suggestion.flowers.map((flower, i) => (
                    <View key={i} style={[componentStyles.flowerTag, { backgroundColor: themeColors.surface }]}>
                      <Ionicons name="flower-outline" size={12} color={themeColors.primary} />
                      <Text style={[componentStyles.flowerTagText, { color: themeColors.text }]}>{flower}</Text>
                    </View>
                  ))}
                </View>

                {/* Price */}
                <Text style={[componentStyles.suggestionPrice, { color: themeColors.primary }]}>
                  ~{formatPrice(suggestion.estimatedPrice)} kr
                </Text>

                {/* Matching Products */}
                {suggestion.matchingProducts.length > 0 && (
                  <View style={componentStyles.matchingSection}>
                    <Text style={[componentStyles.matchingTitle, { color: themeColors.muted }]}>
                      {t("aiBouquet.matchingProducts")}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {suggestion.matchingProducts.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={[componentStyles.productCard, { backgroundColor: themeColors.surface }]}
                          onPress={() => onFlowerPress?.(product.id)}
                        >
                          {product.imageUrl ? (
                            <Image source={{ uri: product.imageUrl }} style={componentStyles.productImage} />
                          ) : (
                            <View style={[componentStyles.productImagePlaceholder, { backgroundColor: themeColors.bg }]}>
                              <Ionicons name="flower-outline" size={24} color={themeColors.muted} />
                            </View>
                          )}
                          <Text style={[componentStyles.productName, { color: themeColors.text }]} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={[componentStyles.productPrice, { color: themeColors.primary }]}>
                            {formatPrice(product.price)} kr
                          </Text>
                          <TouchableOpacity
                            style={[componentStyles.productAddBtn, { backgroundColor: themeColors.primary }]}
                            onPress={() => handleAddToCart(product)}
                          >
                            <Ionicons name="add" size={16} color={themeColors.white} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* No Results */}
        {suggestions.length === 0 && !isGenerating && prompt.length > 0 && (
          <View style={componentStyles.noResults}>
            <Ionicons name="search-outline" size={48} color={themeColors.muted} />
            <Text style={[componentStyles.noResultsText, { color: themeColors.muted }]}>
              {t("aiBouquet.tryAgain")}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    red: "#E53935",
    white: "#FAFAFA",
    pink: "#EC407A",
    green: "#43A047",
    purple: "#7E57C2",
    yellow: "#FDD835",
    orange: "#FB8C00",
    blue: "#42A5F5",
    peach: "#FFAB91",
    lavender: "#B39DDB",
    burgundy: "#880E4F",
    gold: "#FFD700",
    deep_purple: "#4A148C",
  };
  return colorMap[colorName] || "#888888";
}

const componentStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  styleCard: {
    width: 140,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  styleName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  styleDesc: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  colorsRow: {
    flexDirection: "row",
    gap: 4,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  budgetContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  budgetBtn: {
    padding: spacing.sm,
  },
  budgetInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  budgetCurrency: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  suggestionsSection: {
    marginBottom: spacing.xl,
  },
  suggestionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  suggestionName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  suggestionDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  flowersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  flowerTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  flowerTagText: {
    fontSize: 12,
  },
  suggestionPrice: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  matchingSection: {
    marginTop: spacing.sm,
  },
  matchingTitle: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  productCard: {
    width: 120,
    marginRight: spacing.sm,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 80,
  },
  productImagePlaceholder: {
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontSize: 12,
    fontWeight: "500",
    padding: spacing.xs,
    paddingBottom: 0,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.xs,
  },
  productAddBtn: {
    position: "absolute",
    bottom: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
  },
  noResultsText: {
    fontSize: 14,
    marginTop: spacing.md,
  },
});
