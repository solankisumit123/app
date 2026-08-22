import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { colors, font, radius, spacing } from "@/src/theme";
import { PillButton } from "@/src/components/ui";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "clean",
    icon: "sparkles",
    color: colors.brand,
    title: "Clean junk fast",
    body: "Free up gigabytes of space by clearing cache, duplicates and large files in one tap.",
    image:
      "https://images.unsplash.com/photo-1760008486534-a5c359d0dd09?crop=entropy&cs=srgb&fm=jpg&w=600&q=70",
  },
  {
    key: "organize",
    icon: "images",
    color: colors.info,
    title: "Organize your photos",
    body: "Find duplicate and burst shots automatically and keep only the best one.",
    image:
      "https://images.unsplash.com/photo-1554080353-a576cf803bda?crop=entropy&cs=srgb&fm=jpg&w=600&q=70",
  },
  {
    key: "optimize",
    icon: "shield-checkmark",
    color: colors.warning,
    title: "Stay secure & optimized",
    body: "Track your device health score, protect files in a vault and keep everything running smooth.",
    image:
      "https://images.unsplash.com/photo-1638947604157-d259d219eeee?crop=entropy&cs=srgb&fm=jpg&w=600&q=70",
  },
];

const ONBOARD_KEY = "dmp_onboarded";

export default function Onboarding() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await storage.setItem(ONBOARD_KEY, true);
    router.replace("/(tabs)");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="rocket" size={18} color="#fff" />
          </View>
          <Text style={styles.brandName}>Device Manager Pro</Text>
        </View>
        <Pressable onPress={finish} hitSlop={10} testID="onboarding-skip">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.key}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.imageWrap, { backgroundColor: item.color + "14" }]}>
              <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" />
              <View style={[styles.iconBadge, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={26} color="#fff" />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <PillButton
          testID="onboarding-next"
          label={index === SLIDES.length - 1 ? "Get started" : "Next"}
          onPress={next}
          icon={index === SLIDES.length - 1 ? "checkmark" : "arrow-forward"}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  skip: { fontSize: font.base, color: colors.muted, fontWeight: "600" },
  slide: { paddingHorizontal: spacing.xl, alignItems: "center", paddingTop: spacing.xl },
  imageWrap: {
    width: width - spacing.xl * 2,
    height: (width - spacing.xl * 2) * 0.9,
    borderRadius: radius.xl,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  image: { width: "100%", height: "100%" },
  iconBadge: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  body: {
    fontSize: font.lg,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 24,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotActive: { width: 24, backgroundColor: colors.brand },
});
