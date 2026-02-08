import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "./theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "./i18n/useTranslation";

export function OfflineBanner() {
const [isOffline, setIsOffline] = useState(false);
const [slideAnim] = useState(new Animated.Value(-60));
const insets = useSafeAreaInsets();
const { t } = useTranslation();

useEffect(() => {
const unsubscribe = NetInfo.addEventListener((state: any) => {
const offline = !(state.isConnected && state.isInternetReachable !== false);
setIsOffline(offline);
Animated.timing(slideAnim, {
toValue: offline ? 0 : -60,
duration: 300,
useNativeDriver: true,
}).start();
});
return () => unsubscribe();
}, [slideAnim]);

if (!isOffline) return null;

return (
<Animated.View
style={[
styles.banner,
{ paddingTop: insets.top + spacing.sm, transform: [{ translateY: slideAnim }] },
]}
>
<Ionicons name="cloud-offline-outline" size={18} color="#fff" />
<Text style={styles.text}>{t("common.offline")}</Text>
</Animated.View>
);
}

const styles = StyleSheet.create({
banner: {
position: "absolute",
top: 0,
left: 0,
right: 0,
backgroundColor: "#EF4444",
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
gap: spacing.sm,
paddingBottom: spacing.sm,
zIndex: 9999,
},
text: {
color: "#fff",
fontSize: 14,
fontWeight: "600",
},
});

export default OfflineBanner;