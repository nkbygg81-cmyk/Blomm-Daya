import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Image,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Filter = 'none' | 'grayscale' | 'sepia' | 'vivid';

interface FloristPhotoEditorProps {
  imageUri?: string;
  onSave: (uri: string) => void;
  onCancel: () => void;
}

export function FloristPhotoEditor({ imageUri, onSave, onCancel }: FloristPhotoEditorProps) {
  const [currentImage, setCurrentImage] = useState<string | null>(imageUri || null);
  const [filter, setFilter] = useState<Filter>('none');
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Потрібен дозвіл', 'Надайте доступ до галереї для вибору фото');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCurrentImage(result.assets[0].uri);
      resetEdits();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Потрібен дозвіл', 'Надайте доступ до камери');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCurrentImage(result.assets[0].uri);
      resetEdits();
    }
  };

  const resetEdits = () => {
    setFilter('none');
    setBrightness(1);
    setContrast(1);
    setRotation(0);
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const applyFilter = (newFilter: Filter) => {
    setFilter(newFilter);
  };

  const saveImage = async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    try {
      const actions: ImageManipulator.Action[] = [];

      // Apply rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Process image
      const result = await ImageManipulator.manipulateAsync(
        currentImage,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      onSave(result.uri);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Помилка', 'Не вдалося обробити зображення');
    } finally {
      setIsProcessing(false);
    }
  };

  const FILTERS: { id: Filter; label: string; style?: object }[] = [
    { id: 'none', label: 'Оригінал' },
    { id: 'grayscale', label: 'Ч/Б', style: { filter: 'grayscale(1)' } },
    { id: 'sepia', label: 'Сепія', style: { filter: 'sepia(1)' } },
    { id: 'vivid', label: 'Яскраво', style: { filter: 'saturate(1.5)' } },
  ];

  return (
    <View style={styles.container} data-testid="florist-photo-editor">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} data-testid="cancel-btn">
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактор фото</Text>
        <TouchableOpacity 
          onPress={saveImage} 
          disabled={!currentImage || isProcessing}
          data-testid="save-btn"
        >
          <Text style={[styles.saveText, (!currentImage || isProcessing) && styles.saveTextDisabled]}>
            {isProcessing ? 'Обробка...' : 'Зберегти'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      <View style={styles.imageContainer}>
        {currentImage ? (
          <Image
            source={{ uri: currentImage }}
            style={[
              styles.image,
              {
                transform: [
                  { rotate: `${rotation}deg` },
                  { scale: scale },
                  { translateX: translateX },
                  { translateY: translateY },
                ],
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={80} color="#666" />
            <Text style={styles.placeholderText}>Оберіть або зробіть фото</Text>
          </View>
        )}
      </View>

      {/* Tools */}
      <View style={styles.tools}>
        {/* Source buttons */}
        <View style={styles.sourceButtons}>
          <TouchableOpacity style={styles.sourceButton} onPress={pickImage} data-testid="pick-image-btn">
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.sourceButtonText}>Галерея</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sourceButton} onPress={takePhoto} data-testid="take-photo-btn">
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.sourceButtonText}>Камера</Text>
          </TouchableOpacity>
        </View>

        {/* Edit tools */}
        {currentImage && (
          <>
            <View style={styles.editTools}>
              <TouchableOpacity style={styles.toolButton} onPress={rotateImage} data-testid="rotate-btn">
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.toolButtonText}>Повернути</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={zoomIn} data-testid="zoom-in-btn">
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.toolButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={zoomOut} data-testid="zoom-out-btn">
                <Ionicons name="remove-circle" size={24} color="#fff" />
                <Text style={styles.toolButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={resetEdits} data-testid="reset-btn">
                <Ionicons name="refresh-circle" size={24} color="#fff" />
                <Text style={styles.toolButtonText}>Скинути</Text>
              </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
              <Text style={styles.filtersLabel}>Фільтри:</Text>
              <View style={styles.filters}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.filterButton, filter === f.id && styles.filterButtonActive]}
                    onPress={() => applyFilter(f.id)}
                    data-testid={`filter-${f.id}-btn`}
                  >
                    <Text style={[styles.filterButtonText, filter === f.id && styles.filterButtonTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
  },
  saveTextDisabled: {
    color: '#666',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  placeholder: {
    alignItems: 'center',
    gap: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  tools: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  sourceButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  sourceButton: {
    alignItems: 'center',
    gap: 4,
  },
  sourceButtonText: {
    fontSize: 12,
    color: '#fff',
  },
  editTools: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  toolButton: {
    alignItems: 'center',
    gap: 4,
  },
  toolButtonText: {
    fontSize: 11,
    color: '#fff',
  },
  filtersContainer: {
    marginTop: 8,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#ccc',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default FloristPhotoEditor;
