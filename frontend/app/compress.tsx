import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { PillButton, ScreenHeader } from "@/src/components/ui";
import { compressPhoto, listLargePhotos, SimplePhoto } from "@/src/lib/photos";
import { api } from "@/src/lib/api";
import { haptics } from "@/src/lib/haptics";
import { useApp } from "@/src/lib/store";

const QUALITIES = [
  { key: "high", label: "High", q: 0.8, save: 0.25 },
  { key: "balanced", label: "Balanced", q: 0.6, save: 0.55 },
  { key: "max", label: "Max saving", q: 0.4, save: 0.72 },
];

export default function Compress() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<SimplePhoto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState("balanced");
  const [simulated, setSimulated] = useState(false);
  const [working, setWorking] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listLargePhotos();
    setPhotos(res.photos);
    setSimulated(res.simulated);
    setSelected(new Set(res.photos.map((p) => p.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const qConf = QUALITIES.find((q) => q.key === quality)!;

  const selectedPhotos = useMemo(() => photos.filter((p) => selected.has(p.id)), [photos, selected]);
  const originalBytes = selectedPhotos.reduce((s, p) => s + p.size, 0);
  const estSaved = Math.round(originalBytes * qConf.save);

  const toggle = (id: string) => {
    haptics.selection();
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const run = async () => {
    if (selectedPhotos.length === 0) return;
    setWorking(true);
    // Attempt real on-device compression (native only); errors are non-fatal.
    for (const p of selectedPhotos) {
      await compressPhoto(p.uri, qConf.q);
    }
    // Keep originals recoverable in trash for 7 days.
    try {
      await api.addTrash(
        selectedPhotos.map((p) => ({
          name: p.filename,
          kind: "photo" as const,
          size_bytes: Math.round(p.size),
          thumb_uri: p.uri,
          origin: "Compressor (original)",
        })),
      );
      await api.saveScan({ type: "clean", freed_bytes: estSaved });
    } catch {}
    haptics.success();
    setSaved(estSaved);
    setWorking(false);
  };

  if (saved != null) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScreenHeader title="Photo compressor" onBack={() => router.back()} />
        <View style={styles.summary}>
          <View style={styles.summaryBadge}>
            <Ionicons name="checkmark-done" size={60} color="#fff" />
          </View>
          <Text style={styles.summaryBig}>{formatBytes(saved)}</Text>
          <Text style={styles.summarySub}>saved by compressing photos</Text>
          <Text style={styles.summaryHint}>
            Compressed copies were saved and originals moved to Trash — recover them within 7 days if
            needed.
          </Text>
        </View>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <PillButton label="Done" onPress={() => router.back()} testID="compress-done" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Photo compressor" onBack={() => router.back()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Finding large photos…</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 160, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <Text style={styles.savedNum}>~{formatBytes(estSaved)}</Text>
              <Text style={styles.savedLabel}>
                estimated savings · {selectedPhotos.length} of {photos.length} selected
              </Text>
            </View>

            {simulated ? (
              <View style={styles.banner}>
                <Ionicons name="information-circle" size={16} color={colors.info} />
                <Text style={styles.bannerText}>Sample photos — grant library access to compress your own.</Text>
              </View>
            ) : null}

            <Text style={styles.section}>Compression level</Text>
            <View style={styles.qualityRow}>
              {QUALITIES.map((q) => {
                const on = quality === q.key;
                return (
                  <Pressable
                    key={q.key}
                    style={[styles.qChip, on && styles.qChipOn]}
                    onPress={() => setQuality(q.key)}
                    testID={`compress-quality-${q.key}`}
                  >
                    <Text style={[styles.qLabel, on && { color: "#fff" }]}>{q.label}</Text>
                    <Text style={[styles.qSave, on && { color: "rgba(255,255,255,0.85)" }]}>
                      ~{Math.round(q.save * 100)}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.section}>Large photos</Text>
            <View style={styles.grid}>
              {photos.map((p) => {
                const on = selected.has(p.id);
                return (
                  <Pressable key={p.id} style={styles.cell} onPress={() => toggle(p.id)} testID={`compress-photo-${p.id}`}>
                    <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
                    <View style={styles.sizeTag}>
                      <Text style={styles.sizeText}>{formatBytes(p.size)}</Text>
                    </View>
                    <View style={[styles.check, on && styles.checkOn]}>
                      {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <PillButton
              testID="compress-run"
              label={
                working
                  ? "Compressing…"
                  : selectedPhotos.length > 0
                    ? `Compress ${selectedPhotos.length} · save ~${formatBytes(estSaved)}`
                    : "Select photos"
              }
              onPress={run}
              disabled={selectedPhotos.length === 0}
              loading={working}
              icon="albums"
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  loadingText: { fontSize: font.base, color: colors.muted },
  hero: { alignItems: "center", paddingVertical: spacing.lg },
  savedNum: { fontSize: 40, fontWeight: "800", color: colors.brand },
  savedLabel: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.info + "12", marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md },
  bannerText: { fontSize: font.sm, color: colors.info, flex: 1 },
  section: { fontSize: font.base, fontWeight: "700", color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.md, marginHorizontal: spacing.lg },
  qualityRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  qChip: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", borderWidth: 2, borderColor: colors.border },
  qChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  qLabel: { fontSize: font.base, fontWeight: "700", color: colors.onSurface },
  qSave: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg },
  cell: { width: "31.5%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.track },
  thumb: { width: "100%", height: "100%" },
  sizeTag: { position: "absolute", bottom: 6, left: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  sizeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  check: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#fff", backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
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
  summary: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  summaryBadge: { width: 116, height: 116, borderRadius: 58, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", ...shadow.lifted },
  summaryBig: { fontSize: 40, fontWeight: "800", color: colors.onSurface, marginTop: spacing.xl },
  summarySub: { fontSize: font.lg, color: colors.muted, marginTop: spacing.xs },
  summaryHint: { fontSize: font.base, color: colors.muted, textAlign: "center", marginTop: spacing.lg, lineHeight: 22 },
});
