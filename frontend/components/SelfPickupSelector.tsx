import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTheme } from "../lib/ThemeContext";
import { useTranslation } from "../lib/i18n/useTranslation";
import { Ionicons } from "@expo/vector-icons";
import { buttonPress } from "../lib/haptics";

type PickupPoint = {
  _id: string;
  name: string;
  address: string;
  city: string;
  workingHours: string;
  phone?: string;
};

type Props = {
  floristId?: string;
  city?: string;
  selectedPoint: PickupPoint | null;
  onSelect: (point: PickupPoint) => void;
};

export function SelfPickupSelector({ floristId, city, selectedPoint, onSelect }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const pickupPoints = useQuery(
    api.selfPickup.getPickupPoints,
    { 
      floristId: floristId ? (floristId as any) : undefined,
      city 
    }
  );

  const isLoading = pickupPoints === undefined;

  const renderPickupPoint = ({ item }: { item: PickupPoint }) => {
    const isSelected = selectedPoint?._id === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.pointCard,
          { backgroundColor: colors.card },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => {
          buttonPress();
          onSelect(item);
          setShowModal(false);
        }}
        data-testid={`pickup-point-${item._id}`}
      >
        <View style={styles.pointHeader}>
          <View style={[styles.pointIcon, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <View style={styles.pointInfo}>
            <Text style={[styles.pointName, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.pointAddress, { color: colors.textSecondary }]}>
              {item.address}
            </Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </View>
        
        <View style={styles.pointDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {item.workingHours}
            </Text>
          </View>
          {item.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {item.phone}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {/* Selected Point Display or Select Button */}
      <TouchableOpacity
        style={[styles.selectorButton, { backgroundColor: colors.card }]}
        onPress={() => {
          buttonPress();
          setShowModal(true);
        }}
        data-testid="pickup-selector-button"
      >
        {selectedPoint ? (
          <View style={styles.selectedPointDisplay}>
            <View style={[styles.selectedIcon, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="storefront" size={20} color={colors.primary} />
            </View>
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedName, { color: colors.text }]}>
                {selectedPoint.name}
              </Text>
              <Text style={[styles.selectedAddress, { color: colors.textSecondary }]}>
                {selectedPoint.address}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        ) : (
          <View style={styles.emptySelector}>
            <Ionicons name="location-outline" size={24} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {t("selfPickup.selectPoint")}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>

      {/* Free Badge */}
      {selectedPoint && (
        <View style={[styles.freeBadge, { backgroundColor: "#10B981" + "20" }]}>
          <Ionicons name="pricetag" size={14} color="#10B981" />
          <Text style={[styles.freeText, { color: "#10B981" }]}>
            {t("selfPickup.free")}
          </Text>
        </View>
      )}

      {/* Pickup Points Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("selfPickup.selectPoint")}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : pickupPoints && pickupPoints.length > 0 ? (
              <FlatList
                data={pickupPoints}
                renderItem={renderPickupPoint}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.pointsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {t("selfPickup.noPoints")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Compact toggle for choosing between delivery and pickup
export function DeliveryTypeToggle({
  type,
  onChange,
}: {
  type: "delivery" | "pickup";
  onChange: (type: "delivery" | "pickup") => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={[
          styles.toggleOption,
          type === "delivery" && { backgroundColor: colors.primary },
        ]}
        onPress={() => {
          buttonPress();
          onChange("delivery");
        }}
        data-testid="delivery-type-delivery"
      >
        <Ionicons
          name="bicycle"
          size={18}
          color={type === "delivery" ? "#fff" : colors.textSecondary}
        />
        <Text
          style={[
            styles.toggleText,
            { color: type === "delivery" ? "#fff" : colors.textSecondary },
          ]}
        >
          {t("selfPickup.delivery")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleOption,
          type === "pickup" && { backgroundColor: colors.primary },
        ]}
        onPress={() => {
          buttonPress();
          onChange("pickup");
        }}
        data-testid="delivery-type-pickup"
      >
        <Ionicons
          name="storefront"
          size={18}
          color={type === "pickup" ? "#fff" : colors.textSecondary}
        />
        <Text
          style={[
            styles.toggleText,
            { color: type === "pickup" ? "#fff" : colors.textSecondary },
          ]}
        >
          {t("selfPickup.pickup")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    borderRadius: 12,
    padding: 16,
  },
  selectedPointDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  emptySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  freeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  pointsList: {
    padding: 16,
  },
  pointCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pointHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: 14,
    fontWeight: "600",
  },
  pointAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  pointDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
