import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConvexProvider,ConvexReactClient,useMutation,useQuery } from "convex/react";

import { colors, spacing } from "./lib/theme";
import { CartProvider } from "./lib/CartContext";
import { registerForPushNotificationsAsync } from "./lib/notifications";
import { getBuyerDeviceId } from "./lib/buyerDeviceId";
import { initializeI18n } from "./lib/i18n";
import { useTranslation } from "./lib/i18n/useTranslation";
import { buttonPress } from "./lib/haptics";
import { OfflineBanner } from "./lib/OfflineBanner";

import { api } from "./convex/_generated/api";

import { BuyerAuthScreen } from "./screens/BuyerAuthScreen";
import { BrowseScreen } from "./screens/BrowseScreen";
import { FlowerDetailScreen } from "./screens/FlowerDetailScreen";
import { CartScreen } from "./screens/CartScreen";
import { CheckoutScreen } from "./screens/CheckoutScreen";
import { OrderHistoryScreen } from "./screens/OrderHistoryScreen";
import { RemindersScreen } from "./screens/RemindersScreen";
import { BuyerSettingsScreen } from "./screens/BuyerSettingsScreen";
import { BuyerProfileScreen } from "./screens/BuyerProfileScreen";
import { FloristSelectionScreen } from "./screens/FloristSelectionScreen";
import { ConsultationChatScreen } from "./screens/ConsultationChatScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AIRecommendationScreen } from "./screens/AIRecommendationScreen";

import { FloristAuthScreen } from "./screens/FloristAuthScreen";
import { FloristRegistrationScreen } from "./screens/FloristRegistrationScreen";
import { FloristDashboardScreen } from "./screens/FloristDashboardScreen";
import { FloristOrdersScreen } from "./screens/FloristOrdersScreen";
import { FloristSettingsScreen } from "./screens/FloristSettingsScreen";
import { FloristPaymentsScreen } from "./screens/FloristPaymentsScreen";
import { FloristNotificationsScreen } from "./screens/FloristNotificationsScreen";
import { FloristReviewsScreen } from "./screens/FloristReviewsScreen";
import { FloristConsultationsScreen } from "./screens/FloristConsultationsScreen";
import { FloristProfileScreen } from "./screens/FloristProfileScreen";
import { FloristFinancialReportsScreen } from "./screens/FloristFinancialReportsScreen";
import { FloristCalendarScreen } from "./screens/FloristCalendarScreen";
import { SubscriptionScreen } from "./screens/SubscriptionScreen";
import { FlowerCareTipsScreen } from "./screens/FlowerCareTipsScreen";
import { LoyaltyScreen } from "./screens/LoyaltyScreen";
import { FloristStoriesManageScreen } from "./screens/FloristStoriesManageScreen";

// Note: Hardcoded for Expo Go compatibility. 
// For production builds with environment variables, use EAS Build.
const convex = new ConvexReactClient("https://little-coyote-905.convex.cloud");
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function RoleSelectionScreen({
  onSelectRole,
}: {
  onSelectRole: (role: "buyer" | "florist") => void;
}) {
  const { t } = useTranslation();
  
  return (
    <View style={styles.roleSelection}>
      <Text style={styles.roleTitle}>{t("app.title")}</Text>
      <Text style={styles.roleSubtitle}>{t("role.selectTitle")}</Text>

      <TouchableOpacity
        style={[styles.roleButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          buttonPress();
          onSelectRole("buyer");
        }}
      >
        <Ionicons name="flower-outline" size={48} color="#fff" />
        <Text style={styles.roleButtonText}>{t("role.buyer")}</Text>
        <Text style={styles.roleButtonSubtext}>{t("role.buyerSubtext")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.roleButton, { backgroundColor: colors.success }]}
        onPress={() => {
          buttonPress();
          onSelectRole("florist");
        }}
      >
        <Ionicons name="storefront-outline" size={48} color="#fff" />
        <Text style={styles.roleButtonText}>{t("role.florist")}</Text>
        <Text style={styles.roleButtonSubtext}>{t("role.floristSubtext")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ShopStack() {
  const [selectedFlower, setSelectedFlower] = useState<any>(null);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Browse">
        {({ navigation }: { navigation: any }) => (
          <BrowseScreen
            onFlowerPress={(flower) => {
              setSelectedFlower(flower);
              navigation.navigate("FlowerDetail");
            }}
            onAIPress={() => navigation.navigate("AIRecommendation")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FlowerDetail">
        {({ navigation }: { navigation: any }) =>
          selectedFlower ? (
            <FlowerDetailScreen
              flower={selectedFlower}
              onBack={() => {
                setSelectedFlower(null);
                navigation.goBack();
              }}
            />
          ) : (
            <View />
          )
        }
      </Stack.Screen>
      <Stack.Screen name="AIRecommendation">
        {({ navigation }: { navigation: any }) => (
          <AIRecommendationScreen
            onBack={() => navigation.goBack()}
            onFlowerPress={(flower) => {
              setSelectedFlower(flower);
              navigation.navigate("FlowerDetail");
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartMain">
        {({ navigation }: { navigation: any }) => (
          <CartScreen onCheckout={() => navigation.navigate("Checkout")} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Checkout">
        {({ navigation }: { navigation: any }) => (
          <CheckoutScreen
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function OrdersStack() {
  const [careTipsFlowers, setCareTipsFlowers] = useState<string[]>([]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersMain">
        {({ navigation }: { navigation: any }) => (
          <OrderHistoryScreen
            onCareTips={(flowerNames: string[]) => {
              setCareTipsFlowers(flowerNames);
              navigation.navigate("CareTips");
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CareTips">
        {({ navigation }: { navigation: any }) => (
          <FlowerCareTipsScreen
            flowerNames={careTipsFlowers}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function ProfileScreenWrapper({ authToken, onBack }: { authToken: string; onBack: () => void }) {
  const { t } = useTranslation();
  const buyer = useQuery(api.buyerAuth.getCurrentBuyer, { token: authToken });
  
  if (!buyer) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return <BuyerProfileScreen buyerId={buyer.id} buyer={buyer} onBack={onBack} />;
}

function FloristsStack({ authToken }: { authToken: string }) {
  const { t } = useTranslation();
  const buyer = useQuery(api.buyerAuth.getCurrentBuyer, { token: authToken });
  const [buyerDeviceId, setBuyerDeviceId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const id = await getBuyerDeviceId();
      setBuyerDeviceId(id);
    })();
  }, []);
  
  if (!buyer || !buyerDeviceId) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FloristsMain">
        {({ navigation }: { navigation: any }) => (
          <FloristSelectionScreen
            buyerId={buyer.id}
            buyerName={buyer.name}
            buyerDeviceId={buyerDeviceId}
            onBack={() => {}}
            onConsultationStarted={(consultationId) => {
              navigation.navigate("ConsultationChat", { consultationId });
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ConsultationChat">
        {({ route, navigation }: any) => (
          <ConsultationChatScreen
            consultationId={route.params.consultationId}
            buyerId={buyer.id}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function SettingsStack({ onLogout, authToken }: { onLogout: () => void; authToken: string }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain">
        {({ navigation }: { navigation: any }) => (
          <BuyerSettingsScreen
            onLogout={onLogout}
            authToken={authToken}
            onProfilePress={() => navigation.navigate("Profile")}
            onNotificationsPress={() => navigation.navigate("Notifications")}
            onSubscriptionPress={() => navigation.navigate("Subscription")}
            onLoyaltyPress={() => navigation.navigate("Loyalty")}
            onFloristsPress={() => navigation.navigate("Florists")}
            onRemindersPress={() => navigation.navigate("Reminders")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Profile">
        {({ navigation }: { navigation: any }) => (
          <ProfileScreenWrapper
            authToken={authToken}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications">
        {({ navigation }: { navigation: any }) => (
          <NotificationsScreen
            onBack={() => navigation.goBack()}
            onNotificationPress={(data: any) => {
              const type = String(data?.type ?? "");
              if (type === "order_status") {
                const parent = navigation.getParent?.();
                if (parent) parent.navigate("Orders");
              }
              navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Subscription">
        {({ navigation }: { navigation: any }) => (
          <SubscriptionScreen onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Loyalty">
        {({ navigation }: { navigation: any }) => (
          <LoyaltyScreen onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Florists" options={{ headerShown: true, title: "" }}>
        {() => <FloristsStack authToken={authToken} />}
      </Stack.Screen>
      <Stack.Screen name="Reminders" options={{ headerShown: true, title: "" }}>
        {({ navigation }: { navigation: any }) => (
          <RemindersScreen />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function BuyerTabs({ onLogout, authToken }: { onLogout: () => void; authToken: string }) {
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const name =
            route.name === "Shop"
              ? "flower-outline"
              : route.name === "Cart"
                ? "cart-outline"
                : route.name === "Orders"
                  ? "receipt-outline"
                  : "settings-outline";
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Shop" component={ShopStack} options={{ title: t("tabs.shop") }} />
      <Tab.Screen name="Cart" component={CartStack} options={{ title: t("tabs.cart") }} />
      <Tab.Screen
        name="Orders"
        component={OrdersStack}
        options={{ title: t("tabs.orders") }}
      />
      <Tab.Screen name="Settings" options={{ title: t("tabs.settings"), headerShown: false }}>
        {() => <SettingsStack onLogout={onLogout} authToken={authToken} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function FloristOrdersTab({ route }: { route?: any }) {
  const [floristId, setFloristId] = useState<string | null>(null);
  const { t } = useTranslation();
  const initialStatus = route?.params?.initialStatus as string | undefined;

  useEffect(() => {
    AsyncStorage.getItem("floristId").then((id: any) => setFloristId(id));
  }, []);

  if (!floristId) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return <FloristOrdersScreen floristId={floristId} initialStatus={initialStatus} />;
}

function FloristDashboardTab({ navigation }: { navigation: any }) {
  const [floristId, setFloristId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    AsyncStorage.getItem("floristId").then((id: any) => setFloristId(id));
  }, []);

  if (!floristId) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <FloristDashboardScreen
      floristId={floristId}
      onNavigateToOrders={(status?: string) => {
        navigation.navigate("Orders", status ? { initialStatus: status } : undefined);
      }}
    />
  );
}

function FloristSettingsStack({ onLogout, floristId }: { onLogout: () => void; floristId: string }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain">
        {({ navigation }: { navigation: any }) => (
          <FloristSettingsScreen
            onLogout={onLogout}
            onProfilePress={() => navigation.navigate("FloristProfile")}
            onFinancialReportsPress={() => navigation.navigate("FinancialReports")}
            onCalendarPress={() => navigation.navigate("Calendar")}
            onStoriesPress={() => navigation.navigate("Stories")}
            onNotificationsPress={() => navigation.navigate("FloristNotifications")}
            onReviewsPress={() => navigation.navigate("FloristReviews")}
            onPaymentsPress={() => navigation.navigate("FloristPayments")}
            floristId={floristId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FloristProfile">
        {({ navigation }: { navigation: any }) => (
          <FloristProfileScreen
            floristId={floristId}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FinancialReports">
        {({ navigation }: { navigation: any }) => (
          <FloristFinancialReportsScreen floristId={floristId} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Calendar">
        {({ navigation }: { navigation: any }) => (
          <FloristCalendarScreen floristId={floristId} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Stories">
        {({ navigation }: { navigation: any }) => (
          <FloristStoriesManageScreen floristId={floristId} onBack={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="FloristNotifications" options={{ headerShown: true, title: "" }}>
        {() => <FloristNotificationsScreen floristId={floristId} />}
      </Stack.Screen>
      <Stack.Screen name="FloristReviews" options={{ headerShown: true, title: "" }}>
        {() => <FloristReviewsScreen floristId={floristId} />}
      </Stack.Screen>
      <Stack.Screen name="FloristPayments" options={{ headerShown: true, title: "" }}>
        {() => <FloristPaymentsScreen floristId={floristId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function FloristTabs({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [floristId, setFloristId] = useState<string | null>(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("floristId").then((id: any) => setFloristId(id));
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const name =
            route.name === "Dashboard"
              ? "stats-chart-outline"
              : route.name === "Orders"
                ? "list-outline"
                : route.name === "Consultations"
                  ? "chatbubble-outline"
                  : "settings-outline";
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={FloristDashboardTab} options={{ title: t("tabs.dashboard") }} />
      <Tab.Screen name="Orders" component={FloristOrdersTab} options={{ title: t("tabs.orders") }} />
      <Tab.Screen
        name="Consultations"
        options={{ title: t("tabs.consultations"), headerShown: false }}
      >
        {({ navigation }: { navigation: any }) =>
          floristId ? (
            selectedConsultationId ? (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="ConsultationDetail"
                  options={{ animationEnabled: false }}
                >
                  {() => (
                    <ConsultationChatScreen
                      consultationId={selectedConsultationId as any}
                      buyerId={null as any}
                      onBack={() => setSelectedConsultationId(null)}
                      isFlorist={true}
                      floristId={floristId}
                    />
                  )}
                </Stack.Screen>
              </Stack.Navigator>
            ) : (
              <FloristConsultationsScreen
                floristId={floristId}
                onConsultationPress={(consultationId) => {
                  setSelectedConsultationId(String(consultationId));
                }}
              />
            )
          ) : (
            <View />
          )
        }
      </Tab.Screen>
      <Tab.Screen name="Settings" options={{ title: t("tabs.settings"), headerShown: false }}>
        {() => floristId ? <FloristSettingsStack onLogout={onLogout} floristId={floristId} /> : <View />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppContent() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [floristToken, setFloristToken] = useState<string | null>(null);
  const [floristId, setFloristId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"buyer" | "florist" | null>(null);
  const [showFloristRegistration, setShowFloristRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true); // default true to avoid flash
  const { t } = useTranslation();

  const registerPushToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        await initializeI18n();
        const buyerToken = await AsyncStorage.getItem("buyerAuthToken");
        const floristTok = await AsyncStorage.getItem("floristToken");
        const storedFloristId = await AsyncStorage.getItem("floristId");
        const role = await AsyncStorage.getItem("userRole");
        const onboardingSeen = await AsyncStorage.getItem("hasSeenOnboarding");

        setAuthToken(buyerToken);
        setFloristToken(floristTok);
        setFloristId(storedFloristId);
        setUserRole(role as any);
        setHasSeenOnboarding(onboardingSeen === "true");
      } catch (e) {
        console.error("Failed to restore auth:", e);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreAuth();
  }, []);

  const registerPushForBuyer = useCallback(
    async (_buyerAuthToken: string) => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;

      const buyerDeviceId = await getBuyerDeviceId();
      await registerPushToken({
        userId: buyerDeviceId,
        userType: "buyer",
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });
    },
    [registerPushToken]
  );

  const registerPushForFlorist = useCallback(
    async (_floristToken: string, id: string) => {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;

      await registerPushToken({
        userId: id,
        userType: "florist",
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });
    },
    [registerPushToken]
  );

  useEffect(() => {
    const maybeRegisterPush = async () => {
      if (!userRole) return;

      try {
        if (userRole === "buyer") {
          if (!authToken) return;
          await registerPushForBuyer(authToken);
          return;
        }

        if (!floristToken) return;
        if (!floristId) return;
        await registerPushForFlorist(floristToken, floristId);
      } catch (e: any) {
        console.warn("Push registration failed", e);
        // Surface the error so users/support can diagnose push issues
        const msg = String(e?.message ?? e ?? "Unknown error");
        if (Platform.OS === "android" && /firebase/i.test(msg)) {
          // Don't spam the user on every app launch — show once per session
          Alert.alert(
            "Push notifications unavailable",
            "FCM is not configured in this build. Push notifications require a new native build (APK) with Firebase enabled. OTA updates cannot fix this.\n\nPlease create a new Android build from the a0 dashboard.",
          );
        }
      }
    };

    void maybeRegisterPush();
  }, [authToken, floristToken, floristId, userRole, registerPushForBuyer, registerPushForFlorist]);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    setHasSeenOnboarding(true);
  };

  const handleBuyerLoggedIn = async (token: string) => {
    await AsyncStorage.setItem("buyerAuthToken", token);
    await AsyncStorage.setItem("userRole", "buyer");
    setAuthToken(token);
    setUserRole("buyer");

    try {
      await registerPushForBuyer(token);
    } catch (e) {
      console.warn("Buyer push registration failed", e);
    }
  };

  const handleBuyerLogout = async () => {
    try {
      await AsyncStorage.removeItem("buyerAuthToken");
      await AsyncStorage.removeItem("userRole");
    } finally {
      setAuthToken(null);
      setUserRole(null);
    }
  };

  const handleFloristLoggedIn = async (token: string, id: string) => {
    await AsyncStorage.setItem("floristToken", token);
    await AsyncStorage.setItem("floristId", id);
    await AsyncStorage.setItem("userRole", "florist");
    setFloristToken(token);
    setFloristId(id);
    setUserRole("florist");

    try {
      await registerPushForFlorist(token, id);
    } catch (e) {
      console.warn("Florist push registration failed", e);
    }
  };

  const handleFloristLogout = async () => {
    try {
      await AsyncStorage.removeItem("floristToken");
      await AsyncStorage.removeItem("floristId");
      await AsyncStorage.removeItem("userRole");
    } finally {
      setFloristToken(null);
      setFloristId(null);
      setUserRole(null);
    }
  };

  const handleSelectRole = (role: "buyer" | "florist") => {
    setUserRole(role);
  };

  const handleBackToBuyer = () => {
    setUserRole(null);
    setShowFloristRegistration(false);
  };

  const handleShowRegistration = () => {
    setShowFloristRegistration(true);
  };

  const handleRegistrationBack = () => {
    setShowFloristRegistration(false);
  };

  const handleRegistrationSuccess = () => {
    setShowFloristRegistration(false);
    Alert.alert(
      t("florist.registration.success"),
      t("florist.registration.successMessage")
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!hasSeenOnboarding ? (
        <OnboardingScreen onDone={handleOnboardingDone} />
      ) : !userRole ? (
        <RoleSelectionScreen onSelectRole={handleSelectRole} />
      ) : userRole === "buyer" ? (
        authToken ? (
          <BuyerTabs onLogout={handleBuyerLogout} authToken={authToken} />
        ) : (
          <BuyerAuthScreen onLoggedIn={handleBuyerLoggedIn} onBack={() => setUserRole(null)} />
        )
      ) : showFloristRegistration ? (
        <FloristRegistrationScreen
          onBack={handleRegistrationBack}
          onSuccess={handleRegistrationSuccess}
        />
      ) : floristToken ? (
        <FloristTabs onLogout={handleFloristLogout} />
      ) : (
        <FloristAuthScreen
          onLoggedIn={handleFloristLoggedIn}
          onBackToBuyer={handleBackToBuyer}
          onRegister={handleShowRegistration}
        />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ConvexProvider client={convex}>
    <SafeAreaProvider style={styles.safeArea}>
      <CartProvider>
        <AppContent />
      </CartProvider>
      <OfflineBanner />
    </SafeAreaProvider>
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
  },
  roleSelection: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.xl,
  },
  roleTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  roleSubtitle: {
    fontSize: 18,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  roleButton: {
    width: "100%",
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    gap: spacing.sm,
  },
  roleButtonText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  roleButtonSubtext: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
});