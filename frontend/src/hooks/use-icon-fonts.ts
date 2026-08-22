import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";

/**
 * Loads Ionicons (used throughout via `@expo/vector-icons`) plus the
 * Plus Jakarta Sans family from design_guidelines.json. The splash screen
 * stays up until this resolves (see app/_layout.tsx).
 */
export function useIconFonts() {
  return useFonts({
    ...Ionicons.font,
    "PlusJakartaSans-Regular": require("../../assets/fonts/PlusJakartaSans-Regular.ttf"),
  });
}
