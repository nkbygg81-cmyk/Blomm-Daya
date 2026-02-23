import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Modal,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/ThemeContext";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import * as Clipboard from "expo-clipboard";

type SocialSharingProps = {
  productName: string;
  productImage?: string;
  productPrice?: number;
  productId: string;
  floristName?: string;
};

export function SocialSharingButton({ 
  productName, 
  productImage, 
  productPrice,
  productId,
  floristName 
}: SocialSharingProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const shareUrl = `https://blomm-daya.app/flower/${productId}`;
  const shareMessage = floristName 
    ? `${productName} від ${floristName} - ${productPrice} грн`
    : `${productName} - ${productPrice} грн`;
  const fullMessage = `${shareMessage}\n\n${shareUrl}`;

  const handleNativeShare = async () => {
    buttonPress();
    try {
      await Share.share({
        message: fullMessage,
        title: productName,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCopyLink = async () => {
    buttonPress();
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert(t("socialSharing.copied"), t("socialSharing.linkCopied"));
    setShowModal(false);
  };

  const handleShareToFacebook = () => {
    buttonPress();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(fbUrl);
    setShowModal(false);
  };

  const handleShareToTelegram = () => {
    buttonPress();
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(tgUrl);
    setShowModal(false);
  };

  const handleShareToViber = () => {
    buttonPress();
    const viberUrl = `viber://forward?text=${encodeURIComponent(fullMessage)}`;
    Linking.openURL(viberUrl);
    setShowModal(false);
  };

  const handleShareToInstagram = () => {
    buttonPress();
    // Instagram doesn't support direct sharing via URL, but we can open the app
    Alert.alert(
      t("socialSharing.instagram"),
      t("socialSharing.instagramHint"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { 
          text: t("socialSharing.copyAndOpen"), 
          onPress: async () => {
            await Clipboard.setStringAsync(fullMessage);
            Linking.openURL("instagram://");
          }
        },
      ]
    );
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.card }]}
        onPress={() => {
          buttonPress();
          setShowModal(true);
        }}
        data-testid="social-share-button"
      >
        <Ionicons name="share-social-outline" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("socialSharing.shareTitle")}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
              {productImage && (
                <Image source={{ uri: productImage }} style={styles.previewImage} />
              )}
              <View style={styles.previewInfo}>
                <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={2}>
                  {productName}
                </Text>
                {productPrice && (
                  <Text style={[styles.previewPrice, { color: colors.primary }]}>
                    {productPrice} грн
                  </Text>
                )}
              </View>
            </View>

            {/* Share Options */}
            <View style={styles.shareOptions}>
              <TouchableOpacity 
                style={[styles.shareOption, { backgroundColor: colors.card }]}
                onPress={handleNativeShare}
                data-testid="share-native"
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="share-outline" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  {t("socialSharing.shareVia")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.shareOption, { backgroundColor: colors.card }]}
                onPress={handleCopyLink}
                data-testid="share-copy-link"
              >
                <View style={[styles.iconCircle, { backgroundColor: "#6B7280" + "20" }]}>
                  <Ionicons name="link-outline" size={24} color="#6B7280" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  {t("socialSharing.copyLink")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.shareOption, { backgroundColor: colors.card }]}
                onPress={handleShareToFacebook}
                data-testid="share-facebook"
              >
                <View style={[styles.iconCircle, { backgroundColor: "#1877F2" + "20" }]}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Facebook
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.shareOption, { backgroundColor: colors.card }]}
                onPress={handleShareToTelegram}
                data-testid="share-telegram"
              >
                <View style={[styles.iconCircle, { backgroundColor: "#0088CC" + "20" }]}>
                  <Ionicons name="paper-plane" size={24} color="#0088CC" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Telegram
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.shareOption, { backgroundColor: colors.card }]}
                onPress={handleShareToViber}
                data-testid="share-viber"
              >
                <View style={[styles.iconCircle, { backgroundColor: "#7360F2" + "20" }]}>
                  <Ionicons name="chatbubbles" size={24} color="#7360F2" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Viber
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.shareOption, { backgroundColor: colors.card }]}
                onPress={handleShareToInstagram}
                data-testid="share-instagram"
              >
                <View style={[styles.iconCircle, { backgroundColor: "#E4405F" + "20" }]}>
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Instagram
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Inline share bar for product detail page
export function SocialShareBar({ 
  productName, 
  productImage, 
  productPrice,
  productId,
  floristName 
}: SocialSharingProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const shareUrl = `https://blomm-daya.app/flower/${productId}`;
  const shareMessage = floristName 
    ? `${productName} від ${floristName}`
    : productName;

  const shareToFacebook = () => {
    buttonPress();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    Linking.openURL(fbUrl);
  };

  const shareToTelegram = () => {
    buttonPress();
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(tgUrl);
  };

  const copyLink = async () => {
    buttonPress();
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert(t("socialSharing.copied"), t("socialSharing.linkCopied"));
  };

  return (
    <View style={[styles.shareBar, { backgroundColor: colors.card }]}>
      <Text style={[styles.shareBarText, { color: colors.textSecondary }]}>
        {t("socialSharing.share")}:
      </Text>
      
      <TouchableOpacity onPress={shareToFacebook} style={styles.shareBarIcon}>
        <Ionicons name="logo-facebook" size={22} color="#1877F2" />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={shareToTelegram} style={styles.shareBarIcon}>
        <Ionicons name="paper-plane" size={22} color="#0088CC" />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={copyLink} style={styles.shareBarIcon}>
        <Ionicons name="link-outline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
    justifyContent: "center",
  },
  previewName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  shareOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  shareOption: {
    width: "30%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    padding: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  optionText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  shareBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  shareBarText: {
    fontSize: 14,
    marginRight: 12,
  },
  shareBarIcon: {
    marginHorizontal: 8,
    padding: 4,
  },
});
