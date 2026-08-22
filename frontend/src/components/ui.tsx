import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, shadow, spacing } from "@/src/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------------------
// Card — plain white rounded surface. Never blurred (per design guidelines).
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// IconChip — circular colored icon chip used for tool tiles / list rows.
// ---------------------------------------------------------------------------
export function IconChip({
  name,
  color,
  size = 22,
}: {
  name: IoniconName;
  color: string;
  size?: number;
}) {
  const chipSize = size + 26;
  return (
    <View
      style={[
        styles.chip,
        { width: chipSize, height: chipSize, borderRadius: chipSize / 2, backgroundColor: color + "1A" },
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// PillButton — primary pill-shaped button.
// ---------------------------------------------------------------------------
export function PillButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  variant = "primary",
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  icon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "danger" | "secondary";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const bg =
    variant === "danger" ? colors.error : variant === "secondary" ? colors.surfaceTertiary : colors.brand;
  const textColor = variant === "secondary" ? colors.onSurface : "#fff";
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.pillBtn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.pillBtnText, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ScreenHeader — back button + title + optional right-side action.
// ---------------------------------------------------------------------------
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.headerBtn} testID="screen-header-back">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerBtn}>{right ?? null}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader — "Tools" style row title with an optional trailing action.
// ---------------------------------------------------------------------------
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} testID="section-header-action">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
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
  chip: { alignItems: "center", justifyContent: "center" },
  pillBtn: {
    minHeight: 52,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pillBtnText: { fontSize: font.lg, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface },
  sectionAction: { fontSize: font.base, fontWeight: "600", color: colors.brand },
});

export { SafeAreaView };
