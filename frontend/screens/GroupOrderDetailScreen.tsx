import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

export default function GroupOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupOrderId, inviteCode } = route.params;
  
  const [deviceId, setDeviceId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadDeviceId = async () => {
      const id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (id) setDeviceId(id);
    };
    loadDeviceId();
  }, []);

  const groupOrder = useQuery(
    api.groupOrders.getById,
    groupOrderId ? { groupOrderId } : 'skip'
  );

  const myItems = useQuery(
    api.groupOrders.getMyItems,
    groupOrderId && deviceId ? { groupOrderId, deviceId } : 'skip'
  );

  const lockOrder = useMutation(api.groupOrders.lock);
  const cancelOrder = useMutation(api.groupOrders.cancel);
  const leaveOrder = useMutation(api.groupOrders.leave);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleShare = async () => {
    try {
      const code = groupOrder?.inviteCode || inviteCode;
      await Share.share({
        message: `🌸 Приєднуйся до групового замовлення квітів!\n\n` +
          `"${groupOrder?.title}"\n\n` +
          `📍 ${groupOrder?.deliveryAddress}\n\n` +
          `Код для приєднання: ${code}\n\n` +
          `Відкрий додаток Blomm Daya та введи цей код!`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleLock = async () => {
    Alert.alert(
      'Закрити замовлення?',
      'Після закриття нові учасники не зможуть приєднатися та ніхто не зможе змінити свої товари.',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Закрити',
          style: 'destructive',
          onPress: async () => {
            const result = await lockOrder({ groupOrderId, deviceId });
            if (!result.success) {
              Alert.alert('Помилка', result.error);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Скасувати замовлення?',
      'Це видалить групове замовлення для всіх учасників.',
      [
        { text: 'Ні', style: 'cancel' },
        {
          text: 'Так, скасувати',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelOrder({ groupOrderId, deviceId });
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Помилка', result.error);
            }
          },
        },
      ]
    );
  };

  const handleLeave = async () => {
    Alert.alert(
      'Покинути замовлення?',
      'Ваші товари будуть видалені з групового замовлення.',
      [
        { text: 'Ні', style: 'cancel' },
        {
          text: 'Так, покинути',
          style: 'destructive',
          onPress: async () => {
            const result = await leaveOrder({ groupOrderId, deviceId });
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Помилка', result.error);
            }
          },
        },
      ]
    );
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
      case 'locked': return 'Закрито для змін';
      case 'payment': return 'Очікує оплати';
      case 'paid': return 'Оплачено';
      case 'processing': return 'В обробці';
      case 'delivered': return 'Доставлено';
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };

  if (!groupOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Завантаження...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator = groupOrder.creatorDeviceId === deviceId;
  const canEdit = groupOrder.status === 'collecting' && !groupOrder.isExpired;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{groupOrder.title}</Text>
        <TouchableOpacity onPress={handleShare} data-testid="share-group-order-btn">
          <Ionicons name="share-outline" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(groupOrder.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(groupOrder.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(groupOrder.status) }]}>
            {getStatusLabel(groupOrder.status)}
          </Text>
          {groupOrder.status === 'collecting' && !groupOrder.isExpired && (
            <Text style={styles.timeLeft}>
              ⏰ {formatTimeLeft(groupOrder.timeLeft)}
            </Text>
          )}
        </View>

        {/* Invite Code Card */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>Код для приєднання</Text>
          <Text style={styles.inviteCode}>{groupOrder.inviteCode}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleShare}>
            <Ionicons name="copy-outline" size={18} color="#4f46e5" />
            <Text style={styles.copyButtonText}>Поділитися</Text>
          </TouchableOpacity>
        </View>

        {/* Order Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Інформація</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <Text style={styles.infoRowLabel}>Організатор:</Text>
            <Text style={styles.infoRowValue}>{groupOrder.creatorName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#6b7280" />
            <Text style={styles.infoRowLabel}>Адреса:</Text>
            <Text style={styles.infoRowValue}>{groupOrder.deliveryAddress}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name={groupOrder.deliveryType === 'pickup' ? 'storefront-outline' : 'car-outline'} size={20} color="#6b7280" />
            <Text style={styles.infoRowLabel}>Доставка:</Text>
            <Text style={styles.infoRowValue}>
              {groupOrder.deliveryType === 'pickup' ? 'Самовивіз' : 'Кур\'єр'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#6b7280" />
            <Text style={styles.infoRowLabel}>Оплата:</Text>
            <Text style={styles.infoRowValue}>
              {groupOrder.paymentType === 'split' ? 'Кожен окремо' : 'Організатор за всіх'}
            </Text>
          </View>

          {groupOrder.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Примітка:</Text>
              <Text style={styles.descriptionText}>{groupOrder.description}</Text>
            </View>
          )}
        </View>

        {/* Participants */}
        <View style={styles.participantsCard}>
          <View style={styles.participantsHeader}>
            <Text style={styles.participantsTitle}>
              👥 Учасники ({groupOrder.participantsCount})
            </Text>
            <Text style={styles.totalAmount}>{groupOrder.totalAmount} kr</Text>
          </View>

          {groupOrder.participants.map((participant: any, index: number) => (
            <View 
              key={participant.id} 
              style={[
                styles.participantRow,
                participant.deviceId === deviceId && styles.participantRowMe
              ]}
            >
              <View style={styles.participantInfo}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantInitial}>
                    {participant.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.participantName}>
                    {participant.name}
                    {participant.deviceId === deviceId && ' (Ви)'}
                    {participant.deviceId === groupOrder.creatorDeviceId && ' 👑'}
                  </Text>
                  <Text style={styles.participantItems}>
                    {participant.items.length > 0 
                      ? `${participant.items.length} товарів` 
                      : 'Ще не додано товари'}
                  </Text>
                </View>
              </View>
              <Text style={styles.participantSubtotal}>{participant.subtotal} kr</Text>
            </View>
          ))}
        </View>

        {/* My Items */}
        {myItems && (
          <View style={styles.myItemsCard}>
            <Text style={styles.myItemsTitle}>🛒 Мої товари</Text>
            
            {myItems.items.length === 0 ? (
              <View style={styles.emptyItems}>
                <Ionicons name="basket-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyItemsText}>Ви ще не додали товари</Text>
              </View>
            ) : (
              myItems.items.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQty}>x{item.qty}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{item.price * item.qty} kr</Text>
                </View>
              ))
            )}
            
            {myItems.gifts && myItems.gifts.length > 0 && (
              <>
                <Text style={styles.giftsLabel}>🎁 Подарунки:</Text>
                {myItems.gifts.map((gift: any, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{gift.name}</Text>
                      <Text style={styles.itemQty}>x{gift.qty}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{gift.price * gift.qty} kr</Text>
                  </View>
                ))}
              </>
            )}
            
            <View style={styles.mySubtotal}>
              <Text style={styles.mySubtotalLabel}>Моя сума:</Text>
              <Text style={styles.mySubtotalValue}>{myItems.subtotal} kr</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canEdit && (
            <TouchableOpacity
              style={styles.addItemsButton}
              onPress={() => navigation.navigate('Browse', { 
                groupOrderId,
                groupOrderMode: true 
              })}
              data-testid="add-items-to-group-order-btn"
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addItemsButtonText}>Додати товари</Text>
            </TouchableOpacity>
          )}

          {isCreator && groupOrder.status === 'collecting' && (
            <TouchableOpacity
              style={styles.lockButton}
              onPress={handleLock}
              data-testid="lock-group-order-btn"
            >
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.lockButtonText}>Закрити збір</Text>
            </TouchableOpacity>
          )}

          {isCreator && (groupOrder.status === 'collecting' || groupOrder.status === 'locked') && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              data-testid="cancel-group-order-btn"
            >
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Скасувати замовлення</Text>
            </TouchableOpacity>
          )}

          {!isCreator && groupOrder.status === 'collecting' && (
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeave}
              data-testid="leave-group-order-btn"
            >
              <Ionicons name="exit-outline" size={20} color="#ef4444" />
              <Text style={styles.leaveButtonText}>Покинути замовлення</Text>
            </TouchableOpacity>
          )}

          {(groupOrder.status === 'locked' || groupOrder.status === 'payment') && isCreator && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => {
                // TODO: Implement group payment flow
                Alert.alert('Оплата', 'Функція оплати групового замовлення буде доступна найближчим часом');
              }}
              data-testid="pay-group-order-btn"
            >
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.payButtonText}>Перейти до оплати ({groupOrder.totalAmount} kr)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeLeft: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  inviteCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    alignItems: 'center',
  },
  inviteLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoRowLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 90,
  },
  infoRowValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  descriptionBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
  },
  participantsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4f46e5',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  participantRowMe: {
    backgroundColor: '#eef2ff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4f46e5',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  participantItems: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  participantSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  myItemsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  myItemsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
  },
  itemQty: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  giftsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 8,
  },
  mySubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  mySubtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  mySubtotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4f46e5',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  addItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    gap: 8,
  },
  addItemsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    gap: 8,
  },
  lockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#10b981',
    borderRadius: 12,
    gap: 8,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
