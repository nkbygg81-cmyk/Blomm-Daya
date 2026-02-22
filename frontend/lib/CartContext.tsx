import { createContext, useContext, useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Animated, StyleSheet, Text, View, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  qty: number;
};

type GiftItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  gifts: GiftItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  addGift: (gift: Omit<GiftItem, "qty">) => void;
  removeGift: (id: string) => void;
  updateGiftQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "blomm_cart_items";
const GIFTS_STORAGE_KEY = "blomm_cart_gifts";

function CartToast({
  visible,
  message,
  imageUrl,
  translateY,
}: {
  visible: boolean;
  message: string;
  imageUrl: string | null;
  translateY: Animated.Value;
}) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={toastStyles.inner}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={toastStyles.image} />
        ) : (
          <View style={toastStyles.iconWrap}>
            <Ionicons name="cart" size={18} color="#fff" />
          </View>
        )}
        <View style={toastStyles.textWrap}>
          <Text style={toastStyles.title} numberOfLines={1}>
            {message}
          </Text>
          <Text style={toastStyles.subtitle}>Додано в кошик</Text>
        </View>
        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212529",
  },
  subtitle: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 1,
  },
});

export function CartProvider({ children }: any) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastImage, setToastImage] = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedItems, savedGifts] = await Promise.all([
          AsyncStorage.getItem(CART_STORAGE_KEY),
          AsyncStorage.getItem(GIFTS_STORAGE_KEY),
        ]);
        if (savedItems) setItems(JSON.parse(savedItems));
        if (savedGifts) setGifts(JSON.parse(savedGifts));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Persist cart to AsyncStorage whenever it changes
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(GIFTS_STORAGE_KEY, JSON.stringify(gifts)).catch(() => {});
  }, [gifts, loaded]);

  const showToast = useCallback(
    (name: string, imageUrl: string | null) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMessage(name);
      setToastImage(imageUrl);
      setToastVisible(true);
      translateY.setValue(-100);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToastVisible(false));
      }, 2000);
    },
    [translateY]
  );

  const addItem = (item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((i: CartItem) => i.id === item.id);
      if (existing) {
        return prev.map((i: CartItem) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    showToast(item.name, item.imageUrl);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i: CartItem) => i.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i: CartItem) => (i.id === id ? { ...i, qty } : i))
    );
  };

  const addGift = (gift: Omit<GiftItem, "qty">) => {
    setGifts((prev) => {
      const existing = prev.find((g: GiftItem) => g.id === gift.id);
      if (existing) {
        return prev.map((g: GiftItem) =>
          g.id === gift.id ? { ...g, qty: g.qty + 1 } : g
        );
      }
      return [...prev, { ...gift, qty: 1 }];
    });
    showToast(gift.name, gift.imageUrl);
  };

  const removeGift = (id: string) => {
    setGifts((prev) => prev.filter((g: GiftItem) => g.id !== id));
  };

  const updateGiftQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeGift(id);
      return;
    }
    setGifts((prev) =>
      prev.map((g: GiftItem) => (g.id === id ? { ...g, qty } : g))
    );
  };

  const clearCart = () => {
    setItems([]);
    setGifts([]);
    AsyncStorage.multiRemove([CART_STORAGE_KEY, GIFTS_STORAGE_KEY]).catch(() => {});
  };

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items]
  );
  
  const totalPrice = useMemo(() => {
    const giftsPrice = gifts.reduce((sum, gift) => sum + gift.price * gift.qty, 0);
    const itemsPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return itemsPrice + giftsPrice;
  }, [items, gifts]);

  return (
    <CartContext.Provider
      value={{
        items,
        gifts,
        addItem,
        removeItem,
        updateQty,
        addGift,
        removeGift,
        updateGiftQty,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
      <CartToast
        visible={toastVisible}
        message={toastMessage}
        imageUrl={toastImage}
        translateY={translateY}
      />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}