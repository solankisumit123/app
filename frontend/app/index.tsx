import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme";

const ONBOARD_KEY = "dmp_onboarded";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const done = await storage.getItem(ONBOARD_KEY, false);
      if (done) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    })();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
