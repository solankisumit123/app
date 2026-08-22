import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, font } from "@/src/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreGauge({
  score,
  size = 160,
  strokeWidth = 14,
  color,
  unit,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  unit?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const progress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringColor = color ?? (clamped >= 80 ? colors.brand : clamped >= 55 ? colors.warning : colors.error);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.center}>
          <Text style={[styles.score, { fontSize: size * 0.28 }]}>{Math.round(clamped)}</Text>
          <Text style={styles.unit}>{unit ?? "score"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  score: { fontWeight: "800", color: colors.onSurface },
  unit: { fontSize: font.sm, color: colors.muted, marginTop: -4 },
});
