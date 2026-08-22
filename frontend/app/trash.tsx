import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useApp } from "@/src/lib/store";

type TItem = {
  id: string;
  name: string;
  kind: string;
  size_bytes: number;
  thumb_uri?: string;
  expires_at: string;
  origin?: string;
};

function daysLeft(expires: string): number {
  const diff = new Date(expires).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function Trash() {
  const router = useRouter();
  const { toast } = useApp();
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await api.listTrash();
      setItems(data as TItem[]);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const ids = () => (selected.size ? [...selected] : items.map((i) => i.id));

  const restore = async () => {
    const target = ids();
    if (!target.length) return;
    await api.restoreTrash(target);
    setSelected(new Set());
    toast(`${target.length} item(s) restored`, "success");
    load();
  };

  const remove = async () => {
    const target = ids();
    if (!target.length) return;
    await api.deleteTrash(target);
    setSelected(new Set());
    toast(`${target.length} item(s) permanently deleted`, "error");
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Trash & recovery" onBack={() => router.back()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyBadge}>
            <Ionicons name="trash-bin" size={48} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Trash is empty</Text>
          <Text style={styles.emptySub}>
            Deleted items stay here for 7 days so you can recover them anytime.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
          >
            <Text style={styles.hint}>
              {items.length} items · recoverable for 7 days
            </Text>
            {items.map((it) => {
              const isSel = selected.has(it.id);
              const d = daysLeft(it.expires_at);
              return (
                <Pressable
                  key={it.id}
                  style={styles.row}
                  onPress={() => toggle(it.id)}
                  testID={`trash-item-${it.id}`}
                >
                  {it.thumb_uri ? (
                    <Image source={{ uri: it.thumb_uri }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbIcon]}>
                      <Ionicons name="document" size={22} color={colors.muted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={styles.meta}>
                      {formatBytes(it.size_bytes)}
                      {it.origin ? ` · ${it.origin}` : ""}
                    </Text>
                    <View style={styles.countdown}>
                      <Ionicons name="time" size={12} color={d <= 2 ? colors.error : colors.warning} />
                      <Text style={[styles.countdownText, { color: d <= 2 ? colors.error : colors.warning }]}>
                        {d} day{d === 1 ? "" : "s"} left
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.check, isSel && styles.checkOn]}>
                    {isSel ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.bottomBar}>
            <Pressable style={[styles.actionBtn, styles.restoreBtn]} onPress={restore} testID="trash-restore">
              <Ionicons name="arrow-undo" size={18} color="#fff" />
              <Text style={styles.actionText}>Restore{selected.size ? ` (${selected.size})` : " all"}</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={remove} testID="trash-delete">
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.actionText}>Delete{selected.size ? ` (${selected.size})` : " all"}</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  emptyBadge: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.brand + "1A", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface },
  emptySub: { fontSize: font.base, color: colors.muted, textAlign: "center", lineHeight: 22 },
  hint: { fontSize: font.sm, color: colors.muted, paddingVertical: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.track },
  thumbIcon: { alignItems: "center", justifyContent: "center" },
  name: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  meta: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  countdown: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  countdownText: { fontSize: font.sm, fontWeight: "600" },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lifted,
  },
  actionBtn: { flex: 1, minHeight: 52, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  restoreBtn: { backgroundColor: colors.brand },
  deleteBtn: { backgroundColor: colors.error },
  actionText: { color: "#fff", fontSize: font.base, fontWeight: "700" },
});
