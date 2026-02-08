import { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../lib/CartContext";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress, buttonPressHeavy, notificationSuccess } from "../lib/haptics";
import { maybeRequestReview } from "../lib/rateApp";
import { formatPrice } from "../lib/formatPrice";

type Props = {
  onBack: () => void;
};

export function CheckoutScreen({ onBack }: Props) {
  const { items, gifts, totalPrice, clearCart } = useCart();
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const calculateDeliveryInfo = useAction(api.deliveryCalculation.calculateDeliveryInfo);
  const { t, locale } = useTranslation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  
  // Delivery calculation state
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [addressChanged, setAddressChanged] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number; country?: string } | null>(null);
  const suggestionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const validatePromo = useQuery(api.promos.validatePromoCode, promoCode.length > 0 ? { code: promoCode } : "skip");
  const calculateDiscount = useQuery(
    api.promos.calculateDiscount,
    promoCode.length > 0 ? { code: promoCode, subtotal: totalPrice } : "skip"
  );

  // Check if pending payment was completed (order created by webhook)
  const pendingOrder = useQuery(
    api.buyerOrders.getOrderBySessionId,
    pendingSessionId ? { sessionId: pendingSessionId } : "skip"
  );

  useEffect(() => {
    if (pendingOrder && pendingSessionId) {
      // Payment confirmed by webhook - order exists
      clearCart();
      setPendingSessionId(null);
      setPaymentPending(false);
      notificationSuccess();
      maybeRequestReview();
      Alert.alert(
        t("checkout.orderConfirmed") || "Beställningen bekräftad!",
        t("checkout.orderConfirmedMessage") || "Din beställning har tagits emot och behandlas nu.",
        [{ text: "OK", onPress: onBack }]
      );
    }
  }, [pendingOrder, pendingSessionId]);

  // Load saved quick order data
  useEffect(() => {
    (async () => {
      const savedName = await AsyncStorage.getItem("quickOrder_name");
      const savedPhone = await AsyncStorage.getItem("quickOrder_phone");
      const savedEmail = await AsyncStorage.getItem("quickOrder_email");
      const savedAddress = await AsyncStorage.getItem("quickOrder_address");
      const savedPostalCode = await AsyncStorage.getItem("quickOrder_postalCode");
      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
      if (savedEmail) setEmail(savedEmail);
      if (savedAddress) {
        setAddress(savedAddress);
        setAddressQuery(savedAddress);
      }
      if (savedPostalCode) setPostalCode(savedPostalCode);
    })();
  }, []);

  // Update discount when promo validation succeeds
  useEffect(() => {
    if (calculateDiscount && !calculateDiscount.loading) {
      try {
        setPromoDiscount(calculateDiscount);
        setPromoError("");
      } catch (e: any) {
        setPromoError(e.message || t("checkoutExtra.promoError"));
      }
    }
  }, [calculateDiscount]);

  // Fetch address suggestions from Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await (globalThis as any).fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=5`,
        { headers: { "User-Agent": "Blomm-Daya-App/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (e) {
      console.error("Address suggestions error:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const handleAddressQueryChange = (text: string) => {
    setAddressQuery(text);
    setSelectedCoords(null);
    setDeliveryInfo(null);
    setDeliveryError(null);
    setAddressChanged(true);

    if (suggestionsTimer.current) clearTimeout(suggestionsTimer.current);
    suggestionsTimer.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const handleSelectSuggestion = async (item: any) => {
    Keyboard.dismiss();
    const displayName = item.display_name || "";
    const addr = item.address || {};
    const extractedPostal = addr.postcode || "";

    // Build a concise address from components
    const parts: string[] = [];
    if (addr.road) parts.push(addr.road + (addr.house_number ? " " + addr.house_number : ""));
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    if (addr.state) parts.push(addr.state);
    if (addr.country) parts.push(addr.country);
    const shortAddress = parts.length > 0 ? parts.join(", ") : displayName;

    setAddressQuery(shortAddress);
    setAddress(shortAddress);
    setShowSuggestions(false);
    setAddressSuggestions([]);

    if (extractedPostal) setPostalCode(extractedPostal);

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const country = item.address?.country_code || "";
    setSelectedCoords({ lat, lon, country });

    // Trigger delivery calculation immediately with known coordinates
    setCalculatingDelivery(true);
    setDeliveryError(null);
    setAddressChanged(false);
    try {
      const info = await calculateDeliveryInfo({
        deliveryAddress: shortAddress,
        customerLat: lat,
        customerLon: lon,
        country: country,
      });
      setDeliveryInfo(info);
      if (!info) {
        setDeliveryError(t("checkoutExtra.couldNotFindFlorist"));
      }
    } catch (error) {
      console.error("Failed to calculate delivery:", error);
      setDeliveryInfo(null);
      setDeliveryError(t("checkoutExtra.deliveryCalcError"));
    } finally {
      setCalculatingDelivery(false);
    }
  };

  // Calculate delivery when address changes manually (with debounce) - fallback for manual typing
  useEffect(() => {
    // Only run if user typed manually without selecting a suggestion
    if (selectedCoords || !addressChanged || !address.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setCalculatingDelivery(true);
      setDeliveryError(null);
      try {
        const info = await calculateDeliveryInfo({ deliveryAddress: address });
        setDeliveryInfo(info);
        if (!info) {
          setDeliveryError(t("checkoutExtra.couldNotFindFlorist"));
        }
      } catch (error) {
        console.error("Failed to calculate delivery:", error);
        setDeliveryInfo(null);
        setDeliveryError(t("checkoutExtra.deliveryCalcError"));
      } finally {
        setCalculatingDelivery(false);
        setAddressChanged(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [address, addressChanged, selectedCoords, calculateDeliveryInfo, locale]);

  // Keep address in sync with addressQuery for manual input
  useEffect(() => {
    if (!selectedCoords && addressQuery !== address) {
      setAddress(addressQuery);
    }
  }, [addressQuery]);

  const finalTotal = (promoDiscount?.final != null ? promoDiscount.final : totalPrice) + (deliveryType === "delivery" && deliveryInfo?.deliveryFee ? deliveryInfo.deliveryFee : 0);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !postalCode.trim()) {
      Alert.alert(t("checkout.fillAllFields"), t("checkout.fillAllFieldsMessage"));
      return;
    }

    // Ensure we have delivery info (and floristId) before creating Stripe session.
    if (addressChanged || calculatingDelivery) {
      Alert.alert(
        t("checkoutExtra.wait"),
        t("checkoutExtra.calculatingNearestFlorist"),
      );
      return;
    }

    let effectiveDeliveryInfo = deliveryInfo;
    if (!effectiveDeliveryInfo) {
      setCalculatingDelivery(true);
      try {
        const calcArgs: any = { deliveryAddress: address };
        if (selectedCoords) {
          calcArgs.customerLat = selectedCoords.lat;
          calcArgs.customerLon = selectedCoords.lon;
          calcArgs.country = selectedCoords.country;
        }
        effectiveDeliveryInfo = await calculateDeliveryInfo(calcArgs);
        setDeliveryInfo(effectiveDeliveryInfo);
      } catch (error) {
        console.error("Failed to calculate delivery (submit):", error);
        effectiveDeliveryInfo = null;
      } finally {
        setCalculatingDelivery(false);
      }
    }

    if (!effectiveDeliveryInfo?.floristId) {
      Alert.alert(
        t("checkoutExtra.noFloristFound"),
        t("checkoutExtra.noFloristForAddress"),
      );
      return;
    }

    setSubmitting(true);
    try {
      const deviceId = await getBuyerDeviceId();

      await AsyncStorage.setItem("quickOrder_name", name);
      await AsyncStorage.setItem("quickOrder_phone", phone);
      await AsyncStorage.setItem("quickOrder_email", email);
      await AsyncStorage.setItem("quickOrder_address", address);
      await AsyncStorage.setItem("quickOrder_postalCode", postalCode);

      const payload: any = {
        items: items.map((item: any) => ({
          flowerId: item.id,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          qty: item.qty,
        })),
        buyerDeviceId: deviceId,
        customerName: name,
        customerPhone: phone,
        customerEmail: email.trim() || undefined,
        deliveryType: deliveryType,
        deliveryAddress: `${address}, ${postalCode}`,
        note: note || undefined,
        floristId: effectiveDeliveryInfo.floristId,
      };

      if (gifts.length > 0) {
        payload.gifts = gifts.map((gift: any) => ({
          giftId: gift.id,
          name: gift.name,
          price: gift.price,
          imageUrl: gift.imageUrl,
          qty: gift.qty,
        }));
      }

      if (promoDiscount?.discount && promoDiscount.discount > 0) {
        payload.promoCode = promoCode.toUpperCase();
        payload.promoDiscount = promoDiscount.discount;
      }

      // Include delivery fee in Stripe charge
      if (deliveryType === "delivery" && effectiveDeliveryInfo?.deliveryFee > 0) {
        payload.deliveryFee = Math.round(effectiveDeliveryInfo.deliveryFee);
      }

      const res: any = await createCheckoutSession(payload);
      const checkoutUrl: string = res.checkoutUrl;
      const sessionId: string = res.sessionId;

      try {
        await Linking.openURL(checkoutUrl);
        // Don't clear cart yet — wait for webhook to confirm payment
        setPendingSessionId(sessionId);
        setPaymentPending(true);
      } catch {
        Alert.alert(t("common.error"), t("browse.errorTryAgain"));
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert(
        t("common.error"),
        `${t("browse.errorTryAgain")}\n\n${message}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Payment pending overlay */}
      {paymentPending && (
        <View style={styles.pendingOverlay}>
          <View style={styles.pendingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.pendingTitle}>
              {t("checkout.waitingForPayment") || "Väntar på betalning..."}
            </Text>
            <Text style={styles.pendingText}>
              {t("checkout.completePaymentInBrowser") || "Slutför betalningen i webbläsaren. Denna sida uppdateras automatiskt."}
            </Text>
            <TouchableOpacity
              style={styles.pendingCancelBtn}
              onPress={() => {
                setPaymentPending(false);
                setPendingSessionId(null);
                setSubmitting(false);
              }}
            >
              <Text style={styles.pendingCancelText}>
                {t("checkout.cancelPayment") || "Avbryt"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          buttonPress();
          onBack();
        }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("checkout.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("checkout.title")}</Text>

          <Text style={styles.label}>
            {t("checkout.name")} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t("checkout.name")}
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>
            {t("checkout.phone")} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+46..."
            keyboardType="phone-pad"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>
            Email
          </Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Delivery Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("checkoutExtra.deliveryMethod")}
          </Text>

          <View style={styles.deliveryTypeContainer}>
            <TouchableOpacity
              style={[
                styles.deliveryTypeButton,
                deliveryType === "delivery" && styles.deliveryTypeButtonActive,
              ]}
              onPress={() => {
                buttonPress();
                setDeliveryType("delivery");
              }}
            >
              <Ionicons
                name="car"
                size={32}
                color={deliveryType === "delivery" ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.deliveryTypeText,
                  deliveryType === "delivery" && styles.deliveryTypeTextActive,
                ]}
              >
                {t("checkoutExtra.delivery")}
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubtext,
                  deliveryType === "delivery" && styles.deliveryTypeSubtextActive,
                ]}
              >
                {t("checkoutExtra.floristDelivers")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryTypeButton,
                deliveryType === "pickup" && styles.deliveryTypeButtonActive,
              ]}
              onPress={() => {
                buttonPress();
                setDeliveryType("pickup");
              }}
            >
              <Ionicons
                name="bag-handle"
                size={32}
                color={deliveryType === "pickup" ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.deliveryTypeText,
                  deliveryType === "pickup" && styles.deliveryTypeTextActive,
                ]}
              >
                {t("checkoutExtra.pickup")}
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubtext,
                  deliveryType === "pickup" && styles.deliveryTypeSubtextActive,
                ]}
              >
                {t("checkoutExtra.pickupInStore")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("checkout.address")}</Text>

          <View style={styles.deliveryNote}>
            <Ionicons name="car" size={20} color={colors.success} />
            <Text style={styles.deliveryNoteText}>
              {t("checkoutExtra.floristDeliversToAddress")}
            </Text>
          </View>

          <Text style={styles.label}>
            {t("checkout.address")} <Text style={styles.required}>*</Text>
          </Text>
          <View style={{ position: "relative", zIndex: 10 }}>
            <View style={styles.addressInputRow}>
              <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={styles.addressInput}
                value={addressQuery}
                onChangeText={handleAddressQueryChange}
                placeholder={locale === "sv" ? "Sök adress..." : locale === "uk" ? "Пошук адреси..." : "Search address..."}
                placeholderTextColor={colors.muted}
                onFocus={() => {
                  if (addressSuggestions.length > 0) setShowSuggestions(true);
                }}
                returnKeyType="search"
              />
              {loadingSuggestions && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {addressQuery.length > 0 && !loadingSuggestions && (
                <TouchableOpacity
                  onPress={() => {
                    setAddressQuery("");
                    setAddress("");
                    setPostalCode("");
                    setSelectedCoords(null);
                    setDeliveryInfo(null);
                    setDeliveryError(null);
                    setAddressSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {showSuggestions && addressSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {addressSuggestions.map((item: any, idx: number) => {
                  const addr = item.address || {};
                  const mainText = [addr.road, addr.house_number].filter(Boolean).join(" ") || item.display_name?.split(",")[0] || "";
                  const subText = [addr.city || addr.town || addr.village, addr.postcode, addr.country].filter(Boolean).join(", ");
                  return (
                    <TouchableOpacity
                      key={item.place_id || idx}
                      style={[
                        styles.suggestionItem,
                        idx < addressSuggestions.length - 1 && styles.suggestionItemBorder,
                      ]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionMainText} numberOfLines={1}>{mainText}</Text>
                        {subText ? <Text style={styles.suggestionSubText} numberOfLines={1}>{subText}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <Text style={styles.label}>
            {t("checkout.postalCode")} <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder={t("checkout.postalCode")}
            placeholderTextColor={colors.muted}
          />

          {/* Delivery distance and fee info */}
          {calculatingDelivery && (
            <View style={styles.deliveryInfoBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.deliveryInfoTextMuted}>
                {t("checkoutExtra.calculatingDistance")}
              </Text>
            </View>
          )}

          {!calculatingDelivery && deliveryError && (
            <View style={[styles.deliveryInfoBox, { borderColor: colors.primary }]}>
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="warning" size={18} color={colors.primary} />
                <Text style={[styles.deliveryInfoLabel, { color: colors.primary }]}>
                  {deliveryError}
                </Text>
              </View>
            </View>
          )}
          
          {!calculatingDelivery && deliveryInfo && (
            <View style={styles.deliveryInfoBox}>
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="location" size={18} color={colors.success} />
                <Text style={styles.deliveryInfoLabel}>
                  {t("checkoutExtra.nearestFlorist")}:
                </Text>
                <Text style={styles.deliveryInfoValue}>{deliveryInfo.floristName}</Text>
              </View>
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="navigate" size={18} color={colors.primary} />
                <Text style={styles.deliveryInfoLabel}>
                  {t("checkoutExtra.distance")}:
                </Text>
                <Text style={styles.deliveryInfoValue}>{deliveryInfo.distanceKm} {t("units.km")}</Text>
              </View>
              <View style={styles.deliveryInfoRow}>
                <Ionicons name="cash" size={18} color={colors.primary} />
                <Text style={styles.deliveryInfoLabel}>
                  {t("checkoutExtra.deliveryFee")}:
                </Text>
                <Text style={styles.deliveryInfoValue}>
                  {Math.round(deliveryInfo.deliveryFee)} kr
                </Text>
              </View>
            </View>
          )}

          {/* Note for any order type */}
          <View style={styles.section}>
            <Text style={styles.label}>{t("checkout.note")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder={
                deliveryType === "pickup"
                  ? t("checkoutExtra.pickupNoteExample")
                  : t("checkoutExtra.notePlaceholder")
              }
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Pickup info display */}
        {deliveryType === "pickup" && (
        <View style={styles.section}>
          <View style={styles.pickupInfoCard}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.pickupInfoTitle}>
                {t("checkoutExtra.pickupInStoreTitle")}
              </Text>
              <Text style={styles.pickupInfoText}>
                {t("checkoutExtra.pickupInStoreInfo")}
              </Text>
            </View>
          </View>
        </View>
        )}

        {/* Payment Summary */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>{t("checkout.paymentMethod")}</Text>
          <View style={styles.paymentMethods}>
            <View style={styles.paymentBadge}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={styles.paymentBadgeText}>Kort</Text>
            </View>
            <View style={styles.paymentBadge}>
              <Text style={styles.klarnaIcon}>K</Text>
              <Text style={styles.paymentBadgeText}>Klarna</Text>
            </View>
          </View>
          <Text style={styles.paymentNote}>
            {t("checkout.paymentNote")}
          </Text>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promocode</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={promoCode}
              onChangeText={(text) => {
                setPromoCode(text);
                setPromoError("");
                if (!text) setPromoDiscount(null);
              }}
              placeholder="WELCOME10"
              autoCapitalize="characters"
              placeholderTextColor={colors.muted}
            />
          </View>
          {promoDiscount?.discount > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.xs }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={{ color: colors.success, fontWeight: "600", fontSize: 14 }}>
                -{formatPrice(promoDiscount.discount)} kr
              </Text>
            </View>
          )}
          {promoError ? (
            <Text style={{ color: colors.primary, fontSize: 13, marginTop: spacing.xs }}>{promoError}</Text>
          ) : null}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {t("checkout.orderSummaryTitle")}
          </Text>
          {items.map((item: any) => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.summaryItemText}>
                {item.name} x{item.qty}
              </Text>
              <Text style={styles.summaryItemPrice}>{formatPrice(item.price * item.qty)} kr</Text>
            </View>
          ))}
          {gifts.length > 0 && (
            <>
              <View style={styles.giftDivider}>
                <Text style={styles.giftDividerText}>
                  {t("checkout.giftsTitle")}
                </Text>
              </View>
              {gifts.map((gift: any) => (
                <View key={gift.id} style={styles.summaryItem}>
                  <Text style={styles.summaryItemText}>
                    {gift.name} x{gift.qty}
                  </Text>
                  <Text style={styles.summaryItemPrice}>{formatPrice(gift.price * gift.qty)} kr</Text>
                </View>
              ))}
            </>
          )}
          
          {/* Promo discount line item */}
          {promoDiscount?.discount > 0 && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemText, { color: colors.success }]}>
                Promocode ({promoDiscount.code})
              </Text>
              <Text style={[styles.summaryItemPrice, { color: colors.success }]}>
                -{formatPrice(promoDiscount.discount)} kr
              </Text>
            </View>
          )}

          {/* Delivery fee line item */}
          {deliveryInfo && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemText}>
                {t("checkoutExtra.deliveryFee")}
              </Text>
              <Text style={styles.summaryItemPrice}>
                {Math.round(deliveryInfo.deliveryFee)} kr
              </Text>
            </View>
          )}
          
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalText}>
              {t("checkout.totalLabel")}
            </Text>
            <Text style={styles.summaryTotalPrice}>{formatPrice(finalTotal)} kr</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={() => {
            buttonPressHeavy();
            handleSubmit();
          }}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? t("checkout.processing") : t("checkout.goToPayment")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  scrollContent: { padding: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  required: { color: colors.primary },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  deliveryNote: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  deliveryNoteText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  deliveryTypeContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  deliveryTypeButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  deliveryTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  deliveryTypeText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  deliveryTypeTextActive: {
    color: colors.primary,
  },
  deliveryTypeSubtext: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  deliveryTypeSubtextActive: {
    color: colors.primary,
  },
  pickupNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  pickupNoteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pickupNoteSubtext: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  pickupInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  pickupInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pickupInfoText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  paymentSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodInfo: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  paymentMethods: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  klarnaIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFB3C7",
  },
  paymentNote: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  summary: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  summaryItemText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTotalText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  summaryTotalPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  giftDivider: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  giftDividerText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "700",
  },
  deliveryInfoBox: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  deliveryInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  deliveryInfoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  deliveryInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  deliveryInfoTextMuted: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  freeDelivery: {
    color: colors.success,
  },
  addressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addressInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  suggestionSubText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  pendingCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 340,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  pendingText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  pendingCancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
});

export default CheckoutScreen;