import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { haptics } from "@/src/lib/haptics";
import { colors, font, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { PillButton, ScreenHeader } from "@/src/components/ui";
import { ScoreGauge } from "@/src/components/ScoreGauge";
import {
  computeHealthScore,
  estimateJunk,
  getDeviceSnapshot,
} from "@/src/lib/device";
import { api } from "@/src/lib/api";
import { useApp } from "@/src/lib/store";

type Task = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
  status: "todo" | "done";
};

export default function Optimise() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();
  const [score, setScore] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([
    { key: "storage", title: "Storage cleanup", subtitle: "Clear junk files to free up space", icon: "sparkles", color: colors.info, route: "/clean", status: "todo" },
    { key: "boost", title: "System boost", subtitle: "Close background apps to run faster", icon: "flash", color: colors.brand, status: "todo" },
    { key: "virus", title: "Viruses & risks", subtitle: "Detect and remove threats", icon: "shield-checkmark", color: colors.warning, route: "/security", status: "todo" },
    { key: "battery", title: "Battery saver", subtitle: "Optimise power for longer life", icon: "battery-charging", color: colors.error, status: "todo" },
  ]);

  const load = useCallback(async () => {
    const s = await getDeviceSnapshot();
    const j = estimateJunk(s);
    const hs = computeHealthScore({
      storageUsed: s.storageUsed,
      storageTotal: s.storageTotal,
      duplicateCount: 0,
      junkBytes: j.total,
      batteryLevel: s.batteryLevel,
    });
    setScore(hs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runTask = (key: string) => {
    const t = tasks.find((x) => x.key === key);
    if (t?.route) {
      router.push(t.route as any);
      return;
    }
    haptics.success();
    setTasks((prev) => prev.map((x) => (x.key === key ? { ...x, status: "done" } : x)));
    setScore((s) => Math.min(100, s + 3));
    toast(`${t?.title} applied`, "success");
  };

  const runAll = async () => {
    haptics.success();
    setTasks((prev) => prev.map((x) => ({ ...x, status: "done" })));
    setScore((s) => Math.min(100, s + 8));
    try {
      await api.saveScan({ type: "optimise", health_score: Math.min(100, score + 8) });
    } catch {}
    toast("Device optimised", "success");
    setTimeout(() => router.back(), 700);
  };

  const status = score >= 80 ? "Good" : score >= 55 ? "Fair" : "Poor";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Optimise" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.statusBig}>{status}</Text>
            <Text style={styles.statusSub}>
              {tasks.filter((t) => t.status === "todo").length} recommendations
            </Text>
          </View>
          <ScoreGauge score={score} size={92} strokeWidth={9} unit="pts" />
        </View>

        <Text style={styles.section}>Recommended optimisations</Text>
        <View style={styles.card}>
          {tasks.map((t, i) => (
            <View key={t.key} style={[styles.row, i < tasks.length - 1 && styles.rowBorder]}>
              <View style={[styles.chip, { backgroundColor: t.color + "1A" }]}>
                <Ionicons name={t.icon} size={20} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t.title}</Text>
                <Text style={styles.rowSub}>{t.subtitle}</Text>
              </View>
              {t.status === "done" ? (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              ) : (
                <View style={styles.goBtn}>
                  <Text style={styles.goText} onPress={() => runTask(t.key)} testID={`optimise-go-${t.key}`}>
                    Go
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PillButton label="Optimise all" onPress={runAll} testID="optimise-done-button" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md },
  statusBig: { fontSize: font.huge, fontWeight: "800", color: colors.brand },
  statusSub: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs },
  section: { fontSize: font.base, fontWeight: "700", color: colors.muted, marginTop: spacing.md, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadow.card },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  rowSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  goBtn: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  goText: { fontSize: font.base, fontWeight: "700", color: colors.onSurface },
  doneBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
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
