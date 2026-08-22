import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { haptics } from "@/src/lib/haptics";
import { colors, font, formatBytes, radius, shadow, spacing } from "@/src/theme";
import { PillButton, ScreenHeader } from "@/src/components/ui";
import { useApp } from "@/src/lib/store";

type App = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bytes: number;
  lastUsedDays: number;
};

const APPS: App[] = [
  { key: "game", name: "Racing Fever 3D", icon: "game-controller", color: colors.error, bytes: 2.4 * 1024 * 1024 * 1024, lastUsedDays: 96 },
  { key: "edit", name: "Photo Editor Pro", icon: "brush", color: colors.purple, bytes: 780 * 1024 * 1024, lastUsedDays: 64 },
  { key: "map", name: "Maps Offline", icon: "map", color: colors.brand, bytes: 1.1 * 1024 * 1024 * 1024, lastUsedDays: 12 },
  { key: "news", name: "Daily News", icon: "newspaper", color: colors.info, bytes: 160 * 1024 * 1024, lastUsedDays: 45 },
  { key: "shop", name: "ShopMart", icon: "cart", color: colors.warning, bytes: 340 * 1024 * 1024, lastUsedDays: 3 },
  { key: "note", name: "Notes Plus", icon: "document-text", color: colors.info, bytes: 90 * 1024 * 1024, lastUsedDays: 120 },
];

type Sort = "size" | "unused" | "name";

export default function Apps() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();
  const [sort, setSort] = useState<Sort>("size");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const arr = [...APPS];
    if (sort === "size") arr.sort((a, b) => b.bytes - a.bytes);
    if (sort === "unused") arr.sort((a, b) => b.lastUsedDays - a.lastUsedDays);
    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [sort]);

  const toggle = (key: string) => {
    haptics.selection();
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const selectedBytes = APPS.filter((a) => selected.has(a.key)).reduce((s, a) => s + a.bytes, 0);

  const exportList = async () => {
    const text = APPS.map((a) => `${a.name} — ${formatBytes(a.bytes)} — ${a.key}`).join("\n");
    try {
      await Share.share({ message: `Device Manager Pro — App list\n\n${text}` });
    } catch {}
  };

  const uninstall = () => {
    if (selected.size === 0) return;
    toast(
      `${selected.size} apps queued — confirm removal in system dialog`,
      "info",
    );
    setSelected(new Set());
  };

  const SortChip = ({ value, label }: { value: Sort; label: string }) => (
    <Pressable
      onPress={() => setSort(value)}
      style={[styles.chipBtn, sort === value && styles.chipBtnOn]}
      testID={`apps-sort-${value}`}
    >
      <Text style={[styles.chipBtnText, sort === value && styles.chipBtnTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="App management"
        onBack={() => router.back()}
        right={
          <Pressable onPress={exportList} hitSlop={8} testID="apps-export">
            <Ionicons name="share-outline" size={22} color={colors.brand} />
          </Pressable>
        }
      />
      <View style={styles.filterRow}>
        <SortChip value="size" label="Largest" />
        <SortChip value="unused" label="Unused" />
        <SortChip value="name" label="A–Z" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        {sorted.map((a) => {
          const isSel = selected.has(a.key);
          const unused = a.lastUsedDays >= 60;
          return (
            <Pressable
              key={a.key}
              style={styles.appRow}
              onPress={() => toggle(a.key)}
              testID={`apps-row-${a.key}`}
            >
              <View style={[styles.chip, { backgroundColor: a.color + "1A" }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={[styles.meta, unused && { color: colors.warning }]}>
                  {formatBytes(a.bytes)} · {unused ? `unused ${a.lastUsedDays}d` : `used ${a.lastUsedDays}d ago`}
                </Text>
              </View>
              <View style={[styles.check, isSel && styles.checkOn]}>
                {isSel ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PillButton
          testID="apps-uninstall"
          label={selected.size > 0 ? `Uninstall ${selected.size} · ${formatBytes(selectedBytes)}` : "Select apps to remove"}
          onPress={uninstall}
          disabled={selected.size === 0}
          variant="danger"
          icon="trash"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  filterRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chipBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.card, flexShrink: 0 },
  chipBtnOn: { backgroundColor: colors.brand },
  chipBtnText: { fontSize: font.base, fontWeight: "600", color: colors.onSurface },
  chipBtnTextOn: { color: "#fff" },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  chip: { width: 46, height: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  name: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  meta: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
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
