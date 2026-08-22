import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
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
import { listOldPhotos, SimplePhoto } from "@/src/lib/photos";
import { api } from "@/src/lib/api";
import { haptics } from "@/src/lib/haptics";
import { useApp } from "@/src/lib/store";

function monthsAgo(t: number): number {
  const norm = t < 1e12 ? t * 1000 : t;
  return Math.max(1, Math.round((Date.now() - norm) / (30 * 86400000)));
}

export default function Offload() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<SimplePhoto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [simulated, setSimulated] = useState(false);
  const [backedUp, setBackedUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listOldPhotos();
    setPhotos(res.photos);
    setSimulated(res.simulated);
    setSelected(new Set(res.photos.map((p) => p.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPhotos = useMemo(() => photos.filter((p) => selected.has(p.id)), [photos, selected]);
  const reclaimable = selectedPhotos.reduce((s, p) => s + p.size, 0);

  const toggle = (id: string) => {
    haptics.selection();
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const openCloud = () => {
    const url = Platform.OS === "ios" ? "photos-navigation://" : "https://photos.google.com";
    Linking.openURL(url).catch(() => {
      Linking.openURL("https://photos.google.com").catch(() => {});
    });
    setBackedUp(true);
    toast("Opened your cloud photos to back up", "info");
  };

  const freeSpace = async () => {
    if (selectedPhotos.length === 0) return;
    try {
      await api.addTrash(
        selectedPhotos.map((p) => ({
          name: p.filename,
          kind: "photo" as const,
          size_bytes: Math.round(p.size),
          thumb_uri: p.uri,
          origin: "Cloud offload",
        })),
      );
      await api.saveScan({ type: "clean", freed_bytes: reclaimable });
    } catch {}
    haptics.success();
    setPhotos((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    toast(`${formatBytes(reclaimable)} moved to Trash — recover within 7 days`, "success");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Cloud offload" onBack={() => router.back()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Scanning for old photos…</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.badge, { backgroundColor: colors.brand + "1A" }]}>
            <Ionicons name="cloud-done" size={52} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Nothing to offload</Text>
          <Text style={styles.loadingText}>No photos older than 6 months were found.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 180, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroBadge}>
                <Ionicons name="cloud-upload" size={30} color="#fff" />
              </View>
              <Text style={styles.heroNum}>{formatBytes(reclaimable)}</Text>
              <Text style={styles.heroLabel}>
                {selectedPhotos.length} old photos you can back up & free
              </Text>
            </View>

            {simulated ? (
              <View style={styles.banner}>
                <Ionicons name="information-circle" size={16} color={colors.info} />
                <Text style={styles.bannerText}>Sample photos — grant library access to scan your own.</Text>
              </View>
            ) : null}

            <Text style={styles.note}>
              These photos haven&apos;t been opened in 6+ months. Back them up to your cloud first,
              then free up local space. Originals stay recoverable in Trash for 7 days.
            </Text>

            {photos.map((p) => {
              const on = selected.has(p.id);
              return (
                <Pressable key={p.id} style={styles.row} onPress={() => toggle(p.id)} testID={`offload-photo-${p.id}`}>
                  <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{p.filename}</Text>
                    <Text style={styles.meta}>
                      {formatBytes(p.size)} · {monthsAgo(p.creationTime)} months ago
                    </Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <Pressable style={styles.cloudBtn} onPress={openCloud} testID="offload-open-cloud">
              <Ionicons name="cloud-upload" size={18} color={colors.brand} />
              <Text style={styles.cloudText}>Open cloud backup</Text>
            </Pressable>
            <PillButton
              testID="offload-free-space"
              label={
                selectedPhotos.length > 0
                  ? `Free ${formatBytes(reclaimable)}`
                  : "Select photos"
              }
              onPress={freeSpace}
              disabled={selectedPhotos.length === 0}
              icon="trash"
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  loadingText: { fontSize: font.base, color: colors.muted, textAlign: "center" },
  badge: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface },
  hero: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs },
  heroBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.info, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm, ...shadow.lifted },
  heroNum: { fontSize: 40, fontWeight: "800", color: colors.onSurface },
  heroLabel: { fontSize: font.base, color: colors.muted },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.info + "12", marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md },
  bannerText: { fontSize: font.sm, color: colors.info, flex: 1 },
  note: { fontSize: font.sm, color: colors.mutedLight, paddingHorizontal: spacing.lg, lineHeight: 18, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.track },
  name: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  meta: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lifted,
  },
  cloudBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.brand },
  cloudText: { fontSize: font.base, fontWeight: "700", color: colors.brand },
});
