import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../convex/_generated/dataModel";
import { useTranslation } from "../lib/i18n/useTranslation";

type Props = {
  consultationId: Id<"consultations">;
  buyerId: Id<"buyers"> | null;
  onBack: () => void;
  onFlowerPress?: (flowerId: string) => void;
  isFlorist?: boolean;
  floristId?: string;
};

export function ConsultationChatScreen({ consultationId, buyerId, onBack, onFlowerPress, isFlorist, floristId }: Props) {
  const messages = useQuery(api.consultations.getMessages, { consultationId });
  const sendMessage = useMutation(api.consultations.sendMessage);
  const markAsRead = useMutation(api.consultations.markAsRead);
  const { t } = useTranslation();

  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages && messages.length > 0) {
      flatListRef.current?.scrollToEnd();
      // Mark messages as read
      markAsRead({ consultationId, senderType: isFlorist ? "florist" : "buyer" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim()) return;

    try {
      const senderId = isFlorist ? `florist:${floristId}` : `buyer:${buyerId}`;
      const senderType = isFlorist ? "florist" : "buyer";
      
      await sendMessage({
        consultationId,
        senderId,
        senderType,
        message: messageText.trim(),
      });
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMine = isFlorist
      ? item.senderType === "florist"
      : item.senderType === "buyer";

    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.messageBubbleSent : styles.messageBubbleReceived,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isMine && styles.messageTextSent,
          ]}
        >
          {item.message}
        </Text>

        {/* If florist suggests a flower */}
        {item.flowerId && onFlowerPress && (
          <TouchableOpacity
            style={styles.flowerSuggestion}
            onPress={() => onFlowerPress(item.flowerId)}
          >
            <Ionicons name="flower" size={16} color={colors.primary} />
            <Text style={styles.flowerSuggestionText}>
              {item.flowerName || t("consultationChat.viewBouquet")}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        <Text
          style={[
            styles.messageTime,
            isMine && styles.messageTimeSent,
          ]}
        >
          {new Date(item.createdAt).toLocaleTimeString(t("dateLocale"), {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{t("consultationChat.title")}</Text>
            <Text style={styles.subtitle}>{isFlorist ? t("consultationChat.chatWithBuyer") : t("consultationChat.chatWithFlorist")}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
              <Text style={styles.emptyText}>{t("consultationChat.startConversation")}</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t("consultationChat.inputPlaceholder")}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <Ionicons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  messageBubbleSent: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
  },
  messageBubbleReceived: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  messageTextSent: {
    color: colors.white,
  },
  flowerSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  flowerSuggestionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  messageTime: {
    fontSize: 11,
    color: colors.muted,
    alignSelf: "flex-end",
  },
  messageTimeSent: {
    color: "rgba(255,255,255,0.8)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});