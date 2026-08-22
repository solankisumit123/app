import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { Card, IconChip, PillButton, SectionHeader } from "@/src/components/ui";
import { ScoreGauge } from "@/src/components/ScoreGauge";
import {
  computeHealthScore,
  DeviceSnapshot,
  estimateJunk,
  getDeviceSnapshot,
} from "@/src/lib/device";
import { scanDuplicates } from "@/src/lib/photos";
import { api } from "@/src/lib/api";
import { getJSON, KEYS } from "@/src/lib/localstore";

type QuickCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof import("@expo/vector-icons/Ionicons").default.glyphMap;
  color: string;
  route: string;
};

function scoreStatus(score: number) {
  if (score >= 80) return { label: "Your system is in good condition.", color: colors.brand };
  if (score >= 55) return { label: "A quick clean will boost your device.", color: colors.warning };
  return { label: "Your device needs attention.", color: colors.error };
}

export default function Home() {
  const router = useRouter();
  const [snap, setSnap] = useState<DeviceSnapshot | null>(null);
  const [score, setScore] = useState(0);
  const [junk, setJunk] = useState(0);
  const [dupCount, setDupCount] = useState(0);
  const [tip, setTip] = useState<{ title: string; body: string; icon: string; ai?: boolean } | null>(null);
  const [predictDays, setPredictDays] = useState<number | null>(null);
  const [totalFreed, setTotalFreed] = useState(0);
  const [offloadDue, setOffloadDue] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await getDeviceSnapshot();
    const j = estimateJunk(s);
    const dup = await scanDuplicates();
    const dupTotal = dup.groups.reduce((a, g) => a + (g.assets.length - 1), 0);
    const hs = computeHealthScore({
      storageUsed: s.storageUsed,
      storageTotal: s.storageTotal,
      duplicateCount: dupTotal,
      junkBytes: j.total,
      batteryLevel: s.batteryLevel,
    });
    setSnap(s);
    setJunk(j.total);
    setDupCount(dupTotal);
    setScore(hs);

    try {
      await api.saveScan({
        type: "quick",
        health_score: hs,
        junk_bytes: Math.round(j.total),
        duplicate_count: dupTotal,
        photo_count: dup.photoCount,
        storage_used: Math.round(s.storageUsed),
        storage_total: Math.round(s.storageTotal),
        battery_level: s.batteryLevel,
      });
      const dash = await api.getDashboard();
      setTip(dash.tip);
      setPredictDays(dash.predict_days_until_full ?? null);
      // AI Phone Doctor — personalized daily tip (cached per day on the backend)
      try {
        const aiTip = await api.getAiTip();
        if (aiTip?.title) setTip(aiTip);
      } catch {}
      try {
        const stats = await api.getStats();
        setTotalFreed(stats.total_freed ?? 0);
      } catch {}
    } catch (e) {
      // offline — keep local values
    }
    // Auto-offload reminder: due if never offloaded or >30 days ago
    const last = await getJSON<number | null>(KEYS.lastOffload, null);
    setOffloadDue(!last || Date.now() - last > 30 * 86400000);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const status = scoreStatus(score);

  const cards: QuickCard[] = [
    {
      key: "clean",
      title: "Clean Up Storage",
      subtitle: snap
        ? `${formatBytes(snap.storageUsed, 0)} / ${formatBytes(snap.storageTotal, 0)}`
        : "—",
      icon: "sparkles",
      color: colors.info,
      route: "/clean",
    },
    {
      key: "security",
      title: "Viruses & risks",
      subtitle: "No risky apps",
      icon: "shield-checkmark",
      color: colors.brand,
      route: "/security",
    },
    {
      key: "duplicates",
      title: "Photo cleanup",
      subtitle: dupCount > 0 ? `${dupCount} duplicates` : "Scan photos",
      icon: "images",
      color: colors.warning,
      route: "/duplicates",
    },
    {
      key: "apps",
      title: "App management",
      subtitle: "Install, update & remove",
      icon: "apps",
      color: colors.purple,
      route: "/apps",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="rocket" size={16} color="#fff" />
            </View>
            <Text style={styles.brandName}>Device Manager Pro</Text>
          </View>
          <Pressable onPress={() => router.push("/trash")} hitSlop={8} testID="home-trash-button">
            <Ionicons name="trash-bin-outline" size={22} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.gaugeWrap}>
          <ScoreGauge score={score} size={190} color={status.color} />
          <Text style={styles.statusText}>{status.label}</Text>
          <PillButton
            testID="home-optimise-button"
            label="Optimise"
            icon="flash"
            onPress={() => router.push("/optimise")}
            style={styles.optimiseBtn}
          />
        </View>

        {tip ? (
          <Card style={styles.tipCard} testID="home-tip-card">
            <IconChip name={(tip.icon as any) || "bulb"} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <View style={styles.tipTitleRow}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                {tip.ai ? (
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={10} color={colors.brand} />
                    <Text style={styles.aiBadgeText}>AI</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.tipBody}>{tip.body}</Text>
              {predictDays != null ? (
                <Text style={styles.predict}>
                  <Ionicons name="trending-up" size={12} color={colors.warning} /> At this rate,
                  storage full in ~{predictDays} days
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}

        <View style={styles.grid}>
          {cards.map((c) => (
            <Pressable
              key={c.key}
              testID={`home-card-${c.key}`}
              onPress={() => router.push(c.route as any)}
              style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.85 }]}
            >
              <IconChip name={c.icon} color={c.color} />
              <Text style={styles.gridTitle} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={styles.gridSub} numberOfLines={1}>
                {c.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Tools" action="More" onAction={() => router.push("/(tabs)/tools")} />
        <View style={styles.toolsRow}>
          {[
            { icon: "image", label: "Photo cleanup", color: colors.brand, route: "/duplicates" },
            { icon: "pie-chart", label: "Storage", color: colors.info, route: "/storage" },
            { icon: "lock-closed", label: "Vault", color: colors.warning, route: "/(tabs)/vault" },
            { icon: "eye-off", label: "Privacy", color: colors.purple, route: "/privacy" },
          ].map((t) => (
            <Pressable
              key={t.label}
              testID={`home-tool-${t.label}`}
              style={styles.toolItem}
              onPress={() => router.push(t.route as any)}
            >
              <IconChip name={t.icon as any} color={t.color} />
              <Text style={styles.toolLabel} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  gaugeWrap: { alignItems: "center", paddingVertical: spacing.md },
  statusText: {
    fontSize: font.lg,
    color: colors.onSurface,
    fontWeight: "600",
    marginTop: spacing.lg,
  },
  optimiseBtn: { marginTop: spacing.lg, alignSelf: "stretch", marginHorizontal: spacing.xxl },
  tipCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    marginTop: spacing.lg,
  },
  tipTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  tipTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: "800", color: colors.brand },
  tipBody: { fontSize: font.base, color: colors.muted, marginTop: 2, lineHeight: 20 },
  predict: { fontSize: font.sm, color: colors.warning, fontWeight: "600", marginTop: spacing.sm },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    rowGap: spacing.md,
  },
  gridCard: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  gridTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xs },
  gridSub: { fontSize: font.sm, color: colors.muted },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  toolItem: { alignItems: "center", gap: spacing.sm, width: "23%" },
  toolLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary, textAlign: "center" },
});
