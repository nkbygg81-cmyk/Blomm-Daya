import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useTheme } from '../lib/ThemeContext';
import { getBuyerDeviceId } from '../lib/buyerDeviceId';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { useTranslation } from '../lib/i18n/useTranslation';

type Props = {
  navigation: any;
};

const HOLIDAY_TYPES = [
  { id: 'national', label: 'Національні свята', labelUk: 'Національні свята', icon: 'flag', emoji: '🇺🇦' },
  { id: 'religious', label: 'Релігійні свята', labelUk: 'Релігійні свята', icon: 'star', emoji: '⭐' },
  { id: 'international', label: 'Міжнародні свята', labelUk: 'Міжнародні свята', icon: 'globe', emoji: '🌍' },
  { id: 'custom', label: 'Інші', labelUk: 'Інші', icon: 'calendar', emoji: '📅' },
];

export default function HolidayRemindersScreen({ navigation }: Props) {
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<string[]>(['national', 'religious', 'international']);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    getBuyerDeviceId().then(setDeviceId);
    registerForPushNotificationsAsync().then(token => {
      if (token) setPushToken(token);
    });
  }, []);

  const subscription = useQuery(
    api.holidayReminders.getSubscription,
    deviceId ? { buyerDeviceId: deviceId } : 'skip'
  );

  const upcomingHolidays = useQuery(api.holidayReminders.getUpcoming, {});

  const subscribeMutation = useMutation(api.holidayReminders.subscribe);
  const unsubscribeMutation = useMutation(api.holidayReminders.unsubscribe);
  const seedHolidaysMutation = useMutation(api.holidayReminders.seedDefaultHolidays);

  // Load existing settings
  useEffect(() => {
    if (subscription) {
      setIsEnabled(subscription.isEnabled);
      setEnabledTypes(subscription.enabledTypes || ['national', 'religious', 'international']);
    }
  }, [subscription]);

  // Seed holidays on first load
  useEffect(() => {
    if (deviceId && upcomingHolidays?.length === 0) {
      seedHolidaysMutation({});
    }
  }, [deviceId, upcomingHolidays]);

  const toggleType = (typeId: string) => {
    setEnabledTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const saveSettings = async () => {
    if (!deviceId) return;
    
    setLoading(true);
    try {
      if (isEnabled && enabledTypes.length > 0) {
        await subscribeMutation({
          buyerDeviceId: deviceId,
          enabledTypes,
          pushToken: pushToken || undefined,
        });
      } else {
        await unsubscribeMutation({ buyerDeviceId: deviceId });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    setLoading(false);
  };

  const getHolidayTypeInfo = (type: string) => {
    return HOLIDAY_TYPES.find(t => t.id === type) || HOLIDAY_TYPES[3];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} data-testid="holiday-reminders-screen">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-button">
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} data-testid="header-title">
          Нагадування про свята
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} data-testid="content-scroll">
        {/* Main Toggle */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]} data-testid="main-toggle-card">
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: themeColors.text }]}>
                🔔 Отримувати нагадування
              </Text>
              <Text style={[styles.toggleSubtitle, { color: themeColors.textSecondary }]}>
                Push-сповіщення перед святами
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isEnabled ? '#4f46e5' : '#f4f3f4'}
              data-testid="enable-reminders-switch"
            />
          </View>
        </View>

        {/* Holiday Types */}
        {isEnabled && (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Типи свят
            </Text>
            <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
              Оберіть які свята вас цікавлять
            </Text>

            {HOLIDAY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeRow,
                  enabledTypes.includes(type.id) && styles.typeRowActive,
                  { borderColor: enabledTypes.includes(type.id) ? '#4f46e5' : themeColors.border }
                ]}
                onPress={() => toggleType(type.id)}
                data-testid={`holiday-type-${type.id}`}
              >
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text style={[styles.typeLabel, { color: themeColors.text }]}>
                  {type.labelUk}
                </Text>
                <Ionicons
                  name={enabledTypes.includes(type.id) ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={enabledTypes.includes(type.id) ? '#4f46e5' : themeColors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Holidays */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            🗓️ Найближчі свята
          </Text>
          
          {!upcomingHolidays ? (
            <ActivityIndicator color="#4f46e5" style={{ marginVertical: 20 }} />
          ) : upcomingHolidays.length === 0 ? (
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              Немає свят в найближчі 30 днів
            </Text>
          ) : (
            upcomingHolidays.slice(0, 5).map((holiday: any) => {
              const typeInfo = getHolidayTypeInfo(holiday.holidayType);
              return (
                <View key={holiday._id} style={styles.holidayRow}>
                  <Text style={styles.holidayEmoji}>{holiday.emoji || typeInfo.emoji}</Text>
                  <View style={styles.holidayInfo}>
                    <Text style={[styles.holidayName, { color: themeColors.text }]}>
                      {holiday.nameUk || holiday.name}
                    </Text>
                    <Text style={[styles.holidayDate, { color: themeColors.textSecondary }]}>
                      {holiday.dateFormatted}
                    </Text>
                  </View>
                  <View style={[
                    styles.daysUntilBadge,
                    holiday.daysUntil <= 3 && styles.daysUntilBadgeUrgent
                  ]}>
                    <Text style={[
                      styles.daysUntilText,
                      holiday.daysUntil <= 3 && styles.daysUntilTextUrgent
                    ]}>
                      {holiday.daysUntil === 0 ? 'Сьогодні!' : 
                       holiday.daysUntil === 1 ? 'Завтра' : 
                       `${holiday.daysUntil} днів`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={loading}
          data-testid="save-holiday-settings-btn"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Зберегти налаштування</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Нагадування надсилаються за 1-3 дні до свята, щоб ви встигли замовити квіти для близьких 💐
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    gap: 12,
  },
  typeRowActive: {
    backgroundColor: '#eef2ff',
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  holidayEmoji: {
    fontSize: 28,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '600',
  },
  holidayDate: {
    fontSize: 13,
    marginTop: 2,
  },
  daysUntilBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
  },
  daysUntilBadgeUrgent: {
    backgroundColor: '#fef3c7',
  },
  daysUntilText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  daysUntilTextUrgent: {
    color: '#d97706',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});
