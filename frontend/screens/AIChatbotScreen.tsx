import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { colors, spacing, radius } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";
import { getBuyerDeviceId } from "../lib/buyerDeviceId";
import Constants from "expo-constants";

type Props = {
  onBack: () => void;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

const QUICK_QUESTIONS = [
  "Яку квітку подарувати на день народження?",
  "Що означають червоні троянди?",
  "Як доглядати за букетом?",
  "Які квіти підходять для весілля?",
];

export function AIChatbotScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);

  // Get backend URL from environment
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     process.env.EXPO_PUBLIC_BACKEND_URL || 
                     "";

  useEffect(() => {
    // Generate session ID based on device ID
    getBuyerDeviceId().then((deviceId) => {
      setSessionId(`chat_${deviceId}_${Date.now()}`);
    });
  }, []);

  useEffect(() => {
    // Load chat history
    if (sessionId && backendUrl) {
      loadChatHistory();
    }
  }, [sessionId, backendUrl]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/chat/history/${sessionId}`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      }
    } catch (error) {
      console.log("No chat history found");
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !sessionId) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = { 
          role: "assistant", 
          content: data.response 
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = { 
          role: "assistant", 
          content: t("aiChat.errorMessage") 
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = { 
        role: "assistant", 
        content: t("aiChat.networkError") 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const clearChat = async () => {
    if (!sessionId || !backendUrl) return;
    
    try {
      await fetch(`${backendUrl}/api/chat/history/${sessionId}`, {
        method: "DELETE",
      });
      setMessages([]);
      // Generate new session
      const deviceId = await getBuyerDeviceId();
      setSessionId(`chat_${deviceId}_${Date.now()}`);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiAvatar}>
            <Ionicons name="flower" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{t("aiChat.title")}</Text>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Message */}
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIconContainer}>
                <Ionicons name="chatbubble-ellipses" size={48} color={colors.primary} />
              </View>
              <Text style={styles.welcomeTitle}>{t("aiChat.welcomeTitle")}</Text>
              <Text style={styles.welcomeSubtitle}>{t("aiChat.welcomeSubtitle")}</Text>
              
              <Text style={styles.quickQuestionsTitle}>{t("aiChat.quickQuestions")}</Text>
              <View style={styles.quickQuestions}>
                {QUICK_QUESTIONS.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickQuestionButton}
                    onPress={() => handleQuickQuestion(question)}
                  >
                    <Text style={styles.quickQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Message List */}
          {messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                message.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === "assistant" && (
                <View style={styles.assistantIcon}>
                  <Ionicons name="flower" size={14} color="#fff" />
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  message.role === "user" ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.assistantIcon}>
                <Ionicons name="flower" size={14} color="#fff" />
              </View>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.typingText}>{t("aiChat.thinking")}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t("aiChat.inputPlaceholder")}
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() && !isLoading ? "#fff" : colors.muted} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  welcomeContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  welcomeIconContainer: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: 50,
    marginBottom: spacing.sm,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    alignSelf: "flex-start",
  },
  quickQuestions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickQuestionButton: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickQuestionText: {
    fontSize: 14,
    color: colors.text,
  },
  messageBubble: {
    maxWidth: "85%",
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: colors.text,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  typingText: {
    fontSize: 14,
    color: colors.muted,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});
