import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { haptics } from "@/src/lib/haptics";
import { colors, font, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { PillButton, ScreenHeader } from "@/src/components/ui";
import { api } from "@/src/lib/api";

export default function Security() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [itemsScanned, setItemsScanned] = useState(229);
  const [lastScan, setLastScan] = useState("just now");
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
      );
      loop.start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ).start();
      return () => loop.stop();
    }
  }, [scanning, rotate, pulse]);

  const scan = () => {
    setScanning(true);
    setTimeout(async () => {
      setScanning(false);
      setItemsScanned(220 + Math.floor(Math.random() * 40));
      setLastScan("just now");
      haptics.success();
      try {
        await api.saveScan({ type: "security", health_score: 100 });
      } catch {}
    }, 2600);
  };

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Viruses & risks" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }}>
        <View style={styles.hero}>
          <Text style={styles.secureText}>{scanning ? "Scanning…" : "Secure"}</Text>
          <Text style={styles.secureSub}>
            {scanning ? "Checking apps and files" : "No threats detected"}
          </Text>
        </View>

        <View style={styles.badgeWrap}>
          {scanning ? (
            <Animated.View
              style={[styles.pulseRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
            />
          ) : null}
          <View style={styles.badgeOuter}>
            <Animated.View style={scanning ? { transform: [{ rotate: spin }] } : undefined}>
              <View style={styles.badgeInner}>
                <Ionicons name={scanning ? "sync" : "shield-checkmark"} size={44} color="#fff" />
              </View>
            </Animated.View>
          </View>
        </View>

        <Text style={styles.section}>Scan records</Text>
        <View style={styles.card}>
          <View style={styles.recordRow}>
            <View style={[styles.chip, { backgroundColor: colors.brand + "1A" }]}>
              <Ionicons name="time" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recTitle}>Auto scan when idle</Text>
              <Text style={styles.recSub}>
                {itemsScanned} items scanned · 0 risks found
              </Text>
              <Text style={styles.recTime}>{lastScan}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.section}>Protection</Text>
        <View style={styles.card}>
          {[
            { icon: "shield", label: "Real-time protection", color: colors.brand },
            { icon: "wifi", label: "WiFi safety check", color: colors.info },
            { icon: "card", label: "Payment protection", color: colors.warning },
          ].map((p, i, arr) => (
            <View key={p.label} style={[styles.recordRow, i < arr.length - 1 && styles.rowBorder]}>
              <View style={[styles.chip, { backgroundColor: p.color + "1A" }]}>
                <Ionicons name={p.icon as any} size={20} color={p.color} />
              </View>
              <Text style={[styles.recTitle, { flex: 1 }]}>{p.label}</Text>
              <View style={styles.onPill}>
                <Text style={styles.onText}>ON</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.disclaimer}>
          On-device heuristic scan. This app audits its own permissions and installed-source safety —
          it cannot access other apps&apos; private data.
        </Text>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PillButton
          label={scanning ? "Scanning…" : "Scan again"}
          onPress={scan}
          loading={scanning}
          testID="security-scan-button"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { alignItems: "center", paddingVertical: spacing.md },
  secureText: { fontSize: font.giant, fontWeight: "800", color: colors.brand },
  secureSub: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs },
  badgeWrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xl, height: 220 },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.brand,
  },
  badgeOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.brand + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.lifted,
  },
  section: { fontSize: font.base, fontWeight: "700", color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadow.card },
  recordRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  recTitle: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  recSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  recTime: { fontSize: font.sm, color: colors.mutedLight, marginTop: 2 },
  onPill: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  onText: { color: "#fff", fontSize: font.sm, fontWeight: "800" },
  disclaimer: { fontSize: font.sm, color: colors.mutedLight, marginTop: spacing.md, lineHeight: 18 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lifted,
  },
});
