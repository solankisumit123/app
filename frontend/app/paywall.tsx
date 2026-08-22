import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, font, radius, shadow, spacing } from "@/src/theme";
import { PillButton } from "@/src/components/ui";
import { useApp } from "@/src/lib/store";

const FEATURES = [
  { icon: "infinite", text: "Unlimited duplicate photo scanning" },
  { icon: "medkit", text: "AI Phone Doctor & Smart Auto-Pilot" },
  { icon: "lock-closed", text: "Encrypted File Vault" },
  { icon: "image", text: "Bulk image compression engine" },
  { icon: "close-circle", text: "Completely ad-free experience" },
];

const PLANS = [
  { key: "monthly", label: "Monthly", price: "₹149", per: "/month", note: "" },
  { key: "yearly", label: "Yearly", price: "₹999", per: "/year", note: "Save 44%" },
];

export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPremium, toast } = useApp();
  const [plan, setPlan] = useState("yearly");

  const subscribe = () => {
    setPremium(true);
    toast("Welcome to Premium! 🎉", "success");
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Pressable style={styles.close} onPress={() => router.back()} hitSlop={10} testID="paywall-close">
        <Ionicons name="close" size={26} color={colors.muted} />
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.brand, colors.brandDark]} style={styles.hero}>
          <View style={styles.crown}>
            <Ionicons name="diamond" size={40} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Device Manager Pro</Text>
          <Text style={styles.heroSub}>Unlock every tool & keep your device flawless</Text>
        </LinearGradient>

        <View style={styles.body}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureChip}>
                <Ionicons name={f.icon as any} size={18} color={colors.brand} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}

          <View style={styles.plans}>
            {PLANS.map((p) => {
              const active = plan === p.key;
              return (
                <Pressable
                  key={p.key}
                  style={[styles.plan, active && styles.planActive]}
                  onPress={() => setPlan(p.key)}
                  testID={`paywall-plan-${p.key}`}
                >
                  {p.note ? (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveText}>{p.note}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.planLabel, active && { color: colors.brand }]}>{p.label}</Text>
                  <Text style={styles.planPrice}>
                    {p.price}
                    <Text style={styles.planPer}>{p.per}</Text>
                  </Text>
                  <View style={[styles.radio, active && styles.radioOn]}>
                    {active ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PillButton label="Start Premium" icon="diamond" onPress={subscribe} testID="paywall-subscribe" />
        <Text style={styles.legal}>Auto-renewable. Cancel anytime in store settings.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  close: { position: "absolute", top: spacing.lg, right: spacing.lg, zIndex: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", paddingTop: spacing.xxl, paddingBottom: spacing.xxl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  crown: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  heroTitle: { fontSize: font.xxl, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: font.base, color: "rgba(255,255,255,0.9)", marginTop: spacing.xs, textAlign: "center", paddingHorizontal: spacing.xl },
  body: { padding: spacing.lg, gap: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand + "1A", alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: font.lg, color: colors.onSurface, flex: 1 },
  plans: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  plan: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, borderColor: colors.border, alignItems: "center", ...shadow.soft },
  planActive: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  saveBadge: { position: "absolute", top: -10, backgroundColor: colors.warning, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 2 },
  saveText: { color: "#fff", fontSize: font.sm, fontWeight: "800" },
  planLabel: { fontSize: font.base, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xs },
  planPrice: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface, marginTop: spacing.xs },
  planPer: { fontSize: font.sm, fontWeight: "500", color: colors.muted },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, marginTop: spacing.md, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: colors.brand, borderColor: colors.brand },
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
    gap: spacing.sm,
    ...shadow.lifted,
  },
  legal: { fontSize: font.sm, color: colors.mutedLight, textAlign: "center" },
});
