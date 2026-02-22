import { useRef, useState } from "react";
import {
StyleSheet,
Text,
View,
Dimensions,
TouchableOpacity,
FlatList,
Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../lib/theme";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";

const { width } = Dimensions.get("window");

type Slide = {
icon: string;
iconColor: string;
bgAccent: string;
titleKey: string;
subtitleKey: string;
};

const slides: Slide[] = [
{
icon: "flower-outline",
iconColor: colors.primary,
bgAccent: colors.primaryLight,
titleKey: "onboarding.slide1Title",
subtitleKey: "onboarding.slide1Subtitle",
},
{
icon: "chatbubbles-outline",
iconColor: colors.success,
bgAccent: "#D1FAE5",
titleKey: "onboarding.slide2Title",
subtitleKey: "onboarding.slide2Subtitle",
},
{
icon: "cart-outline",
iconColor: colors.info,
bgAccent: "#DBEAFE",
titleKey: "onboarding.slide3Title",
subtitleKey: "onboarding.slide3Subtitle",
},
];

type Props = {
onDone: () => void;
};

export function OnboardingScreen({ onDone }: Props) {
const { t } = useTranslation();
const insets = useSafeAreaInsets();
const [currentIndex, setCurrentIndex] = useState(0);
const flatListRef = useRef<any>(null);
const scrollX = useRef(new Animated.Value(0)).current;

const isLast = currentIndex === slides.length - 1;

const handleNext = () => {
buttonPress();
if (isLast) {
onDone();
} else {
flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
}
};

const handleSkip = () => {
buttonPress();
onDone();
};

const renderSlide = ({ item }: { item: Slide }) => (
<View style={[slideStyles.container, { width }]}>
<View style={[slideStyles.iconCircle, { backgroundColor: item.bgAccent }]}>
<Ionicons name={item.icon as any} size={80} color={item.iconColor} />
</View>
<Text style={slideStyles.title}>{t(item.titleKey)}</Text>
<Text style={slideStyles.subtitle}>{t(item.subtitleKey)}</Text>
</View>
);

return (
<View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
{/* Skip button */}
{!isLast && (
<TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
<Text style={styles.skipText}>{t("onboarding.skip")}</Text>
</TouchableOpacity>
)}

{/* Slides */}
<FlatList
ref={flatListRef}
data={slides}
renderItem={renderSlide}
horizontal
pagingEnabled
showsHorizontalScrollIndicator={false}
keyExtractor={(_: any, i: number) => String(i)}
onScroll={Animated.event(
[{ nativeEvent: { contentOffset: { x: scrollX } } }],
{ useNativeDriver: false }
)}
onMomentumScrollEnd={(e: any) => {
const idx = Math.round(e.nativeEvent.contentOffset.x / width);
setCurrentIndex(idx);
}}
/>

{/* Dots */}
<View style={styles.dotsContainer}>
{slides.map((item: Slide, i: number) => {
const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
const dotWidth = scrollX.interpolate({
inputRange,
outputRange: [8, 24, 8],
extrapolate: "clamp",
});
const opacity = scrollX.interpolate({
inputRange,
outputRange: [0.3, 1, 0.3],
extrapolate: "clamp",
});
return (
<Animated.View
key={i}
style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
/>
);
})}
</View>

{/* Button */}
<View style={styles.buttonContainer}>
<TouchableOpacity style={styles.nextButton} onPress={handleNext}>
<Text style={styles.nextButtonText}>
{isLast ? t("onboarding.getStarted") : t("onboarding.next")}
</Text>
<Ionicons
name={isLast ? "checkmark" : "arrow-forward"}
size={20}
color="#fff"
/>
</TouchableOpacity>
</View>
</View>
);
}

const slideStyles = StyleSheet.create({
container: {
flex: 1,
alignItems: "center",
justifyContent: "center",
paddingHorizontal: spacing.xl * 2,
},
iconCircle: {
width: 160,
height: 160,
borderRadius: 80,
alignItems: "center",
justifyContent: "center",
marginBottom: spacing.xl * 2,
},
title: {
fontSize: 26,
fontWeight: "700",
color: colors.text,
textAlign: "center",
marginBottom: spacing.md,
lineHeight: 34,
},
subtitle: {
fontSize: 16,
color: colors.muted,
textAlign: "center",
lineHeight: 24,
},
});

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.bg,
},
skipButton: {
position: "absolute",
top: 60,
right: spacing.xl,
zIndex: 10,
padding: spacing.sm,
},
skipText: {
fontSize: 16,
color: colors.muted,
fontWeight: "500",
},
dotsContainer: {
flexDirection: "row",
justifyContent: "center",
alignItems: "center",
marginBottom: spacing.xl,
gap: 6,
},
dot: {
height: 8,
borderRadius: 4,
},
buttonContainer: {
paddingHorizontal: spacing.xl,
marginBottom: spacing.xl,
},
nextButton: {
backgroundColor: colors.primary,
paddingVertical: spacing.lg,
borderRadius: radius.lg,
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
gap: spacing.sm,
},
nextButtonText: {
color: "#fff",
fontSize: 18,
fontWeight: "700",
},
});