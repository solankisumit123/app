import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, font, maxContentWidth, radius, shadow, spacing } from "@/src/theme";

type Tool = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  route: string;
};

const SECTIONS: { title: string; tools: Tool[] }[] = [
  {
    title: "Cleanup & boost",
    tools: [
      { icon: "image", label: "Photo cleanup", color: colors.info, route: "/duplicates" },
      { icon: "sparkles", label: "Junk cleaner", color: colors.brand, route: "/clean" },
      { icon: "albums", label: "Photo compressor", color: colors.error, route: "/compress" },
      { icon: "apps", label: "App management", color: colors.warning, route: "/apps" },
      { icon: "flash", label: "System boost", color: colors.purple, route: "/optimise" },
    ],
  },
  {
    title: "Storage & files",
    tools: [
      { icon: "pie-chart", label: "Storage analyzer", color: colors.purple, route: "/storage" },
      { icon: "cloud-upload", label: "Cloud offload", color: colors.info, route: "/offload" },
      { icon: "trash-bin", label: "Trash & recovery", color: colors.muted, route: "/trash" },
    ],
  },
  {
    title: "Privacy & security",
    tools: [
      { icon: "eye-off", label: "Privacy cleaner", color: colors.warning, route: "/privacy" },
      { icon: "lock-closed", label: "Private vault", color: colors.brand, route: "/(tabs)/vault" },
      { icon: "shield-checkmark", label: "Security scan", color: colors.info, route: "/security" },
    ],
  },
];

export default function Tools() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tools</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.tools.map((t) => (
                <Pressable
                  key={t.label}
                  testID={`tool-${t.label}`}
                  onPress={() => router.push(t.route as any)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                >
                  <View style={[styles.chip, { backgroundColor: t.color + "1A" }]}>
                    <Ionicons name={t.icon} size={24} color={t.color} />
                  </View>
                  <Text style={styles.label} numberOfLines={2}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: font.base,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: spacing.md,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  card: {
    width: "48.5%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  chip: { width: 48, height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  label: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
});
