import { useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { haptics } from "@/src/lib/haptics";
import { colors, font, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { PillButton, ScreenHeader } from "@/src/components/ui";
import { useApp } from "@/src/lib/store";

type Item = {
  key: string;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  selected: boolean;
};

const INITIAL: Item[] = [
  { key: "search", label: "In-app search history", sub: "Recent searches in this app", icon: "search", color: colors.info, selected: true },
  { key: "clip", label: "Clipboard", sub: "Copied text still in memory", icon: "clipboard", color: colors.warning, selected: true },
  { key: "cache", label: "App cache", sub: "Temporary files this app stored", icon: "layers", color: colors.brand, selected: true },
  { key: "recent", label: "Recently viewed", sub: "Screens & items you opened", icon: "eye", color: colors.purple, selected: true },
];

export default function Privacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useApp();
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [sweeping, setSweeping] = useState(false);
  const [done, setDone] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const toggle = (key: string) => {
    haptics.selection();
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, selected: !i.selected } : i)));
  };

  const count = items.filter((i) => i.selected).length;

  const sweep = () => {
    if (count === 0) return;
    setSweeping(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => {
      setSweeping(false);
      setDone(true);
      haptics.success();
      toast("Privacy swept clean", "success");
    });
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Privacy cleaner" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name={done ? "shield-checkmark" : "eye-off"} size={40} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>{done ? "You're private" : "Privacy sweep"}</Text>
          <Text style={styles.heroSub}>
            {done ? "Selected traces were cleared." : "Clear traces this app can safely access."}
          </Text>
        </View>

        <View style={styles.card}>
          {items.map((it, i) => (
            <Pressable
              key={it.key}
              style={[styles.row, i < items.length - 1 && styles.rowBorder]}
              onPress={() => toggle(it.key)}
              testID={`privacy-item-${it.key}`}
            >
              <View style={[styles.chip, { backgroundColor: it.color + "1A" }]}>
                <Ionicons name={it.icon} size={20} color={it.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{it.label}</Text>
                <Text style={styles.sub}>{it.sub}</Text>
              </View>
              <Ionicons
                name={it.selected ? "checkbox" : "square-outline"}
                size={24}
                color={it.selected ? colors.brand : colors.borderStrong}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.note}>
          Note: On both platforms, apps can&apos;t clear other apps&apos; browser, call or SMS data.
          This sweep only clears data this app owns.
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {sweeping ? (
          <View style={{ gap: spacing.sm, minHeight: 56, justifyContent: "center" }}>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width }]} />
            </View>
            <Text style={styles.progressText}>Sweeping…</Text>
          </View>
        ) : (
          <PillButton
            testID="privacy-sweep-button"
            label={done ? "Done" : count > 0 ? `Privacy sweep (${count})` : "Nothing selected"}
            onPress={done ? () => router.back() : sweep}
            disabled={!done && count === 0}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs },
  heroBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    ...shadow.lifted,
  },
  heroTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface },
  heroSub: { fontSize: font.base, color: colors.muted, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginTop: spacing.md, ...shadow.card },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chip: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  label: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  sub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  note: { fontSize: font.sm, color: colors.mutedLight, marginTop: spacing.lg, lineHeight: 18 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.brand, borderRadius: 5 },
  progressText: { fontSize: font.base, color: colors.brand, fontWeight: "600", textAlign: "center" },
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
