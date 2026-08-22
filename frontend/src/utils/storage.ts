import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Thin, JSON-safe wrapper around AsyncStorage. Works the same on native and
 * web (AsyncStorage falls back to localStorage on web automatically).
 */
export const storage = {
  async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // best-effort; storage failures shouldn't crash the app
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
