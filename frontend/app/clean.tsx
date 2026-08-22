import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { haptics } from "@/src/lib/haptics";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { Card, IconChip, PillButton, ScreenHeader } from "@/src/components/ui";
import { StorageCard } from "@/src/components/StorageBar";
import {
  DeviceSnapshot,
  estimateJunk,
  getDeviceSnapshot,
  storageBreakdown,
} from "@/src/lib/device";
import { api } from "@/src/lib/api";
import { useApp } from "@/src/lib/store";

type Cat = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bytes: number;
  selected: boolean;
};

const APP_CLEANERS = [
  { key: "wa", name: "WhatsApp cleaner", bytes: 499 * 1024 * 1024, color: "#25D366", icon: "logo-whatsapp" },
  { key: "tg", name: "Telegram cache", bytes: 210 * 1024 * 1024, color: "#229ED9", icon: "paper-plane" },
  { key: "ig", name: "Instagram cache", bytes: 156 * 1024 * 1024, color: "#E1306C", icon: "logo-instagram" },
  { key: "msg", name: "Messenger cleaner", bytes: 28.3 * 1024 * 1024, color: "#0084FF", icon: "chatbubbles" },
];

export default function CleanUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();

  const [snap, setSnap] = useState<DeviceSnapshot | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [freed, setFreed] = useState<number | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const s = await getDeviceSnapshot();
    const j = estimateJunk(s);
    setSnap(s);
    setCats(j.categories);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedTotal = cats.filter((c) => c.selected).reduce((a, c) => a + c.bytes, 0);

  const toggle = (key: string) => {
    haptics.selection();
    setCats((prev) => prev.map((c) => (c.key === key ? { ...c, selected: !c.selected } : c)));
  };

  const clean = () => {
    if (selectedTotal <= 0) return;
    setCleaning(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(async () => {
      haptics.success();
      setFreed(selectedTotal);
      setCleaning(false);
      try {
        await api.saveScan({
          type: "clean",
          freed_bytes: Math.round(selectedTotal),
          storage_used: snap ? Math.round(snap.storageUsed) : 0,
          storage_total: snap ? Math.round(snap.storageTotal) : 0,
        });
      } catch {}
    });
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  // ---- Summary state ----
  if (freed != null) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScreenHeader title="Clean up" onBack={() => router.back()} />
        <View style={styles.summaryWrap}>
          <View style={styles.summaryBadge}>
            <Ionicons name="checkmark-done" size={64} color="#fff" />
          </View>
          <Text style={styles.summaryFreed}>{formatBytes(freed)}</Text>
          <Text style={styles.summarySub}>freed up successfully</Text>
          <Text style={styles.summaryHint}>
            Your device is cleaner and running smoother. Keep it up with a weekly clean.
          </Text>
        </View>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <PillButton label="Done" onPress={() => router.back()} testID="clean-done-button" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Clean up" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroNum}>{formatBytes(selectedTotal)}</Text>
          <Pressable onPress={() => setShowDetails((v) => !v)} testID="clean-view-details">
            <Text style={styles.viewDetails}>
              {showDetails ? "Hide details" : "View details"}{" "}
              <Ionicons name={showDetails ? "chevron-up" : "chevron-forward"} size={12} />
            </Text>
          </Pressable>
        </View>

        {showDetails ? (
          <Card style={{ marginBottom: spacing.lg, gap: spacing.xs }}>
            {cats.map((c) => (
              <Pressable
                key={c.key}
                style={styles.catRow}
                onPress={() => toggle(c.key)}
                testID={`clean-cat-${c.key}`}
              >
                <IconChip name={c.icon as any} color={c.color} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.catLabel}>{c.label}</Text>
                  <Text style={styles.catSize}>{formatBytes(c.bytes)}</Text>
                </View>
                <Ionicons
                  name={c.selected ? "checkbox" : "square-outline"}
                  size={24}
                  color={c.selected ? colors.brand : colors.borderStrong}
                />
              </Pressable>
            ))}
          </Card>
        ) : null}

        {snap ? (
          <View style={{ marginBottom: spacing.lg }}>
            <StorageCard
              used={snap.storageUsed}
              total={snap.storageTotal}
              segments={storageBreakdown(snap).map((s) => ({
                key: s.key,
                color: s.color,
                bytes: s.bytes,
              }))}
            />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Recommended cleanup</Text>
        <Card style={styles.burstCard}>
          <View style={[styles.burstThumb]}>
            <Ionicons name="images" size={26} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.catLabel}>Burst photos</Text>
            <Text style={styles.catSize}>86 photos · about 146 MB</Text>
          </View>
          <View style={styles.burstBtns}>
            <Pressable
              style={styles.ignoreBtn}
              onPress={() => toast("Ignored burst photos", "info")}
              testID="clean-burst-ignore"
            >
              <Text style={styles.ignoreText}>Ignore</Text>
            </Pressable>
            <Pressable
              style={styles.cleanupBtn}
              onPress={() => router.push("/duplicates")}
              testID="clean-burst-cleanup"
            >
              <Text style={styles.cleanupText}>Clean up</Text>
            </Pressable>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>App cleanup</Text>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {APP_CLEANERS.map((a, i) => (
            <Pressable
              key={a.key}
              style={[styles.appRow, i < APP_CLEANERS.length - 1 && styles.appRowBorder]}
              onPress={() => toast(`Cleaned ${a.name}`, "success")}
              testID={`clean-app-${a.key}`}
            >
              <View style={[styles.chip, { backgroundColor: a.color + "1A" }]}>
                <Ionicons name={a.icon as any} size={20} color={a.color} />
              </View>
              <Text style={[styles.catLabel, { flex: 1 }]}>{a.name}</Text>
              <Text style={styles.appSize}>{formatBytes(a.bytes)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {cleaning ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width }]} />
            </View>
            <Text style={styles.progressText}>Cleaning…</Text>
          </View>
        ) : (
          <PillButton
            testID="clean-action-button"
            label={selectedTotal > 0 ? `Clean ${formatBytes(selectedTotal)}` : "Nothing to clean"}
            onPress={clean}
            disabled={selectedTotal <= 0}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.lg, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  hero: { alignItems: "center", paddingVertical: spacing.lg },
  heroNum: { fontSize: 44, fontWeight: "800", color: colors.onSurface },
  viewDetails: { fontSize: font.base, color: colors.brand, fontWeight: "600", marginTop: spacing.xs },
  catRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  catLabel: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  catSize: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: font.base,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  burstCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  burstThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.warning + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  burstBtns: { alignItems: "flex-end", gap: spacing.xs },
  ignoreBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary },
  ignoreText: { fontSize: font.sm, color: colors.onSurface, fontWeight: "600" },
  cleanupBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.brand },
  cleanupText: { fontSize: font.sm, color: "#fff", fontWeight: "700" },
  appRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  appRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  appSize: { fontSize: font.base, color: colors.muted, fontWeight: "600" },
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
  progressWrap: { gap: spacing.sm, minHeight: 56, justifyContent: "center" },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 5 },
  progressText: { fontSize: font.base, color: colors.brand, fontWeight: "600", textAlign: "center" },
  summaryWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  summaryBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.lifted,
  },
  summaryFreed: { fontSize: 40, fontWeight: "800", color: colors.onSurface, marginTop: spacing.xl },
  summarySub: { fontSize: font.lg, color: colors.muted, marginTop: spacing.xs },
  summaryHint: {
    fontSize: font.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 22,
  },
});
