import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

export type ToastType = "success" | "error" | "info";
type ToastState = { id: number; message: string; type: ToastType } | null;

type AppContextValue = {
  /** Per the PRD's 2026-08-16 update, premium gating was removed — always true. */
  premium: boolean;
  setPremium: (v: boolean) => void;
  toast: (message: string, type?: ToastType) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() must be used within <AppProvider>");
  return ctx;
}

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "close-circle",
  info: "information-circle",
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: colors.brand,
  error: colors.error,
  info: colors.info,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [premium, setPremium] = useState(true); // premium gating removed — everything is free
  const [current, setCurrent] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCurrent(null);
    });
  }, [opacity]);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      idRef.current += 1;
      setCurrent({ id: idRef.current, message, type });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(dismiss, 2600);
    },
    [dismiss, opacity],
  );

  const value = useMemo(() => ({ premium, setPremium, toast }), [premium, toast]);

  return (
    <AppContext.Provider value={value}>
      {children}
      {current ? (
        <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity }]}>
          <View style={[styles.toast, { borderLeftColor: TOAST_COLORS[current.type] }]}>
            <Ionicons name={ICONS[current.type]} size={18} color={TOAST_COLORS[current.type]} />
            <Text style={styles.toastText} numberOfLines={2}>
              {current.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl + spacing.xl,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.onSurface,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 420,
    ...shadow.lifted,
  },
  toastText: { color: "#fff", fontSize: font.base, fontWeight: "600", flexShrink: 1 },
});
