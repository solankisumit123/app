import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { Card, ScreenHeader } from "@/src/components/ui";
import { DonutChart, DonutLegend } from "@/src/components/DonutChart";
import { DeviceSnapshot, getDeviceSnapshot, storageBreakdown } from "@/src/lib/device";

const LARGE_FILES = [
  { name: "Vacation_4K.mp4", type: "Video", bytes: 1.8 * 1024 * 1024 * 1024, icon: "videocam", color: colors.info },
  { name: "Podcast_ep_142.wav", type: "Audio", bytes: 512 * 1024 * 1024, icon: "musical-notes", color: colors.purple },
  { name: "Backup_2025.zip", type: "Archive", bytes: 890 * 1024 * 1024, icon: "archive", color: colors.warning },
  { name: "Design_assets.psd", type: "Document", bytes: 340 * 1024 * 1024, icon: "document", color: colors.brand },
  { name: "Screen_recording.mov", type: "Video", bytes: 220 * 1024 * 1024, icon: "videocam", color: colors.info },
];

export default function Storage() {
  const router = useRouter();
  const [snap, setSnap] = useState<DeviceSnapshot | null>(null);

  const load = useCallback(async () => {
    setSnap(await getDeviceSnapshot());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const slices = snap ? storageBreakdown(snap) : [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Storage analyzer" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        {snap ? (
          <Card style={styles.chartCard}>
            <DonutChart
              slices={slices}
              centerTop={formatBytes(snap.storageUsed, 0)}
              centerBottom={`of ${formatBytes(snap.storageTotal, 0)}`}
            />
            <View style={{ height: spacing.lg }} />
            <DonutLegend slices={slices} />
          </Card>
        ) : null}

        <Text style={styles.section}>Large files (&gt;50 MB)</Text>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {LARGE_FILES.map((f, i) => (
            <View key={f.name} style={[styles.row, i < LARGE_FILES.length - 1 && styles.rowBorder]}>
              <View style={[styles.chip, { backgroundColor: f.color + "1A" }]}>
                <Ionicons name={f.icon as any} size={20} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.type}>{f.type}</Text>
              </View>
              <Text style={styles.size}>{formatBytes(f.bytes)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  chartCard: { alignItems: "center", marginTop: spacing.md },
  section: { fontSize: font.base, fontWeight: "700", color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  name: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  type: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  size: { fontSize: font.base, color: colors.muted, fontWeight: "700" },
});
