import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, font, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const SCHEDULES = ["off", "daily", "weekly"] as const;

export default function Settings() {
  const router = useRouter();
  const [autopilot, setAutopilot] = useState(false);
  const [schedule, setSchedule] = useState<(typeof SCHEDULES)[number]>("weekly");
  const [notifications, setNotifications] = useState(true);

  const loadPrefs = useCallback(async () => {
    try {
      const p = await api.getPrefs();
      setAutopilot(!!p.autopilot);
      setSchedule(p.schedule || "weekly");
      setNotifications(p.notifications !== false);
    } catch {}
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const save = (patch: Record<string, any>) => {
    api
      .updatePrefs({ premium: true, autopilot, schedule, notifications, ...patch })
      .catch(() => {});
  };

  const Row = ({
    icon,
    color,
    title,
    sub,
    right,
    onPress,
    testID,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    title: string;
    sub?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }) => (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress} testID={testID}>
      <View style={[styles.chip, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} /> : null)}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        {/* All-free banner */}
        <View style={styles.premiumCard} testID="settings-freebanner">
          <View style={styles.premChip}>
            <Ionicons name="gift" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premTitle}>All tools unlocked</Text>
            <Text style={styles.premSub}>Every feature is free — no subscription needed</Text>
          </View>
        </View>

        <Text style={styles.section}>Smart Auto-Pilot</Text>
        <View style={styles.card}>
          <Row
            icon="rocket"
            color={colors.brand}
            title="Auto-Pilot clean"
            sub="Clean junk when charging, idle & on WiFi"
            right={
              <Switch
                value={autopilot}
                onValueChange={(v) => {
                  setAutopilot(v);
                  save({ autopilot: v });
                }}
                trackColor={{ true: colors.brand, false: colors.borderStrong }}
                thumbColor="#fff"
                testID="settings-autopilot-switch"
              />
            }
          />
          {autopilot ? (
            <View style={styles.scheduleRow}>
              {SCHEDULES.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.schedChip, schedule === s && styles.schedChipOn]}
                  onPress={() => {
                    setSchedule(s);
                    save({ schedule: s });
                  }}
                  testID={`settings-schedule-${s}`}
                >
                  <Text style={[styles.schedText, schedule === s && styles.schedTextOn]}>
                    {s === "off" ? "Off" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          <Row
            icon="notifications"
            color={colors.warning}
            title="Clean summaries"
            sub="Get a note when Auto-Pilot frees space"
            right={
              <Switch
                value={notifications}
                onValueChange={(v) => {
                  setNotifications(v);
                  save({ notifications: v });
                }}
                trackColor={{ true: colors.brand, false: colors.borderStrong }}
                thumbColor="#fff"
                testID="settings-notifications-switch"
              />
            }
          />
        </View>

        <Text style={styles.section}>Data & permissions</Text>
        <View style={styles.card}>
          <Row icon="images" color={colors.info} title="Photo permissions" sub="Manage library access" onPress={() => router.push("/duplicates")} testID="settings-photos" />
          <View style={styles.divider} />
          <Row icon="trash-bin" color={colors.error} title="Trash & recovery" sub="Restore or empty deleted items" onPress={() => router.push("/trash")} testID="settings-trash" />
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row icon="information-circle" color={colors.muted} title="Device Manager Pro" sub="Version 1.0.0" />
          <View style={styles.divider} />
          <Row
            icon="shield-checkmark"
            color={colors.brand}
            title="Honest metrics promise"
            sub="No fake RAM/CPU boost claims — real space freed only"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brandTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand + "40",
  },
  premChip: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  premTitle: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  premSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  section: { fontSize: font.base, fontWeight: "700", color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, ...shadow.card },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  chip: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  rowSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg + 44 + spacing.md },
  scheduleRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  schedChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, alignItems: "center" },
  schedChipOn: { backgroundColor: colors.brand },
  schedText: { fontSize: font.base, fontWeight: "600", color: colors.onSurface },
  schedTextOn: { color: "#fff" },
});
