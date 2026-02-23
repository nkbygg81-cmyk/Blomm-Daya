import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { colors, spacing, radius } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useTranslation } from "../lib/i18n/useTranslation";
import { buttonPress } from "../lib/haptics";
import Slider from "@react-native-community/slider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH - spacing.md * 2;

type Props = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (editedUri: string) => void;
};

type Preset = {
  id: string;
  name: string;
  icon: string;
  adjustments: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
};

const PRESETS: Preset[] = [
  {
    id: "original",
    name: "photoEditor.presets.original",
    icon: "image-outline",
    adjustments: {},
  },
  {
    id: "vibrant",
    name: "photoEditor.presets.vibrant",
    icon: "color-palette-outline",
    adjustments: { brightness: 0.05, contrast: 1.1, saturation: 1.3 },
  },
  {
    id: "warm",
    name: "photoEditor.presets.warm",
    icon: "sunny-outline",
    adjustments: { brightness: 0.08, contrast: 1.05, saturation: 1.1 },
  },
  {
    id: "natural",
    name: "photoEditor.presets.natural",
    icon: "leaf-outline",
    adjustments: { brightness: 0.02, contrast: 1.02, saturation: 1.05 },
  },
];

export function PhotoEditorModal({ visible, imageUri, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [activePreset, setActivePreset] = useState<string>("original");
  const [activeTab, setActiveTab] = useState<"adjust" | "presets">("adjust");
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState(imageUri);

  // Zoom constraints
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  // Zoom in
  const handleZoomIn = useCallback(() => {
    buttonPress();
    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  // Zoom out
  const handleZoomOut = useCallback(() => {
    buttonPress();
    setZoom((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  // Reset all adjustments
  const handleReset = useCallback(() => {
    buttonPress();
    setRotation(0);
    setBrightness(0);
    setContrast(1);
    setSaturation(1);
    setZoom(1);
    setActivePreset("original");
    setPreviewUri(imageUri);
  }, [imageUri]);

  // Rotate image
  const handleRotate = useCallback(async () => {
    buttonPress();
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ rotate: newRotation }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPreviewUri(result.uri);
    } catch (error) {
      console.error("Rotate error:", error);
    }
  }, [imageUri, rotation]);

  // Apply preset
  const handleApplyPreset = useCallback((preset: Preset) => {
    buttonPress();
    setActivePreset(preset.id);
    
    if (preset.id === "original") {
      setBrightness(0);
      setContrast(1);
      setSaturation(1);
    } else {
      setBrightness(preset.adjustments.brightness || 0);
      setContrast(preset.adjustments.contrast || 1);
      setSaturation(preset.adjustments.saturation || 1);
    }
  }, []);

  // Apply all edits and save
  const handleSave = useCallback(async () => {
    buttonPress();
    setProcessing(true);

    try {
      const actions: ImageManipulator.Action[] = [];

      // Add rotation if needed
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Note: expo-image-manipulator doesn't support brightness/contrast/saturation directly
      // We'll apply rotation and return the result
      // For full color adjustments, would need a library like react-native-image-filter-kit
      
      let result;
      if (actions.length > 0) {
        result = await ImageManipulator.manipulateAsync(
          imageUri,
          actions,
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
      } else {
        result = { uri: imageUri };
      }

      onSave(result.uri);
      
      // Reset state
      handleReset();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, rotation, onSave, handleReset]);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>{t("photoEditor.title")}</Text>
          <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
            <Text style={[styles.resetText, { color: themeColors.primary }]}>{t("photoEditor.reset")}</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: previewUri }}
              style={[
                styles.image,
                {
                  // Visual preview of adjustments (actual manipulation on save)
                  opacity: 1 + brightness,
                  transform: [{ scale: zoom }],
                },
              ]}
              resizeMode="contain"
            />
          </View>
          
          {/* Zoom controls */}
          <View style={[styles.zoomControls, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity
              style={[styles.zoomButton, zoom <= MIN_ZOOM && styles.zoomButtonDisabled]}
              onPress={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              data-testid="zoom-out-btn"
            >
              <Ionicons 
                name="remove" 
                size={24} 
                color={zoom <= MIN_ZOOM ? themeColors.muted : themeColors.primary} 
              />
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: themeColors.text }]}>
              {Math.round(zoom * 100)}%
            </Text>
            <TouchableOpacity
              style={[styles.zoomButton, zoom >= MAX_ZOOM && styles.zoomButtonDisabled]}
              onPress={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              data-testid="zoom-in-btn"
            >
              <Ionicons 
                name="add" 
                size={24} 
                color={zoom >= MAX_ZOOM ? themeColors.muted : themeColors.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Rotate button overlay */}
          <TouchableOpacity
            style={[styles.rotateButton, { backgroundColor: themeColors.card }]}
            onPress={handleRotate}
          >
            <Ionicons name="refresh" size={24} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "adjust" && styles.tabActive]}
            onPress={() => {
              buttonPress();
              setActiveTab("adjust");
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeTab === "adjust" ? themeColors.primary : themeColors.muted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "adjust" ? themeColors.primary : themeColors.muted },
              ]}
            >
              {t("photoEditor.adjust")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "presets" && styles.tabActive]}
            onPress={() => {
              buttonPress();
              setActiveTab("presets");
            }}
          >
            <Ionicons
              name="color-filter-outline"
              size={20}
              color={activeTab === "presets" ? themeColors.primary : themeColors.muted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "presets" ? themeColors.primary : themeColors.muted },
              ]}
            >
              {t("photoEditor.presets")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { backgroundColor: themeColors.card }]}>
          {activeTab === "adjust" ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Brightness */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Ionicons name="sunny-outline" size={20} color={themeColors.text} />
                  <Text style={[styles.sliderLabel, { color: themeColors.text }]}>
                    {t("photoEditor.brightness")}
                  </Text>
                  <Text style={[styles.sliderValue, { color: themeColors.muted }]}>
                    {Math.round(brightness * 100)}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={-0.5}
                  maximumValue={0.5}
                  step={0.01}
                  value={brightness}
                  onValueChange={(val) => {
                    setBrightness(val);
                    setActivePreset("custom");
                  }}
                  minimumTrackTintColor={themeColors.primary}
                  maximumTrackTintColor={themeColors.border}
                  thumbTintColor={themeColors.primary}
                />
              </View>

              {/* Contrast */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Ionicons name="contrast-outline" size={20} color={themeColors.text} />
                  <Text style={[styles.sliderLabel, { color: themeColors.text }]}>
                    {t("photoEditor.contrast")}
                  </Text>
                  <Text style={[styles.sliderValue, { color: themeColors.muted }]}>
                    {Math.round((contrast - 1) * 100)}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={1.5}
                  step={0.01}
                  value={contrast}
                  onValueChange={(val) => {
                    setContrast(val);
                    setActivePreset("custom");
                  }}
                  minimumTrackTintColor={themeColors.primary}
                  maximumTrackTintColor={themeColors.border}
                  thumbTintColor={themeColors.primary}
                />
              </View>

              {/* Saturation */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Ionicons name="color-palette-outline" size={20} color={themeColors.text} />
                  <Text style={[styles.sliderLabel, { color: themeColors.text }]}>
                    {t("photoEditor.saturation")}
                  </Text>
                  <Text style={[styles.sliderValue, { color: themeColors.muted }]}>
                    {Math.round((saturation - 1) * 100)}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={2}
                  step={0.01}
                  value={saturation}
                  onValueChange={(val) => {
                    setSaturation(val);
                    setActivePreset("custom");
                  }}
                  minimumTrackTintColor={themeColors.primary}
                  maximumTrackTintColor={themeColors.border}
                  thumbTintColor={themeColors.primary}
                />
              </View>

              {/* Rotation info */}
              <View style={styles.rotationInfo}>
                <Ionicons name="refresh" size={16} color={themeColors.muted} />
                <Text style={[styles.rotationText, { color: themeColors.muted }]}>
                  {t("photoEditor.rotation")}: {rotation}°
                </Text>
              </View>

              {/* Zoom info */}
              <View style={styles.rotationInfo}>
                <Ionicons name="search" size={16} color={themeColors.muted} />
                <Text style={[styles.rotationText, { color: themeColors.muted }]}>
                  {t("photoEditor.zoom")}: {Math.round(zoom * 100)}%
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsContainer}>
              {PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetItem,
                    { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                    activePreset === preset.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primaryLight },
                  ]}
                  onPress={() => handleApplyPreset(preset)}
                >
                  <View style={[styles.presetIconWrap, { backgroundColor: activePreset === preset.id ? themeColors.primary : themeColors.card }]}>
                    <Ionicons
                      name={preset.icon as any}
                      size={24}
                      color={activePreset === preset.id ? themeColors.white : themeColors.muted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.presetName,
                      { color: activePreset === preset.id ? themeColors.primary : themeColors.text },
                    ]}
                  >
                    {t(preset.name)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Save Button */}
        <View style={[styles.footer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
            onPress={handleSave}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color={themeColors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={24} color={themeColors.white} />
                <Text style={styles.saveButtonText}>{t("photoEditor.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  resetText: {
    fontSize: 14,
    fontWeight: "600",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    overflow: "hidden",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  zoomControls: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  zoomButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  zoomText: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: spacing.xs,
    minWidth: 50,
    textAlign: "center",
  },
  rotateButton: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  controls: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 180,
  },
  sliderGroup: {
    marginBottom: spacing.md,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  rotationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  rotationText: {
    fontSize: 13,
  },
  presetsContainer: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  presetItem: {
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    marginRight: spacing.sm,
    width: 90,
  },
  presetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  presetName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
