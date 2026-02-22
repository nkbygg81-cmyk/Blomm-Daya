import { useState, useRef, useCallback } from "react";
import {
View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
Dimensions, Modal, SafeAreaView,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, radius, shadows } from "../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../lib/i18n/useTranslation";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Story = {
id: string;
floristId: string;
floristName: string | null;
floristCity: string | null;
imageUrl: string;
caption: string | null;
createdAt: number;
};

type FloristGroup = {
floristId: string;
floristName: string;
floristCity: string;
stories: Story[];
};

type Props = {
onFloristPress?: (floristId: string) => void;
};

export function FloristStoriesBar({ onFloristPress }: Props) {
const stories = useQuery(api.floristStories.listActive, {});
const [viewerOpen, setViewerOpen] = useState(false);
const [selectedGroup, setSelectedGroup] = useState<FloristGroup | null>(null);
const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
const { t } = useTranslation();

// Group stories by florist
const groups: FloristGroup[] = [];
if (stories) {
const map = new Map<string, FloristGroup>();
for (const s of stories) {
const existing = map.get(s.floristId);
if (existing) {
existing.stories.push(s as any);
} else {
map.set(s.floristId, {
floristId: s.floristId,
floristName: s.floristName ?? t("stories.florist"),
floristCity: s.floristCity ?? "",
stories: [s as any],
});
}
}
groups.push(...map.values());
}

if (groups.length === 0) return null;

const openStory = (group: FloristGroup) => {
setSelectedGroup(group);
setCurrentStoryIdx(0);
setViewerOpen(true);
};

const nextStory = () => {
if (!selectedGroup) return;
if (currentStoryIdx < selectedGroup.stories.length - 1) {
setCurrentStoryIdx(currentStoryIdx + 1);
} else {
setViewerOpen(false);
}
};

const prevStory = () => {
if (currentStoryIdx > 0) {
setCurrentStoryIdx(currentStoryIdx - 1);
}
};

const timeAgo = (timestamp: number) => {
const diff = Date.now() - timestamp;
const hours = Math.floor(diff / (1000 * 60 * 60));
if (hours < 1) return t("stories.justNow");
return t("stories.hoursAgo", { hours: String(hours) });
};

return (
<>
<FlatList
horizontal
data={groups}
keyExtractor={(g) => g.floristId}
showsHorizontalScrollIndicator={false}
contentContainerStyle={styles.storiesContainer}
renderItem={({ item }) => (
<TouchableOpacity style={styles.storyAvatar} onPress={() => openStory(item)}>
<View style={styles.storyRing}>
<Image
source={{ uri: item.stories[0].imageUrl }}
style={styles.storyImage}
/>
</View>
<Text style={styles.storyName} numberOfLines={1}>
{item.floristName}
</Text>
</TouchableOpacity>
)}
/>

{/* Story Viewer Modal */}
<Modal visible={viewerOpen} animationType="fade" onRequestClose={() => setViewerOpen(false)}>
<SafeAreaView style={styles.viewerContainer}>
{selectedGroup && selectedGroup.stories[currentStoryIdx] && (
<>
{/* Progress bars */}
<View style={styles.progressContainer}>
{selectedGroup.stories.map((_, idx) => (
<View
key={idx}
style={[
styles.progressBar,
{ backgroundColor: idx <= currentStoryIdx ? colors.white : "rgba(255,255,255,0.3)" },
]}
/>
))}
</View>

{/* Header */}
<View style={styles.viewerHeader}>
<View style={styles.viewerFloristInfo}>
<View style={styles.viewerAvatarSmall}>
<Ionicons name="flower" size={16} color={colors.primary} />
</View>
<View>
<Text style={styles.viewerName}>{selectedGroup.floristName}</Text>
<Text style={styles.viewerTime}>
{timeAgo(selectedGroup.stories[currentStoryIdx].createdAt)}
</Text>
</View>
</View>
<TouchableOpacity onPress={() => setViewerOpen(false)}>
<Ionicons name="close" size={28} color={colors.white} />
</TouchableOpacity>
</View>

{/* Image */}
<Image
source={{ uri: selectedGroup.stories[currentStoryIdx].imageUrl }}
style={styles.viewerImage}
resizeMode="cover"
/>

{/* Caption */}
{selectedGroup.stories[currentStoryIdx].caption && (
<View style={styles.captionContainer}>
<Text style={styles.captionText}>
{selectedGroup.stories[currentStoryIdx].caption}
</Text>
</View>
)}

{/* Tap zones */}
<View style={styles.tapZones}>
<TouchableOpacity style={styles.tapLeft} onPress={prevStory} />
<TouchableOpacity style={styles.tapRight} onPress={nextStory} />
</View>
</>
)}
</SafeAreaView>
</Modal>
</>
);
}

const styles = StyleSheet.create({
storiesContainer: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
gap: spacing.md,
},
storyAvatar: {
alignItems: "center",
width: 72,
},
storyRing: {
width: 64,
height: 64,
borderRadius: 32,
borderWidth: 3,
borderColor: colors.primary,
padding: 2,
marginBottom: 4,
},
storyImage: {
width: "100%",
height: "100%",
borderRadius: 28,
},
storyName: {
fontSize: 11,
color: colors.text,
textAlign: "center",
},
viewerContainer: {
flex: 1,
backgroundColor: "#000",
},
progressContainer: {
flexDirection: "row",
paddingHorizontal: spacing.md,
paddingTop: spacing.sm,
gap: 4,
},
progressBar: {
flex: 1,
height: 3,
borderRadius: 2,
},
viewerHeader: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
},
viewerFloristInfo: {
flexDirection: "row",
alignItems: "center",
gap: spacing.sm,
},
viewerAvatarSmall: {
width: 32,
height: 32,
borderRadius: 16,
backgroundColor: colors.primaryLight,
justifyContent: "center",
alignItems: "center",
},
viewerName: {
fontSize: 14,
fontWeight: "700",
color: colors.white,
},
viewerTime: {
fontSize: 11,
color: "rgba(255,255,255,0.7)",
},
viewerImage: {
flex: 1,
width: SCREEN_WIDTH,
borderRadius: 0,
},
captionContainer: {
padding: spacing.lg,
backgroundColor: "rgba(0,0,0,0.5)",
position: "absolute",
bottom: 0,
left: 0,
right: 0,
},
captionText: {
fontSize: 15,
color: colors.white,
lineHeight: 22,
},
tapZones: {
...StyleSheet.absoluteFillObject,
flexDirection: "row",
top: 80,
},
tapLeft: { flex: 1 },
tapRight: { flex: 2 },
});

export default FloristStoriesBar;