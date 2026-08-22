import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
import { Platform } from "react-native";
import { haptics } from "@/src/lib/haptics";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { PillButton, ScreenHeader } from "@/src/components/ui";
import {
  DuplicateGroup,
  requestPhotoPermission,
  ensurePhotoPermission,
  scanDuplicates,
} from "@/src/lib/photos";
import { api } from "@/src/lib/api";
import { useApp } from "@/src/lib/store";

type Phase = "intro" | "denied" | "scanning" | "results";

export default function Duplicates() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();

  const [phase, setPhase] = useState<Phase>("intro");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [simulated, setSimulated] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const startScan = useCallback(async () => {
    setPhase("scanning");
    const res = await scanDuplicates();
    setGroups(res.groups);
    setSimulated(res.simulated);
    // Smart default: select all except the suggested best in each group
    const preset = new Set<string>();
    res.groups.forEach((g) => {
      g.assets.forEach((a) => {
        if (a.id !== g.bestId) preset.add(a.id);
      });
    });
    setSelected(preset);
    const dupTotal = res.groups.reduce((a, g) => a + (g.assets.length - 1), 0);
    try {
      await api.saveScan({
        type: "duplicate",
        duplicate_count: dupTotal,
        photo_count: res.photoCount,
      });
    } catch {}
    setPhase("results");
  }, []);

  const requestAndScan = useCallback(async () => {
    if (Platform.OS === "web") {
      startScan();
      return;
    }
    const current = await ensurePhotoPermission();
    if (current?.granted) {
      startScan();
      return;
    }
    if (current && !current.canAskAgain) {
      setCanAskAgain(false);
      setPhase("denied");
      return;
    }
    const res = await requestPhotoPermission();
    if (res?.granted) {
      startScan();
    } else {
      setCanAskAgain(res?.canAskAgain ?? false);
      setPhase("denied");
    }
  }, [startScan]);

  const toggle = (id: string) => {
    haptics.selection();
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const allAssets = useMemo(() => groups.flatMap((g) => g.assets), [groups]);
  const selectedBytes = useMemo(
    () => allAssets.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.size, 0),
    [allAssets, selected],
  );
  const totalDup = groups.reduce((a, g) => a + (g.assets.length - 1), 0);

  const moveToTrash = async () => {
    const items = allAssets
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        name: a.filename,
        kind: "photo" as const,
        size_bytes: Math.round(a.size),
        thumb_uri: a.uri,
        origin: "Duplicate Finder",
      }));
    if (items.length === 0) return;
    try {
      await api.addTrash(items);
    } catch {}
    haptics.success();
    // remove moved assets from groups
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, assets: g.assets.filter((a) => !selected.has(a.id)) }))
        .filter((g) => g.assets.length > 1),
    );
    setSelected(new Set());
    toast(`${items.length} photos moved to Trash · ${formatBytes(selectedBytes)}`, "success");
  };

  const selectAllExceptBest = () => {
    const preset = new Set<string>();
    groups.forEach((g) => g.assets.forEach((a) => a.id !== g.bestId && preset.add(a.id)));
    setSelected(preset);
    haptics.impact();
  };

  // ---------- Render phases ----------
  if (phase === "intro") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader title="Photo cleanup" onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={[styles.introBadge]}>
            <Ionicons name="images" size={56} color={colors.info} />
          </View>
          <Text style={styles.introTitle}>Find duplicate photos</Text>
          <Text style={styles.introBody}>
            We&apos;ll scan your library for burst shots, similar photos and exact duplicates so you
            can keep only the best one. Nothing leaves your device.
          </Text>
          <PillButton
            testID="dup-start-scan"
            label="Scan my photos"
            icon="scan"
            onPress={requestAndScan}
            style={{ alignSelf: "stretch", marginTop: spacing.xl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "denied") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader title="Photo cleanup" onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={[styles.introBadge, { backgroundColor: colors.warning + "1A" }]}>
            <Ionicons name="lock-closed" size={48} color={colors.warning} />
          </View>
          <Text style={styles.introTitle}>Photo access needed</Text>
          <Text style={styles.introBody}>
            To find duplicates we need permission to read your photo library. You can grant access
            in Settings.
          </Text>
          {canAskAgain ? (
            <PillButton
              testID="dup-retry-permission"
              label="Allow access"
              onPress={requestAndScan}
              style={{ alignSelf: "stretch", marginTop: spacing.xl }}
            />
          ) : (
            <PillButton
              testID="dup-open-settings"
              label="Open Settings"
              icon="settings"
              onPress={() => Linking.openSettings()}
              style={{ alignSelf: "stretch", marginTop: spacing.xl }}
            />
          )}
          <Pressable onPress={() => startScan()} style={{ marginTop: spacing.lg }} testID="dup-demo">
            <Text style={styles.demoLink}>Preview with sample photos</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "scanning") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader title="Photo cleanup" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.introTitle}>Scanning your photos…</Text>
          <Text style={styles.introBody}>Hashing and grouping similar shots.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // results
  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader title="Photo cleanup" onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={[styles.introBadge, { backgroundColor: colors.brand + "1A" }]}>
            <Ionicons name="checkmark-done" size={56} color={colors.brand} />
          </View>
          <Text style={styles.introTitle}>No duplicates left!</Text>
          <Text style={styles.introBody}>Your photo library is nice and tidy.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="Photo cleanup"
        onBack={() => router.back()}
        right={
          <Pressable onPress={selectAllExceptBest} hitSlop={8} testID="dup-smart-select">
            <Ionicons name="sparkles" size={22} color={colors.brand} />
          </Pressable>
        }
      />
      {simulated ? (
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={16} color={colors.info} />
          <Text style={styles.bannerText}>Showing sample photos — grant library access for your own.</Text>
        </View>
      ) : null}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryBig}>{totalDup}</Text>
        <Text style={styles.summaryLabel}>duplicates found · up to {formatBytes(
          groups.reduce((a, g) => a + g.totalBytes - g.totalBytes / g.assets.length, 0),
        )}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: spacing.lg, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }}>
        {groups.map((g) => (
          <View key={g.id} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{g.label}</Text>
              <Text style={styles.groupCount}>{g.assets.length} photos</Text>
            </View>
            <View style={styles.photoGrid}>
              {g.assets.map((a) => {
                const isSel = selected.has(a.id);
                const isBest = a.id === g.bestId;
                return (
                  <Pressable
                    key={a.id}
                    style={styles.photoWrap}
                    onPress={() => toggle(a.id)}
                    testID={`dup-photo-${a.id}`}
                  >
                    <Image source={{ uri: a.uri }} style={styles.photo} contentFit="cover" />
                    {isBest ? (
                      <View style={styles.bestTag}>
                        <Text style={styles.bestText}>BEST</Text>
                      </View>
                    ) : null}
                    <View style={[styles.check, isSel && styles.checkOn]}>
                      {isSel ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PillButton
          testID="dup-move-trash"
          label={
            selected.size > 0
              ? `Move ${selected.size} to Trash · ${formatBytes(selectedBytes)}`
              : "Select photos to clean"
          }
          onPress={moveToTrash}
          disabled={selected.size === 0}
          icon="trash"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  introBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.info + "1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  introTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  introBody: { fontSize: font.base, color: colors.muted, textAlign: "center", lineHeight: 22 },
  demoLink: { fontSize: font.base, color: colors.brand, fontWeight: "600" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.info + "12",
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: { fontSize: font.sm, color: colors.info, flex: 1 },
  summaryRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  summaryBig: { fontSize: font.huge, fontWeight: "800", color: colors.onSurface },
  summaryLabel: { fontSize: font.base, color: colors.muted, flex: 1 },
  group: { marginBottom: spacing.lg },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  groupTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  groupCount: { fontSize: font.sm, color: colors.muted },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoWrap: { width: "31.5%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.track },
  photo: { width: "100%", height: "100%" },
  bestTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  check: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.error, borderColor: colors.error },
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
