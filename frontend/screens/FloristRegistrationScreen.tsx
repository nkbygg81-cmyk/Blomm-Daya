import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onBack: () => void;
  onSuccess: () => void;
};

type CountryOption = {
  code: string;
  name: string;
};

const COUNTRIES: CountryOption[] = [
  { code: "SE", name: "Sweden" },
  { code: "UA", name: "Ukraine" },
  { code: "DE", name: "Germany" },
  { code: "PL", name: "Poland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "DK", name: "Denmark" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "RO", name: "Romania" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  SE: ["Stockholm", "Göteborg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg"],
  UA: ["Київ", "Львів", "Одеса", "Харків", "Дніпро", "Запоріжжя", "Вінниця", "Івано-Франківськ"],
  DE: ["Berlin", "München", "Hamburg", "Frankfurt", "Köln", "Stuttgart", "Düsseldorf", "Dortmund"],
  PL: ["Warszawa", "Kraków", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Łódź", "Katowice"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux"],
  GB: ["London", "Manchester", "Birmingham", "Liverpool", "Leeds", "Glasgow", "Edinburgh", "Bristol"],
  ES: ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Bilbao", "Granada"],
  IT: ["Roma", "Milano", "Napoli", "Torino", "Firenze", "Bologna", "Venezia", "Palermo"],
  NL: ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg", "Groningen"],
  BE: ["Brussels", "Antwerpen", "Gent", "Charleroi", "Liège", "Brugge", "Namur"],
  AT: ["Wien", "Graz", "Linz", "Salzburg", "Innsbruck"],
  CH: ["Zürich", "Genève", "Basel", "Bern", "Lausanne"],
  DK: ["København", "Aarhus", "Odense", "Aalborg"],
  NO: ["Oslo", "Bergen", "Trondheim", "Stavanger"],
  FI: ["Helsinki", "Espoo", "Tampere", "Vantaa", "Turku"],
  CZ: ["Praha", "Brno", "Ostrava", "Plzeň"],
  RO: ["București", "Cluj-Napoca", "Timișoara", "Iași", "Constanța"],
  PT: ["Lisboa", "Porto", "Braga", "Coimbra"],
  GR: ["Athens", "Thessaloniki", "Patras", "Heraklion"],
  HU: ["Budapest", "Debrecen", "Szeged", "Pécs"],
};

export function FloristRegistrationScreen({ onBack, onSuccess }: Props) {
  const submitApplication = useMutation(api.floristApplications.submit);
  const getCityFromPostalCode = useAction(api.geocoding.getCityFromPostalCode);

  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const availableCities = country ? CITIES_BY_COUNTRY[country] || [] : [];
  const filteredCities = availableCities.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  const getOrgNumberLabel = (countryCode: string) => {
    switch (countryCode) {
      case "SE": return "Organisationsnummer *";
      case "UA": return "ЄДРПОУ / ІПН *";
      case "DE": return "Handelsregisternummer / USt-IdNr *";
      case "PL": return "NIP / REGON *";
      case "FR": return "SIRET / TVA *";
      default: return "Company Registration / VAT *";
    }
  };

  const getOrgNumberPlaceholder = (countryCode: string) => {
    switch (countryCode) {
      case "SE": return "123456-7890 or SE123456789001";
      case "UA": return "12345678";
      case "DE": return "DE123456789";
      case "PL": return "1234567890";
      default: return "Company number";
    }
  };

  const getPostalCodePlaceholder = (): string => {
    switch (country) {
      case "SE":
        return "e.g. 12345";
      case "UA":
        return "e.g. 01001";
      case "DE":
        return "e.g. 10115";
      case "PL":
        return "e.g. 00-001";
      case "FR":
        return "e.g. 75001";
      case "GB":
        return "e.g. SW1A 1AA";
      default:
        return "Postal code";
    }
  };

  const isPostalCodeComplete = (code: string, countryCode: string): boolean => {
    const digitsOnly = code.replace(/\D/g, "");
    
    switch (countryCode) {
      case "SE":
      case "UA":
      case "DE":
      case "FR":
        return digitsOnly.length === 5;
      case "PL":
        return code.length >= 6 && /^\d{2}-\d{3}$/.test(code);
      case "GB":
        return code.length >= 6;
      default:
        return code.length >= 5;
    }
  };

  const handlePostalCodeChange = async (code: string) => {
    setPostalCode(code);
    
    if (!country) return;
    
    // Check if postal code looks complete based on country
    const isComplete = isPostalCodeComplete(code, country);
    
    if (isComplete) {
      try {
        setLoading(true);
        const result = await getCityFromPostalCode({
          postalCode: code,
          country,
        });
        
        if (result?.city) {
          setCity(result.city);
          setCitySearch(result.city);
        }
      } catch (error) {
        console.error("Error fetching city from postal code:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!ownerName || !businessName || !registrationNumber || !email || !phone || !country || !city || !address) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    const countryCode = country.trim().toUpperCase();
    const orgId = registrationNumber.trim();

    // Validation by country
    if (countryCode === "SE") {
      // Swedish org number: 10 digits (with or without dash)
      const digitsOnly = orgId.replace(/\D/g, "");
      if (digitsOnly.length !== 10 && !orgId.startsWith("SE")) {
        Alert.alert("Error", "Swedish Organisationsnummer must be 10 digits (XXXXXX-XXXX) or VAT format (SE123456789001)");
        return;
      }
    } else if (countryCode === "UA") {
      const digitsOnly = orgId.replace(/\D/g, "");
      if (digitsOnly.length < 8) {
        Alert.alert("Error", "ЄДРПОУ must contain at least 8 digits");
        return;
      }
    } else {
      if (orgId.length < 6) {
        Alert.alert("Error", "Registration number must be at least 6 characters");
        return;
      }
    }

    setSubmitting(true);

    try {
      const result = await submitApplication({
        ownerName: ownerName.trim(),
        businessName: businessName.trim(),
        registrationNumber: registrationNumber.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        country,
        description: description || undefined,
      });

      const isLegacyPendingMsg =
        !result.success &&
        typeof result.message === "string" &&
        result.message.includes("вже існує") &&
        result.message.includes("розгляда");

      if (result.success || isLegacyPendingMsg) {
        Alert.alert("Success!", result.message, [
          { text: "OK", onPress: onSuccess },
        ]);
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Could not submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Florist Registration</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Business Information</Text>

          <Text style={styles.label}>Owner Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={colors.muted}
            value={ownerName}
            onChangeText={setOwnerName}
            editable={!submitting}
          />

          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your flower shop name"
            placeholderTextColor={colors.muted}
            value={businessName}
            onChangeText={setBusinessName}
            editable={!submitting}
          />

          <Text style={styles.label}>{getOrgNumberLabel(country)}</Text>
          <TextInput
            style={styles.input}
            placeholder={getOrgNumberPlaceholder(country)}
            placeholderTextColor={colors.muted}
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            editable={!submitting}
            keyboardType="default"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="florist@example.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
          />

          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="+46 XX XXX XX XX"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!submitting}
          />

          <Text style={styles.sectionTitle}>Location</Text>

          <Text style={styles.label}>Country *</Text>
          <View>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                setCountrySearch("");
                setShowCountryPicker(!showCountryPicker);
              }}
              disabled={submitting}
            >
              <Text style={[styles.pickerText, !selectedCountry && styles.placeholderText]}>
                {selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : "Select country"}
              </Text>
            </TouchableOpacity>
            {showCountryPicker && (
              <View style={styles.pickerList}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search countries..."
                  placeholderTextColor={colors.muted}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item: CountryOption) => item.code}
                  scrollEnabled={false}
                  renderItem={({ item }: { item: CountryOption }) => (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        setCountry(item.code);
                        setShowCountryPicker(false);
                        setCity("");
                        setCitySearch("");
                        setPostalCode("");
                      }}
                    >
                      <Text style={styles.pickerItemText}>{item.name} ({item.code})</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          <Text style={styles.label}>Postal Code *</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              style={styles.input}
              placeholder={getPostalCodePlaceholder()}
              placeholderTextColor={colors.muted}
              value={postalCode}
              onChangeText={handlePostalCodeChange}
              editable={!submitting && !!country}
              keyboardType="default"
            />
            {loading && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ position: "absolute", right: 12, top: 12 }}
              />
            )}
          </View>

          <Text style={styles.label}>City *</Text>
          <View>
            <TextInput
              style={styles.input}
              placeholder={country ? "Search city..." : "Enter city"}
              placeholderTextColor={colors.muted}
              value={citySearch}
              onChangeText={(text: string) => {
                setCitySearch(text);
                setCity(text);
                setShowCityPicker(true);
              }}
              onFocus={() => {
                setCitySearch(city);
                setShowCityPicker(true);
              }}
              editable={!submitting}
            />
            {showCityPicker && filteredCities.length > 0 && (
              <View style={styles.pickerList}>
                <FlatList
                  data={filteredCities}
                  keyExtractor={(item: string, index: number) => `${item}-${index}`}
                  scrollEnabled={false}
                  renderItem={({ item }: { item: string }) => (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        setCity(item);
                        setCitySearch(item);
                        setShowCityPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          <Text style={styles.label}>Shop Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Drottninggatan 1"
            placeholderTextColor={colors.muted}
            value={address}
            onChangeText={setAddress}
            editable={!submitting}
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about your business, products, experience..."
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            * Required fields. For SE: Organisationsnummer (10 digits) or VAT format.
            We will review your application within 1-2 business days.
          </Text>
        </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
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
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  pickerList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: spacing.xs,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.muted,
  },
  searchInput: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  note: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});