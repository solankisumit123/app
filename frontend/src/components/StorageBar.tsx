import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, font, formatBytes, radius, shadow, spacing } from "@/src/theme";

export type StorageSegment = { key: string; color: string; bytes: number };

export function StorageCard({
  used,
  total,
  segments,
}: {
  used: number;
  total: number;
  segments: StorageSegment[];
}) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.used}>{formatBytes(used, 0)} used</Text>
        <Text style={styles.total}>of {formatBytes(total, 0)}</Text>
      </View>
      <View style={styles.track}>
        <View style={styles.fill}>
          {segments.map((s) => {
            const width = total > 0 ? `${Math.max(0, (s.bytes / total) * 100)}%` : "0%";
            return <View key={s.key} style={{ width: width as any, backgroundColor: s.color, height: "100%" }} />;
          })}
        </View>
      </View>
      <Text style={styles.pctText}>{Math.round(pct * 100)}% full</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  headRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginBottom: spacing.sm },
  used: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  total: { fontSize: font.sm, color: colors.muted },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.track, overflow: "hidden" },
  fill: { flexDirection: "row", height: "100%", width: "100%" },
  pctText: { fontSize: font.sm, color: colors.muted, marginTop: spacing.sm },
});
