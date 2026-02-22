import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

const CACHE_PREFIX = "@blomm_daya_cache_";
const OFFLINE_QUEUE_KEY = "@blomm_daya_offline_queue";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  createdAt: number;
  retryCount: number;
}

// Hook to manage online/offline state
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
      setConnectionType(state.type);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? true);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, connectionType };
}

// Cache data locally
export async function cacheData<T>(key: string, data: T, ttlMs: number = CACHE_EXPIRY_MS): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

// Clear specific cache
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.error("Cache clear error:", error);
  }
}

// Clear all cache
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error("Cache clear all error:", error);
  }
}

// Queue an action for later execution when online
export async function queueOfflineAction(type: string, payload: any): Promise<string> {
  try {
    const queue = await getOfflineQueue();
    const id = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const action: QueuedAction = {
      id,
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    queue.push(action);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    return id;
  } catch (error) {
    console.error("Queue action error:", error);
    throw error;
  }
}

// Get all queued actions
export async function getOfflineQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error("Get queue error:", error);
    return [];
  }
}

// Remove action from queue
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter((a) => a.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Remove from queue error:", error);
  }
}

// Update retry count
export async function incrementRetryCount(id: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const updated = queue.map((a) =>
      a.id === id ? { ...a, retryCount: a.retryCount + 1 } : a
    );
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Increment retry error:", error);
  }
}

// Hook to use cached data with online fallback
export function useCachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T> | T | undefined,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const { isOnline } = useOnlineStatus();

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to get fresh data if online
      if (isOnline) {
        const freshData = await queryFn();
        if (freshData !== undefined) {
          setData(freshData);
          setIsStale(false);
          // Cache the fresh data
          await cacheData(cacheKey, freshData);
        }
      } else {
        // Offline - try cache
        const cachedData = await getCachedData<T>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setIsStale(true);
        }
      }
    } catch (err) {
      setError(err as Error);
      // Fall back to cache on error
      const cachedData = await getCachedData<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsStale(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, queryFn, enabled, isOnline]);

  // Initial load
  useEffect(() => {
    // First try cache for immediate display
    getCachedData<T>(cacheKey).then((cached) => {
      if (cached) {
        setData(cached);
        setIsStale(!isOnline);
      }
      // Then fetch fresh data
      refresh();
    });
  }, [cacheKey, isOnline]);

  return { data, isLoading, error, isStale, refresh };
}

// Hook to sync offline queue when coming online
export function useOfflineSync(
  processAction: (action: QueuedAction) => Promise<boolean>
) {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });

  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncProgress({ completed: 0, total: queue.length });

    for (let i = 0; i < queue.length; i++) {
      const action = queue[i];
      
      try {
        const success = await processAction(action);
        if (success) {
          await removeFromQueue(action.id);
        } else {
          await incrementRetryCount(action.id);
        }
      } catch (error) {
        console.error("Sync action error:", error);
        await incrementRetryCount(action.id);
      }

      setSyncProgress({ completed: i + 1, total: queue.length });
    }

    setIsSyncing(false);
  }, [isOnline, isSyncing, processAction]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      sync();
    }
  }, [isOnline]);

  return { isSyncing, syncProgress, sync };
}

// Predefined cache keys
export const CACHE_KEYS = {
  FLOWERS: "flowers",
  FLORISTS: "florists",
  CATEGORIES: "categories",
  USER_PROFILE: "user_profile",
  ORDERS: "orders",
  CART: "cart",
  FAVORITES: "favorites",
  SETTINGS: "settings",
};

// Action types for offline queue
export const OFFLINE_ACTIONS = {
  ADD_TO_CART: "ADD_TO_CART",
  REMOVE_FROM_CART: "REMOVE_FROM_CART",
  PLACE_ORDER: "PLACE_ORDER",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  ADD_REVIEW: "ADD_REVIEW",
  TOGGLE_FAVORITE: "TOGGLE_FAVORITE",
};
