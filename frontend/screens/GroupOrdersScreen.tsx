import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'blomm_device_id';

export default function GroupOrdersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [deviceId, setDeviceId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load device ID
  useEffect(() => {
    const loadDeviceId = async () => {
      const id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (id) setDeviceId(id);
    };
    loadDeviceId();
  }, []);

  // Check if coming from invite link
  useEffect(() => {
    if (route.params?.inviteCode) {
      setInviteCode(route.params.inviteCode);
      setShowJoinModal(true);
    }
  }, [route.params]);

  const myGroupOrders = useQuery(
    api.groupOrders.listForDevice,
    deviceId ? { deviceId } : 'skip'
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Час вичерпано';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} д ${hours % 24} год`;
    }
    return `${hours} год ${minutes} хв`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collecting': return '#10b981';
      case 'locked': return '#f59e0b';
      case 'payment': return '#3b82f6';
      case 'paid': return '#8b5cf6';
      case 'processing': return '#6366f1';
      case 'delivered': return '#059669';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'collecting': return 'Збір учасників';
      case 'locked': return 'Закрито';
      case 'payment': return 'Очікує оплати';
      case 'paid': return 'Оплачено';
      case 'processing': return 'В обробці';
      case 'delivered': return 'Доставлено';
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container} data-testid="group-orders-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="back-btn">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} data-testid="header-title">Групові замовлення</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons} data-testid="action-buttons">
        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={() => setShowCreateModal(true)}
          data-testid="create-group-order-btn"
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Створити</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={() => setShowJoinModal(true)}
          data-testid="join-group-order-btn"
        >
          <Ionicons name="enter" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Приєднатись</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard} data-testid="info-card">
        <Ionicons name="people" size={32} color="#4f46e5" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Як це працює?</Text>
          <Text style={styles.infoText}>
            Створіть групове замовлення, запросіть друзів за кодом, кожен додає свої квіти, 
            економте на доставці разом! 💐
          </Text>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        data-testid="orders-list"
      >
        <Text style={styles.sectionTitle}>Мої групові замовлення</Text>
        
        {!myGroupOrders ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} data-testid="loading-indicator" />
        ) : myGroupOrders.length === 0 ? (
          <View style={styles.emptyState} data-testid="empty-state">
            <Ionicons name="basket-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Поки немає групових замовлень</Text>
            <Text style={styles.emptySubtext}>
              Створіть нове або приєднайтесь за кодом
            </Text>
          </View>
        ) : (
          myGroupOrders.map((order: any) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('GroupOrderDetail', { 
                groupOrderId: order.id,
                inviteCode: order.inviteCode 
              })}
              data-testid={`group-order-card-${order.inviteCode}`}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderTitle} data-testid={`order-title-${order.inviteCode}`}>{order.title}</Text>
                  <View style={styles.orderBadges}>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getStatusColor(order.status) }]} data-testid={`order-status-${order.inviteCode}`}>
                        {getStatusLabel(order.status)}
                      </Text>
                    </View>
                    {order.isCreator && (
                      <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.badgeText, { color: '#92400e' }]}>Ви організатор</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
              </View>
              
              <View style={styles.orderInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="people-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoItemText}>{order.participantsCount} учасників</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="cash-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoItemText}>{order.totalAmount} kr</Text>
                </View>
                {order.status === 'collecting' && !order.isExpired && (
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={16} color="#f59e0b" />
                    <Text style={[styles.infoItemText, { color: '#f59e0b' }]}>
                      {formatTimeLeft(order.deadline - Date.now())}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.orderCode}>
                <Text style={styles.codeLabel}>Код:</Text>
                <Text style={styles.codeValue}>{order.inviteCode}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateGroupOrderModal
          deviceId={deviceId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(groupOrderId, code) => {
            setShowCreateModal(false);
            navigation.navigate('GroupOrderDetail', { 
              groupOrderId,
              inviteCode: code 
            });
          }}
        />
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <JoinGroupOrderModal
          deviceId={deviceId}
          initialCode={inviteCode}
          onClose={() => {
            setShowJoinModal(false);
            setInviteCode('');
          }}
          onJoined={(groupOrderId) => {
            setShowJoinModal(false);
            setInviteCode('');
            navigation.navigate('GroupOrderDetail', { groupOrderId });
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Create Group Order Modal
function CreateGroupOrderModal({
  deviceId,
  onClose,
  onCreated,
}: {
  deviceId: string;
  onClose: () => void;
  onCreated: (id: Id<'groupOrders'>, code: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentType, setPaymentType] = useState<'split' | 'creator'>('split');
  const [loading, setLoading] = useState(false);

  const createGroupOrder = useMutation(api.groupOrders.create);

  const handleCreate = async () => {
    if (!title.trim() || !address.trim() || !name.trim()) {
      Alert.alert('Помилка', 'Заповніть всі обов\'язкові поля');
      return;
    }

    setLoading(true);
    try {
      const result = await createGroupOrder({
        creatorDeviceId: deviceId,
        creatorName: name.trim(),
        creatorPhone: phone.trim() || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        deliveryAddress: address.trim(),
        deliveryType,
        deadlineHours: parseInt(deadlineHours) || 24,
        paymentType,
      });

      onCreated(result.groupOrderId, result.inviteCode);
    } catch (error: any) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити замовлення');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Створити групове замовлення</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalForm}>
          <Text style={styles.inputLabel}>Ваше ім'я *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ім'я"
            value={name}
            onChangeText={setName}
            data-testid="creator-name-input"
          />

          <Text style={styles.inputLabel}>Телефон</Text>
          <TextInput
            style={styles.input}
            placeholder="+380..."
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Назва замовлення *</Text>
          <TextInput
            style={styles.input}
            placeholder="Напр: День народження Маші"
            value={title}
            onChangeText={setTitle}
            data-testid="group-order-title-input"
          />

          <Text style={styles.inputLabel}>Опис (опціонально)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Додаткова інформація для учасників"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Адреса доставки *</Text>
          <TextInput
            style={styles.input}
            placeholder="Вулиця, будинок, квартира"
            value={address}
            onChangeText={setAddress}
            data-testid="delivery-address-input"
          />

          <Text style={styles.inputLabel}>Тип доставки</Text>
          <View style={styles.optionButtons}>
            <TouchableOpacity
              style={[styles.optionButton, deliveryType === 'delivery' && styles.optionButtonActive]}
              onPress={() => setDeliveryType('delivery')}
            >
              <Ionicons 
                name="car" 
                size={20} 
                color={deliveryType === 'delivery' ? '#fff' : '#6b7280'} 
              />
              <Text style={[
                styles.optionButtonText,
                deliveryType === 'delivery' && styles.optionButtonTextActive
              ]}>Доставка</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, deliveryType === 'pickup' && styles.optionButtonActive]}
              onPress={() => setDeliveryType('pickup')}
            >
              <Ionicons 
                name="storefront" 
                size={20} 
                color={deliveryType === 'pickup' ? '#fff' : '#6b7280'} 
              />
              <Text style={[
                styles.optionButtonText,
                deliveryType === 'pickup' && styles.optionButtonTextActive
              ]}>Самовивіз</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Тип оплати</Text>
          <View style={styles.optionButtons}>
            <TouchableOpacity
              style={[styles.optionButton, paymentType === 'split' && styles.optionButtonActive]}
              onPress={() => setPaymentType('split')}
            >
              <Ionicons 
                name="people" 
                size={20} 
                color={paymentType === 'split' ? '#fff' : '#6b7280'} 
              />
              <Text style={[
                styles.optionButtonText,
                paymentType === 'split' && styles.optionButtonTextActive
              ]}>Кожен окремо</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, paymentType === 'creator' && styles.optionButtonActive]}
              onPress={() => setPaymentType('creator')}
            >
              <Ionicons 
                name="person" 
                size={20} 
                color={paymentType === 'creator' ? '#fff' : '#6b7280'} 
              />
              <Text style={[
                styles.optionButtonText,
                paymentType === 'creator' && styles.optionButtonTextActive
              ]}>Я за всіх</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Дедлайн (години)</Text>
          <View style={styles.deadlineOptions}>
            {['12', '24', '48', '72'].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.deadlineOption,
                  deadlineHours === hours && styles.deadlineOptionActive
                ]}
                onPress={() => setDeadlineHours(hours)}
              >
                <Text style={[
                  styles.deadlineOptionText,
                  deadlineHours === hours && styles.deadlineOptionTextActive
                ]}>{hours}г</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          data-testid="confirm-create-group-order-btn"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Створити замовлення</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Join Group Order Modal
function JoinGroupOrderModal({
  deviceId,
  initialCode,
  onClose,
  onJoined,
}: {
  deviceId: string;
  initialCode?: string;
  onClose: () => void;
  onJoined: (id: Id<'groupOrders'>) => void;
}) {
  const [code, setCode] = useState(initialCode?.toUpperCase() || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const joinGroupOrder = useMutation(api.groupOrders.join);
  const groupOrder = useQuery(
    api.groupOrders.getByInviteCode,
    code.length === 6 ? { inviteCode: code } : 'skip'
  );

  const handleJoin = async () => {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Помилка', 'Введіть код та ваше ім\'я');
      return;
    }

    setLoading(true);
    try {
      const result = await joinGroupOrder({
        inviteCode: code.trim().toUpperCase(),
        deviceId,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      if (result.success) {
        onJoined(result.groupOrderId);
      } else {
        Alert.alert('Помилка', result.error);
      }
    } catch (error: any) {
      Alert.alert('Помилка', error.message || 'Не вдалося приєднатися');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Приєднатися до замовлення</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalForm}>
          <Text style={styles.inputLabel}>Код запрошення *</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="XXXXXX"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            data-testid="invite-code-input"
          />

          {/* Preview */}
          {groupOrder && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{groupOrder.title}</Text>
              <Text style={styles.previewInfo}>
                👤 {groupOrder.creatorName} • 👥 {groupOrder.participantsCount} учасників
              </Text>
              <Text style={styles.previewAddress}>📍 {groupOrder.deliveryAddress}</Text>
              {groupOrder.isExpired ? (
                <Text style={styles.previewExpired}>⏰ Час вичерпано</Text>
              ) : (
                <Text style={styles.previewTime}>
                  ⏰ Залишилось: {Math.floor(groupOrder.timeLeft / (1000 * 60 * 60))} год
                </Text>
              )}
            </View>
          )}

          <Text style={styles.inputLabel}>Ваше ім'я *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ім'я"
            value={name}
            onChangeText={setName}
            data-testid="participant-name-input"
          />

          <Text style={styles.inputLabel}>Телефон (опціонально)</Text>
          <TextInput
            style={styles.input}
            placeholder="+380..."
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.joinButtonModal,
            (loading || !groupOrder || groupOrder.isExpired) && styles.buttonDisabled
          ]}
          onPress={handleJoin}
          disabled={loading || !groupOrder || groupOrder.isExpired}
          data-testid="confirm-join-group-order-btn"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="enter" size={20} color="#fff" />
              <Text style={styles.joinButtonText}>Приєднатися</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButton: {
    backgroundColor: '#4f46e5',
  },
  joinButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6366f1',
    lineHeight: 20,
  },
  ordersList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  orderBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoItemText: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
    fontFamily: 'monospace',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalForm: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  optionButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  deadlineOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  deadlineOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  deadlineOptionActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  deadlineOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  deadlineOptionTextActive: {
    color: '#fff',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  previewInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  previewAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },
  previewExpired: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  joinButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    marginTop: 0,
    paddingVertical: 16,
    backgroundColor: '#10b981',
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
