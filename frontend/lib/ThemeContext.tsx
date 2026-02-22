import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFeatureFlags } from "./useFeatureFlags";

// Color palettes
export const lightColors = {
  bg: "#F8F9FA",
  text: "#212529",
  textSecondary: "#495057",
  muted: "#6C757D",
  card: "#FFFFFF",
  border: "#DEE2E6",
  primary: "#8B5CF6",
  primaryLight: "#DDD6FE",
  primaryDark: "#7C3AED",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  white: "#FFFFFF",
  black: "#000000",
  background: "#F8F9FA",
  textLight: "#6C757D",
  error: "#EF4444",
  overlayDark: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.12)",
  surface: "#F3F4F6",
  inputBg: "#FFFFFF",
  tabBar: "#FFFFFF",
  statusBar: "dark-content",
};

export const darkColors = {
  bg: "#0F172A",
  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  muted: "#94A3B8",
  card: "#1E293B",
  border: "#334155",
  primary: "#A78BFA",
  primaryLight: "#4C1D95",
  primaryDark: "#C4B5FD",
  success: "#34D399",
  danger: "#F87171",
  warning: "#FBBF24",
  info: "#60A5FA",
  white: "#FFFFFF",
  black: "#000000",
  background: "#0F172A",
  textLight: "#94A3B8",
  error: "#F87171",
  overlayDark: "rgba(0, 0, 0, 0.7)",
  shadow: "rgba(0, 0, 0, 0.4)",
  surface: "#1E293B",
  inputBg: "#1E293B",
  tabBar: "#1E293B",
  statusBar: "light-content",
};

export type ThemeColors = typeof lightColors;
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@blomm_daya_theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isLoaded, setIsLoaded] = useState(false);
  const featureFlags = useFeatureFlags();

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      if (savedMode && (savedMode === "light" || savedMode === "dark" || savedMode === "system")) {
        setModeState(savedMode as ThemeMode);
      }
      setIsLoaded(true);
    });
  }, []);

  // Determine if dark mode should be active
  const isDark = useMemo(() => {
    // If dark mode feature is disabled, always use light
    if (!featureFlags.darkMode) {
      return false;
    }
    
    if (mode === "system") {
      return systemColorScheme === "dark";
    }
    return mode === "dark";
  }, [mode, systemColorScheme, featureFlags.darkMode]);

  // Get current colors
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  // Set mode and persist
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newMode = isDark ? "light" : "dark";
    setMode(newMode);
  };

  const value = useMemo(
    () => ({
      colors,
      mode,
      isDark,
      setMode,
      toggleTheme,
    }),
    [colors, mode, isDark]
  );

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Fallback for components outside ThemeProvider
    return {
      colors: lightColors,
      mode: "light",
      isDark: false,
      setMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

// Legacy export for backward compatibility
export const colors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Dynamic shadows based on theme
export function getShadows(isDark: boolean) {
  return {
    card: {
      shadowColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.12)",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    fab: {
      shadowColor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.12)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 6,
    },
  };
}

// Static shadows for backward compatibility
export const shadows = {
  card: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  fab: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 6,
  },
};
