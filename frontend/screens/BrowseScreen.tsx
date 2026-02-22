import { FlatList, StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Dimensions, Image, Modal } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../lib/CartContext";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "../lib/i18n/useTranslation";
import * as Location from "expo-location";
import { buttonPress, buttonPressMedium } from "../lib/haptics";
import { FloristStoriesBar } from "./FloristStoriesScreen";
import { formatPrice } from "../lib/formatPrice";
import { AdvancedFiltersModal, FilterState } from "./AdvancedFiltersModal";
import { useFeatureFlags } from "../lib/useFeatureFlags";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";

type PublicFlower = {
  id: string;
  name: string;
  nameUk?: string;
  nameSv?: string;
  description: string | null;
  descriptionUk?: string | null;
  descriptionSv?: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  floristId?: string;
  floristName?: string;
  floristCity?: string;
  floristCountry?: string;
  floristLat?: number;
  floristLon?: number;
};

type Props = {
  onFlowerPress: (flower: PublicFlower) => void;
  onAIPress?: () => void;
};

// Normalize country names to match database values
const normalizeCountry = (country: string): string => {
  const normalized: Record<string, string> = {
    // Swedish
    "Sverige": "Sweden",
    "Ukraina": "Ukraine",
    // ISO codes
    "SE": "Sweden",
    "UA": "Ukraine",
    "PL": "Poland",
    "DE": "Germany",
    "FR": "France",
    "ES": "Spain",
    "IT": "Italy",
  };
  return normalized[country] || country;
};

const formatCountryLabel = (country: string): string => {
  const map: Record<string, string> = {
    UA: "Ukraine",
    SE: "Sweden",
    NO: "Norway",
    DK: "Denmark",
    FI: "Finland",
    PL: "Poland",
  };
  return map[country] ?? country;
};

const parseCityKey = (key: string) => {
  const [city, country] = key.split("|");
  return {
    city: city ?? "",
    country: country ?? "",
  };
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
    Math.cos((lat1 * Math.PI) / 180) * 
      Math.cos((lat2 * Math.PI) / 180) * 
      Math.sin(dLon / 2) * 
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  birthday: ["birthday", "bday", "день народ", "з днем народ", "urodzin"],
  wedding: ["wedding", "bride", "весіл", "нареч", "slub", "ślub"],
  sympathy: ["sympathy", "condol", "funeral", "rip", "співчут", "похорон"],
  anniversary: ["anniversary", "річниц", "årsdag"],
  romantic: ["romantic", "love", "valentine", "кохан", "серц"],
};

const matchesCategory = (flower: PublicFlower, categoryId: string): boolean => {
  const keywords = CATEGORY_KEYWORDS[categoryId];
  if (!keywords || keywords.length === 0) return true;

  const haystack = `${flower.name} ${flower.description ?? ""}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
};

export function BrowseScreen({ onFlowerPress, onAIPress }: Props) {
  const { t, locale } = useTranslation();
  const { addItem } = useCart();
  const featureFlags = useFeatureFlags();
  const [viewMode, setViewMode] = useState<"catalog" | "florist">("catalog");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [filterMode, setFilterMode] = useState<"nearMe" | "byLocation">("nearMe");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 5000,
    categories: [],
    occasions: [],
    colors: [],
    minRating: 0,
    sortBy: "relevance",
  });

  // Wishlist state
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  
  const toggleWishlist = useMutation(api.wishlist.toggleWishlist);
  const wishlistData = useQuery(
    api.wishlist.getWishlist,
    buyerDeviceId ? { buyerDeviceId } : "skip"
  );

  // Initialize buyer device ID and wishlist
  useEffect(() => {
    getBuyerDeviceId().then(setBuyerDeviceId);
  }, []);

  // Sync wishlist IDs
  useEffect(() => {
    if (wishlistData) {
      setWishlistIds(new Set(wishlistData.map(item => item.flowerId)));
    }
  }, [wishlistData]);

  const handleToggleWishlist = useCallback(async (flower: PublicFlower) => {
    if (!buyerDeviceId) return;
    buttonPress();
    try {
      await toggleWishlist({
        buyerDeviceId,
        flowerId: flower.id,
        flowerName: flower.name,
        flowerPrice: flower.price,
        flowerImage: flower.imageUrl || undefined,
        floristName: flower.floristName,
      });
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  }, [buyerDeviceId, toggleWishlist]);

  const flowers = useQuery(api.flowers.listPublicFlowersWithLocation, {});
  const florists = useQuery(api.florists.listByCountry, {
    country: selectedCountry || "Ukraine",
  });
  const gifts = useQuery(api.gifts.listAvailable, {});

  // Get user location and try to detect nearby florists
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({ lat: location.coords.latitude, lon: location.coords.longitude });
        }
      } catch (error) {
        console.log("Location detection failed:", error);
      }
    })();
  }, []);

  // Fetch categories from database
  const dbCategories = useQuery(api.categories.getActiveCategories, { type: "occasion" });

  const countries = useMemo(() => {
    if (!flowers) return [];
    const uniqueCountries = new Set(
      flowers
        .map((f: PublicFlower) => f.floristCountry)
        .filter((c: string | undefined): c is string => c != null)
    );
    return Array.from(uniqueCountries).sort();
  }, [flowers]);

  const cities = useMemo(() => {
    if (!flowers || !selectedCountry) return [];
    const uniqueCities = new Set(
      flowers
        .filter((f: PublicFlower) => f.floristCountry === selectedCountry)
        .map((f: PublicFlower) => f.floristCity)
        .filter((c: string | undefined): c is string => c != null)
    );
    return Array.from(uniqueCities).sort();
  }, [flowers, selectedCountry]);

  // Use categories from DB or fallback to hardcoded
  const categories = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.map((cat: any) => ({
        id: cat.name.toLowerCase().replace(/\s+/g, "_"),
        label: locale === "uk" ? cat.nameUk : locale === "sv" ? (cat.nameSv || cat.name) : cat.name,
        icon: cat.icon || "flower-outline",
        color: cat.color,
      }));
    }
    // Fallback to hardcoded categories
    return [
      { id: "birthday", label: t("categories.birthday"), icon: "gift-outline" },
      { id: "wedding", label: t("categories.wedding"), icon: "heart-outline" },
      { id: "sympathy", label: t("categories.sympathy"), icon: "flower-outline" },
      { id: "anniversary", label: t("categories.anniversary"), icon: "wine-outline" },
      { id: "romantic", label: t("categories.romantic"), icon: "rose-outline" },
    ];
  }, [dbCategories, locale, t]);

  const filteredFlowers = useMemo(() => {
    if (!flowers) return [];
    // Вибір правильного поля залежно від мови
    const getLocalized = (flower: PublicFlower) => {
      let name = flower.name;
      let description = flower.description;
      if (locale === "uk" && flower.nameUk) name = flower.nameUk;
      if (locale === "sv" && flower.nameSv) name = flower.nameSv;
      if (locale === "uk" && flower.descriptionUk) description = flower.descriptionUk;
      if (locale === "sv" && flower.descriptionSv) description = flower.descriptionSv;
      return { ...flower, name, description };
    };
    let results = flowers.map(getLocalized).filter((flower: PublicFlower) => {
      const matchesSearch = searchQuery
        ? flower.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          flower.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesMode = viewMode === "catalog" ? true : flower.floristId != null;
      
      // Apply price filter
      const matchesPrice = flower.price >= advancedFilters.priceMin && flower.price <= advancedFilters.priceMax;
      
      // Apply rating filter (if available)
      const matchesRating = advancedFilters.minRating === 0 || true; // We don't have rating on flowers yet
      
      return matchesSearch && matchesMode && matchesPrice && matchesRating;
    });
    
    // Apply location filtering
    if (filterMode === "nearMe" && userLocation) {
      results = results
        .map((flower: PublicFlower) => ({
          ...flower,
          distance: flower.floristLat && flower.floristLon 
            ? calculateDistance(userLocation.lat, userLocation.lon, flower.floristLat, flower.floristLon)
            : 999999,
        }))
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 50)
        .map(({ distance, ...flower }: any) => flower);
    } else if (filterMode === "byLocation") {
      const matchesCountry = selectedCountry ? (flower: PublicFlower) => flower.floristCountry === selectedCountry : () => true;
      const matchesCity = selectedCity ? (flower: PublicFlower) => flower.floristCity === selectedCity : () => true;
      results = results.filter((flower: PublicFlower) => matchesCountry(flower) && matchesCity(flower));
    }
    
    // Apply category/occasion filtering (from advanced filters or categories)
    const activeOccasions = advancedFilters.occasions.length > 0 ? advancedFilters.occasions : (selectedCategory ? [selectedCategory] : []);
    if (activeOccasions.length > 0) {
      results = results.filter((flower: PublicFlower) => 
        activeOccasions.some(occasion => matchesCategory(flower, occasion))
      );
    }
    
    // Apply color filtering (basic keyword matching)
    if (advancedFilters.colors.length > 0) {
      const colorKeywords: Record<string, string[]> = {
        red: ["red", "червон", "röd"],
        pink: ["pink", "рожев", "rosa"],
        white: ["white", "біл", "vit"],
        yellow: ["yellow", "жовт", "gul"],
        orange: ["orange", "помаранч", "orange"],
        purple: ["purple", "violet", "фіолетов", "lila"],
        blue: ["blue", "синій", "блакит", "blå"],
        mixed: ["mixed", "мікс", "mix", "assorted", "різнокольор"],
      };
      results = results.filter((flower: PublicFlower) => {
        const haystack = `${flower.name} ${flower.description ?? ""}`.toLowerCase();
        return advancedFilters.colors.some(color => {
          const keywords = colorKeywords[color] || [];
          return keywords.some(kw => haystack.includes(kw));
        });
      });
    }
    
    // Apply sorting
    switch (advancedFilters.sortBy) {
      case "price_asc":
        results = [...results].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        results = [...results].sort((a, b) => b.price - a.price);
        break;
      case "newest":
        // Assuming newer items have higher IDs or we sort by some timestamp if available
        results = [...results].reverse();
        break;
      case "rating":
        // We don't have ratings on flowers yet, so keep original order
        break;
      default:
        // relevance - keep original order
        break;
    }
    
    return results;
  }, [flowers, searchQuery, selectedCountry, selectedCity, viewMode, filterMode, userLocation, selectedCategory, locale, advancedFilters]);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.priceMin > 0) count++;
    if (advancedFilters.priceMax < 5000) count++;
    count += advancedFilters.occasions.length;
    count += advancedFilters.colors.length;
    if (advancedFilters.minRating > 0) count++;
    if (advancedFilters.sortBy !== "relevance") count++;
    return count;
  }, [advancedFilters]);

  // Get max price for slider
  const maxPrice = useMemo(() => {
    if (!flowers || flowers.length === 0) return 5000;
    return Math.max(...flowers.map((f: any) => f.price), 1000);
  }, [flowers]);

  const handleAddToCart = useCallback(
    (flower: PublicFlower) => {
      buttonPressMedium();
      addItem({
        id: flower.id,
        name: flower.name,
        price: flower.price,
        imageUrl: flower.imageUrl,
      });
    },
    [addItem]
  );

  if (!flowers) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredFlowers}
        keyExtractor={(item: PublicFlower) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>{t("browse.hero.title")}</Text>
              <Text style={styles.heroSubtitle}>{t("browse.hero.subtitle")}</Text>
              {onAIPress && (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={() => {
                    buttonPress();
                    onAIPress();
                  }}
                >
                  <Ionicons name="sparkles" size={18} color={colors.primary} />
                  <Text style={styles.aiButtonText}>{t("ai.buttonLabel")}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Florist Stories */}
            <FloristStoriesBar />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.muted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t("browse.search.placeholder")}
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
              {/* Advanced Filters Button */}
              {featureFlags.advancedFilters && (
                <TouchableOpacity 
                  style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
                  onPress={() => {
                    buttonPress();
                    setShowAdvancedFilters(true);
                  }}
                  data-testid="advanced-filters-button"
                >
                  <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? colors.white : colors.primary} />
                  {activeFiltersCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Filter: Near Me */}
            {userLocation && (
              <TouchableOpacity
                style={[styles.nearMeButton, filterMode === "nearMe" && styles.nearMeButtonActive]}
                onPress={() => {
                  buttonPress();
                  setFilterMode("nearMe");
                }}
              >
                <Ionicons 
                  name="location" 
                  size={18} 
                  color={filterMode === "nearMe" ? colors.white : colors.primary} 
                />
                <Text style={[styles.nearMeButtonText, filterMode === "nearMe" && styles.nearMeButtonTextActive]}>
                  {t("browse.filters.nearMe")}
                </Text>
              </TouchableOpacity>
            )}

            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map((category: { id: string; label: string; icon: string }) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    buttonPress();
                    const nextCategory = selectedCategory === category.id ? null : category.id;
                    setSelectedCategory(nextCategory);
                  }}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={selectedCategory === category.id ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Featured Florists */}
            {florists && florists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("browse.florists.title")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.floristsContent}
                >
                  {florists.slice(0, 10).map((florist: any) => (
                    <TouchableOpacity 
                      key={florist._id} 
                      style={styles.floristCard}
                      onPress={buttonPress}
                    >
                      <View style={styles.floristAvatar}>
                        <Ionicons name="flower" size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.floristName} numberOfLines={1}>
                        {florist.businessName || florist.name}
                      </Text>
                      <View style={styles.floristRating}>
                        <Ionicons name="star" size={12} color={colors.warning} />
                        <Text style={styles.floristRatingText}>
                          {florist.rating?.toFixed(1) || "—"}
                        </Text>
                      </View>
                      <Text style={styles.floristCity} numberOfLines={1}>
                        {florist.city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Mode Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeButton, viewMode === "catalog" && styles.modeButtonActive]}
                onPress={() => {
                  buttonPress();
                  setViewMode("catalog");
                }}
              >
                <Text style={[styles.modeButtonText, viewMode === "catalog" && styles.modeButtonTextActive]}>
                  {t("browse.mode.catalog")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, viewMode === "florist" && styles.modeButtonActive]}
                onPress={() => {
                  buttonPress();
                  setViewMode("florist");
                }}
              >
                <Text style={[styles.modeButtonText, viewMode === "florist" && styles.modeButtonTextActive]}>
                  {t("browse.mode.florist")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Location Filters - Only show in byLocation mode */}
            {filterMode === "byLocation" && (
              <View style={styles.filtersRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
                  <TouchableOpacity 
                    style={styles.filterChip}
                    onPress={() => {
                      buttonPress();
                      setShowCountryPicker(true);
                    }}
                  >
                    <Text style={styles.filterChipText}>
                      {selectedCountry ? selectedCountry : t("browse.filters.country")}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.text} />
                  </TouchableOpacity>
                  {selectedCountry && cities.length > 0 && (
                    <TouchableOpacity 
                      style={styles.filterChip}
                      onPress={() => {
                        buttonPress();
                        setShowCityPicker(true);
                      }}
                    >
                      <Text style={styles.filterChipText}>
                        {selectedCity || t("browse.filters.city")}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Switch to manual location filter */}
            {filterMode === "nearMe" && (
              <TouchableOpacity
                style={styles.switchFilterButton}
                onPress={() => {
                  buttonPress();
                  setFilterMode("byLocation");
                }}
              >
                <Ionicons name="settings-outline" size={16} color={colors.primary} />
                <Text style={styles.switchFilterText}>{t("browse.filters.customLocation")}</Text>
              </TouchableOpacity>
            )}

            {/* Section Title */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {viewMode === "catalog" ? t("browse.flowers.all") : t("browse.flowers.fromFlorists")}
              </Text>
              <Text style={styles.resultsCount}>
                {filteredFlowers.length} {t("browse.flowers.items")}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }: { item: PublicFlower }) => {
          const isInWishlist = wishlistIds.has(item.id);
          return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              buttonPress();
              onFlowerPress(item);
            }}
            data-testid={`flower-card-${item.id}`}
          >
            <View style={styles.imageContainer}>
              {item.imageUrl && !brokenImages[item.id] ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={() => {
                    setBrokenImages((prev: Record<string, true>) => ({
                      ...prev,
                      [item.id]: true,
                    }));
                  }}
                />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Ionicons name="flower-outline" size={40} color={colors.muted} />
                </View>
              )}
              {/* Wishlist Heart Button */}
              <TouchableOpacity
                style={[
                  styles.wishlistButton,
                  isInWishlist && styles.wishlistButtonActive,
                ]}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleToggleWishlist(item);
                }}
                data-testid={`wishlist-btn-${item.id}`}
              >
                <Ionicons
                  name={isInWishlist ? "heart" : "heart-outline"}
                  size={18}
                  color={isInWishlist ? colors.danger : colors.white}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.floristName && (
                <Text style={styles.floristLabel} numberOfLines={1}>
                  <Ionicons name="storefront-outline" size={10} color={colors.muted} /> {item.floristName}
                </Text>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {formatPrice(item.price)} {item.currency}
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    handleAddToCart(item);
                  }}
                  data-testid={`add-to-cart-btn-${item.id}`}
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flower-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>{t("browse.empty")}</Text>
          </View>
        }
      />

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => {
            buttonPress();
            setShowCountryPicker(false);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("browse.filters.selectCountry") || "Виберіть країну"}</Text>
              <TouchableOpacity onPress={() => {
                buttonPress();
                setShowCountryPicker(false);
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedCountry && styles.modalItemActive]}
                onPress={() => {
                  buttonPress();
                  setSelectedCountry(null);
                  setSelectedCity(null);
                  setShowCountryPicker(false);
                }}
              >
                <Text style={[styles.modalItemText, !selectedCountry && styles.modalItemTextActive]}>
                  {t("browse.filters.allCountries") || "Всі країни"}
                </Text>
                {!selectedCountry && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {countries.map((country: string) => (
                <TouchableOpacity
                  key={country}
                  style={[styles.modalItem, selectedCountry === country && styles.modalItemActive]}
                  onPress={() => {
                    buttonPress();
                    setSelectedCountry(country);
                    setSelectedCity(null);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedCountry === country && styles.modalItemTextActive]}>
                    {formatCountryLabel(country)}
                  </Text>
                  {selectedCountry === country && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => {
            buttonPress();
            setShowCityPicker(false);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("browse.filters.selectCity") || "Виберіть місто"}</Text>
              <TouchableOpacity onPress={() => {
                buttonPress();
                setShowCityPicker(false);
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedCity && styles.modalItemActive]}
                onPress={() => {
                  buttonPress();
                  setSelectedCity(null);
                  setShowCityPicker(false);
                }}
              >
                <Text style={[styles.modalItemText, !selectedCity && styles.modalItemTextActive]}>
                  {t("browse.filters.allCities") || "Всі міста"}
                </Text>
                {!selectedCity && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {cities.map((city: string) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.modalItem, selectedCity === city && styles.modalItemActive]}
                  onPress={() => {
                    buttonPress();
                    setSelectedCity(city);
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedCity === city && styles.modalItemTextActive]}>
                    {city}
                  </Text>
                  {selectedCity === city && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        visible={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={setAdvancedFilters}
        initialFilters={advancedFilters}
        maxPrice={maxPrice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    alignSelf: "flex-start",
    gap: spacing.xs,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  nearMeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  nearMeButtonActive: {
    backgroundColor: colors.primary,
  },
  nearMeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  nearMeButtonTextActive: {
    color: colors.white,
  },
  categoriesContainer: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    paddingRight: spacing.md,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  floristsContent: {
    paddingRight: spacing.md,
  },
  floristCard: {
    width: 104,
    alignItems: "center",
    marginRight: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  floristAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  floristName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  floristRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  floristRatingText: {
    fontSize: 11,
    color: colors.text,
    marginLeft: 2,
  },
  floristCity: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
  },
  modeToggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  filtersRow: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingRight: spacing.md,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.text,
    marginRight: spacing.xs,
  },
  switchFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  switchFilterText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.muted,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  image: {
    width: "100%",
    height: 148,
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  floristLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemActive: {
    backgroundColor: colors.primaryLight,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});