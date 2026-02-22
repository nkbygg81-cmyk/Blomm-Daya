import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import sv from "./sv";
import uk from "./uk";
import en from "./en";

type Locale = "sv" | "uk" | "en" | (string & {});
type Translations = Record<string, any>;

const translations: Record<string, Translations> = {
  sv,
  uk,
  en,
};

const defaultLocale: Locale = "uk";

let currentLocale: Locale = Localization.getLocales()[0]?.languageCode || defaultLocale;

type LocaleListener = (locale: string) => void;
const localeListeners = new Set<LocaleListener>();

const getByPath = (obj: any, path: string) => {
  return path.split(".").reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
};

const interpolate = (template: string, vars?: Record<string, any>) => {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}|%\{(\w+)\}/g, (_match, a, b) => {
    const key = a ?? b;
    const value = vars[key];
    return value == null ? "" : String(value);
  });
};

const translate = (key: string, options?: any) => {
  const localeTable = translations[currentLocale] ?? {};
  const fallbackTable = translations[defaultLocale] ?? {};

  const raw = getByPath(localeTable, key) ?? getByPath(fallbackTable, key);
  if (typeof raw !== "string") return key;

  return interpolate(raw, options);
};

const i18n = {
  get locale() {
    return currentLocale;
  },
  set locale(value: string) {
    currentLocale = value as Locale;
    localeListeners.forEach((l) => l(currentLocale));
  },
  defaultLocale,
  enableFallback: true,
  t: translate,
};

export const subscribeLocale = (listener: LocaleListener) => {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
};

// Initialize with device locale or saved preference
export const initializeI18n = async () => {
  try {
    const savedLocale = await AsyncStorage.getItem("userLocale");
    if (savedLocale) {
      i18n.locale = savedLocale;
    } else {
      // Get device locale, use first two characters (e.g., "sv-SE" -> "sv")
      const deviceLocale = Localization.getLocales()[0]?.languageCode || "uk";
      i18n.locale = deviceLocale;
    }
  } catch (error) {
    console.error("Failed to load locale:", error);
    i18n.locale = "uk";
  }
};

export const setLocale = async (locale: string) => {
  i18n.locale = locale;
  await AsyncStorage.setItem("userLocale", locale);
};

export const getLocale = () => i18n.locale;

export default i18n;