import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const ORDER_COUNT_KEY = "completedOrderCount";
const HAS_RATED_KEY = "hasRequestedRating";

/**
* Call after a successful order. On the 2nd completed order,
* prompts the user to rate the app via the native StoreReview dialog.
*/
export async function maybeRequestReview() {
try {
const hasRated = await AsyncStorage.getItem(HAS_RATED_KEY);
if (hasRated === "true") return;

const countStr = await AsyncStorage.getItem(ORDER_COUNT_KEY);
const count = (parseInt(countStr || "0", 10) || 0) + 1;
await AsyncStorage.setItem(ORDER_COUNT_KEY, String(count));

if (count >= 2) {
const isAvailable = await StoreReview.isAvailableAsync();
if (isAvailable) {
// Small delay so the success UI is visible first
setTimeout(async () => {
await StoreReview.requestReview();
await AsyncStorage.setItem(HAS_RATED_KEY, "true");
}, 1500);
}
}
} catch (e) {
// Non-critical — silently ignore
console.warn("StoreReview error:", e);
}
}
