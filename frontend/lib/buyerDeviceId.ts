import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const STORAGE_KEY = "buyerDeviceId";

function fallbackId(): string {
  return `buyer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getBuyerDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id =
    typeof (Crypto as any).randomUUID === "function"
      ? (Crypto as any).randomUUID()
      : fallbackId();

  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}