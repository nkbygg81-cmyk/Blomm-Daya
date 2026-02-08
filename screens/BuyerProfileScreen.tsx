import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../convex/_generated/dataModel";
import { useTranslation } from "../lib/i18n/useTranslation";
import { useMemo } from "react";

type Buyer = {
  id: Id<"buyers">;
  email: string;
  name: string | null;
  phone: string | null;
};

type Props = {
  buyerId: Id<"buyers">;
  buyer: Buyer;
  onBack: () => void;
};

type SavedAddress = {
  id: string;
  label: string;
  address: string;
  recipientName?: string;
  recipientPhone?: string;
  isDefault: boolean;
};

const AVAILABLE_COLORS = [
  "Червоний", "Рожевий", "Білий", "Жовтий", "Помаранчевий", 
  "Фіолетовий", "Синій", "Зелений", "Мікс"
];

const AVAILABLE_OCCASIONS = [
  "День народження", "Весілля", "Річниця", "День матері", 
  "8 Березня", "14 Лютого", "Випускний", "Похорон", "Без приводу"
];

export function BuyerProfileScreen({ buyerId, buyer, onBack }: Props) {
  const { t } = useTranslation();
  const profile = useQuery(api.buyerProfiles.getProfile, { buyerId });
  const addAddress = useMutation(api.buyerProfiles.addAddress);
  const deleteAddress = useMutation(api.buyerProfiles.deleteAddress);
  const updateBuyerInfo = useMutation(api.buyerProfiles.updateBuyerInfo);
  const updatePreferences = useMutation(api.buyerProfiles.updatePreferences);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({
    name: buyer.name || "",
    phone: buyer.phone || "",
  });
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    recipientName: "",
    recipientPhone: "",
    isDefault: false,
  });
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);

  const uniqueColors = useMemo(
    () => Array.from(new Set(AVAILABLE_COLORS.map((c: string) => c.trim()))),
    []
  );

  const uniqueOccasions = useMemo(
    () => Array.from(new Set(AVAILABLE_OCCASIONS.map((o: string) => o.trim()))),
    []
  );

  useEffect(() => {
    setBuyerInfo({
      name: buyer.name || "",
      phone: buyer.phone || "",
    });
  }, [buyer]);

  useEffect(() => {
    if (profile?.preferences) {
      setSelectedColors(profile.preferences.favoriteColors || []);
      setSelectedOccasions(profile.preferences.favoriteOccasions || []);
    }
  }, [profile]);

  const handleUpdateInfo = async () => {
    try {
      await updateBuyerInfo({
        buyerId,
        name: buyerInfo.name || undefined,
        phone: buyerInfo.phone || undefined,
      });
      setShowInfoModal(false);
      Alert.alert(t("common.success"), t("profile.profileUpdated"));
    } catch (error) {
      Alert.alert(t("common.error"), t("profile.profileUpdateError"));
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address) {
      Alert.alert(t("common.error"), t("profile.enterLabelAddress"));
      return;
    }

    try {
      await addAddress({
        buyerId,
        label: newAddress.label,
        address: newAddress.address,
        recipientName: newAddress.recipientName || undefined,
        recipientPhone: newAddress.recipientPhone || undefined,
        isDefault: newAddress.isDefault,
      });

      setShowAddressModal(false);
      setNewAddress({
        label: "",
        address: "",
        recipientName: "",
        recipientPhone: "",
        isDefault: false,
      });
    } catch (error) {
      Alert.alert(t("common.error"), t("profile.addressAddError"));
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert(t("profile.deleteAddress"), t("profile.deleteAddressConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => deleteAddress({ buyerId, addressId }),
      },
    ]);
  };

  const handleUpdatePreferences = async () => {
    try {
      const normalizedColors = Array.from(
        new Set(selectedColors.map((c: string) => c.trim()).filter(Boolean))
      );
      const normalizedOccasions = Array.from(
        new Set(selectedOccasions.map((o: string) => o.trim()).filter(Boolean))
      );

      await updatePreferences({
        buyerId,
        favoriteColors: normalizedColors.length > 0 ? normalizedColors : undefined,
        favoriteOccasions: normalizedOccasions.length > 0 ? normalizedOccasions : undefined,
      });
      setShowPreferencesModal(false);
      Alert.alert(t("common.success"), t("profile.profileUpdated"));
    } catch (error) {
      Alert.alert(t("common.error"), t("profile.profileUpdateError"));
    }
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev: string[]) =>
      prev.includes(color)
        ? prev.filter((c: string) => c !== color)
        : [...prev, color]
    );
  };

  const toggleOccasion = (occasion: string) => {
    setSelectedOccasions((prev: string[]) =>
      prev.includes(occasion)
        ? prev.filter((o: string) => o !== occasion)
        : [...prev, occasion]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("profile.title")}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Personal Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.personalInfo")}</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(true)}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{buyer.email}</Text>
          </View>

          {buyer.name && (
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{buyer.name}</Text>
            </View>
          )}

          {buyer.phone && (
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>{buyer.phone}</Text>
            </View>
          )}

          {!buyer.name && !buyer.phone && (
            <Text style={styles.emptyText}>{t("profile.addNamePhone")}</Text>
          )}
        </View>

        {/* Saved Addresses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.savedAddresses")}</Text>
            <TouchableOpacity onPress={() => setShowAddressModal(true)}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {profile?.savedAddresses && profile.savedAddresses.length > 0 ? (
            profile.savedAddresses.map((addr: SavedAddress) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressLabel}>
                    {addr.label}
                    {addr.isDefault && (
                      <Text style={styles.defaultBadge}> • {t("profile.default")}</Text>
                    )}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.addressText}>{addr.address}</Text>
                {addr.recipientName && (
                  <Text style={styles.addressDetail}>
                    <Ionicons name="person-outline" size={14} /> {addr.recipientName}
                  </Text>
                )}
                {addr.recipientPhone && (
                  <Text style={styles.addressDetail}>
                    <Ionicons name="call-outline" size={14} /> {addr.recipientPhone}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t("profile.noAddresses")}</Text>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("profile.preferences")}</Text>
            <TouchableOpacity onPress={() => setShowPreferencesModal(true)}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {profile?.preferences?.favoriteColors && profile.preferences.favoriteColors.length > 0 ? (
            <View style={styles.preferenceItem}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
              <Text style={styles.preferenceText}>
                {t("profile.favoriteColors")}: {profile.preferences.favoriteColors.join(", ")}
              </Text>
            </View>
          ) : null}
          
          {profile?.preferences?.favoriteOccasions && profile.preferences.favoriteOccasions.length > 0 ? (
            <View style={styles.preferenceItem}>
              <Ionicons name="gift-outline" size={20} color={colors.primary} />
              <Text style={styles.preferenceText}>
                {t("profile.favoriteOccasions")}: {profile.preferences.favoriteOccasions.join(", ")}
              </Text>
            </View>
          ) : null}
          
          {(!profile?.preferences?.favoriteColors || profile.preferences.favoriteColors.length === 0) &&
           (!profile?.preferences?.favoriteOccasions || profile.preferences.favoriteOccasions.length === 0) && (
            <Text style={styles.emptyText}>{t("profile.editPreferences")}</Text>
          )}
        </View>
      </ScrollView>

      {/* Add Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("profile.addAddress")}</Text>

            <TextInput
              style={styles.input}
              placeholder={t("profile.addressLabel")}
              value={newAddress.label}
              onChangeText={(text: string) => setNewAddress({ ...newAddress, label: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t("profile.address")}
              value={newAddress.address}
              onChangeText={(text: string) => setNewAddress({ ...newAddress, address: text })}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={styles.input}
              placeholder={t("profile.recipientName")}
              value={newAddress.recipientName}
              onChangeText={(text: string) =>
                setNewAddress({ ...newAddress, recipientName: text })
              }
            />

            <TextInput
              style={styles.input}
              placeholder={t("profile.recipientPhone")}
              value={newAddress.recipientPhone}
              onChangeText={(text: string) =>
                setNewAddress({ ...newAddress, recipientPhone: text })
              }
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() =>
                setNewAddress({ ...newAddress, isDefault: !newAddress.isDefault })
              }
            >
              <Ionicons
                name={newAddress.isDefault ? "checkbox" : "square-outline"}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.checkboxLabel}>{t("profile.setDefault")}</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowAddressModal(false)}
              >
                <Text style={styles.buttonSecondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleAddAddress}>
                <Text style={styles.buttonText}>{t("common.add")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>

            <TextInput
              style={styles.input}
              placeholder={t("profile.name")}
              value={buyerInfo.name}
              onChangeText={(text: string) => setBuyerInfo({ ...buyerInfo, name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder={t("profile.phone")}
              value={buyerInfo.phone}
              onChangeText={(text: string) => setBuyerInfo({ ...buyerInfo, phone: text })}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.buttonSecondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleUpdateInfo}>
                <Text style={styles.buttonText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preferences Modal */}
      <Modal
        visible={showPreferencesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPreferencesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("profile.editPreferences")}</Text>
            
            <ScrollView style={styles.preferencesScroll}>
              <Text style={styles.preferencesSectionTitle}>{t("profile.selectColors")}</Text>
              <View style={styles.tagsContainer}>
                {uniqueColors.map((color: string) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.tag,
                      selectedColors.includes(color) && styles.tagSelected,
                    ]}
                    onPress={() => toggleColor(color)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedColors.includes(color) && styles.tagTextSelected,
                      ]}
                    >
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.preferencesSectionTitle}>{t("profile.selectOccasions")}</Text>
              <View style={styles.tagsContainer}>
                {uniqueOccasions.map((occasion: string) => (
                  <TouchableOpacity
                    key={occasion}
                    style={[
                      styles.tag,
                      selectedOccasions.includes(occasion) && styles.tagSelected,
                    ]}
                    onPress={() => toggleOccasion(occasion)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedOccasions.includes(occasion) && styles.tagTextSelected,
                      ]}
                    >
                      {occasion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowPreferencesModal(false)}
              >
                <Text style={styles.buttonSecondaryText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleUpdatePreferences}>
                <Text style={styles.buttonText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  addressCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  defaultBadge: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "normal",
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  addressDetail: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textLight,
    marginVertical: spacing.xl,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  preferenceText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.xl,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: spacing.xs,
  },
  buttonSecondary: {
    backgroundColor: colors.background,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  buttonSecondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  preferencesScroll: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  preferencesSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 13,
    color: colors.text,
  },
  tagTextSelected: {
    color: colors.white,
  },
});

export default BuyerProfileScreen;