import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { colors, font, formatBytes, spacing } from "@/src/theme";

export type DonutSlice = { key: string; label?: string; color: string; bytes: number };

const SIZE = 180;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function DonutChart({
  slices,
  centerTop,
  centerBottom,
}: {
  slices: DonutSlice[];
  centerTop?: string;
  centerBottom?: string;
}) {
  const total = slices.reduce((a, s) => a + s.bytes, 0) || 1;
  let offset = 0;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      <Svg width={SIZE} height={SIZE}>
        <G rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.track} strokeWidth={STROKE} fill="none" />
          {slices.map((s) => {
            const fraction = s.bytes / total;
            const dash = fraction * CIRC;
            const el = (
              <Circle
                key={s.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={s.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${dash} ${CIRC - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.center}>
          {centerTop ? <Text style={styles.top}>{centerTop}</Text> : null}
          {centerBottom ? <Text style={styles.bottom}>{centerBottom}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function DonutLegend({ slices }: { slices: DonutSlice[] }) {
  return (
    <View style={styles.legend}>
      {slices.map((s) => (
        <View key={s.key} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {s.label ?? s.key}
          </Text>
          <Text style={styles.legendValue}>{formatBytes(s.bytes, 0)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  top: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface },
  bottom: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  legend: { width: "100%", gap: spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: font.base, color: colors.onSurface, fontWeight: "600" },
  legendValue: { fontSize: font.base, color: colors.muted },
});
