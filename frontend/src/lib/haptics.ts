import { Platform } from "react-native";

/**
 * Web-safe haptics wrapper.
 *
 * `expo-haptics` throws/rejects on web (no Haptics API in most browsers),
 * which — per the PRD — previously blocked the clean/duplicate/security/
 * privacy/optimise completion flows because an un-caught rejection stopped
 * the `await`-chain that followed it. Every function here is a no-op on web
 * and never throws, so calling code can safely `haptics.success()` etc.
 * without wrapping every call in try/catch.
 */
async function safeCall(fn: () => Promise<void> | void) {
  if (Platform.OS === "web") return;
  try {
    await fn();
  } catch {
    // Haptics are a nice-to-have; never let them break a flow.
  }
}

export const haptics = {
  selection: () => {
    safeCall(async () => {
      const Haptics = await import("expo-haptics");
      await Haptics.selectionAsync();
    });
  },
  success: () => {
    safeCall(async () => {
      const Haptics = await import("expo-haptics");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  },
  error: () => {
    safeCall(async () => {
      const Haptics = await import("expo-haptics");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    });
  },
  impact: () => {
    safeCall(async () => {
      const Haptics = await import("expo-haptics");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });
  },
};
