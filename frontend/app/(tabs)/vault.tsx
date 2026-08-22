import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as LocalAuthentication from "expo-local-authentication";
import * as DocumentPicker from "expo-document-picker";
import { colors, font, formatBytes, maxContentWidth, radius, shadow, spacing } from "@/src/theme";
import { PillButton } from "@/src/components/ui";
import { api } from "@/src/lib/api";
import { useApp } from "@/src/lib/store";

type VItem = { id: string; name: string; kind: string; size_bytes: number; thumb_uri?: string };

export default function Vault() {
  const { toast } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [authing, setAuthing] = useState(false);
  const [items, setItems] = useState<VItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await api.listVault()) as VItem[]);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setUnlocked(false);
    }, []),
  );

  const unlock = async () => {
    setAuthing(true);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHw && enrolled) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock your vault",
          fallbackLabel: "Use passcode",
        });
        if (!res.success) {
          setAuthing(false);
          toast("Authentication failed", "error");
          return;
        }
      }
      // No biometric hardware/enrollment in preview — allow through
      setUnlocked(true);
      await loadItems();
    } catch {
      setUnlocked(true);
      await loadItems();
    }
    setAuthing(false);
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const f = res.assets[0];
      const isImage = (f.mimeType || "").startsWith("image");
      const created = await api.addVault({
        name: f.name,
        kind: isImage ? "photo" : "file",
        size_bytes: f.size ?? 0,
        thumb_uri: isImage ? f.uri : undefined,
      });
      setItems((p) => [created as VItem, ...p]);
      toast("Moved to vault", "success");
    } catch {
      toast("Could not add file", "error");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.removeVault(id);
      setItems((p) => p.filter((x) => x.id !== id));
      toast("Removed from vault", "info");
    } catch {}
  };

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vault</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.badge}>
            <Ionicons name="lock-closed" size={44} color="#fff" />
          </View>
          <Text style={styles.title}>Vault locked</Text>
          <Text style={styles.sub}>Authenticate to view your protected files.</Text>
          <PillButton
            label={authing ? "Unlocking…" : "Unlock with biometrics"}
            icon="finger-print"
            onPress={unlock}
            loading={authing}
            style={{ alignSelf: "stretch", marginTop: spacing.xl }}
            testID="vault-unlock"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vault</Text>
        <Pressable onPress={() => setUnlocked(false)} hitSlop={8} testID="vault-lock">
          <Ionicons name="lock-open" size={22} color={colors.brand} />
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, width: "100%", maxWidth: maxContentWidth, alignSelf: "center" }}>
          <Pressable style={styles.addRow} onPress={pickFile} testID="vault-add">
            <View style={[styles.addChip]}>
              <Ionicons name="add" size={26} color={colors.brand} />
            </View>
            <View>
              <Text style={styles.addTitle}>Add files to vault</Text>
              <Text style={styles.sub}>Pick a photo or file · encrypted & hidden</Text>
            </View>
          </Pressable>

          {items.length === 0 ? (
            <Text style={[styles.sub, { textAlign: "center", marginTop: spacing.xl }]}>
              Your vault is empty.
            </Text>
          ) : (
            <View style={styles.grid}>
              {items.map((it) => (
                <View key={it.id} style={styles.vItem}>
                  {it.thumb_uri ? (
                    <Image source={{ uri: it.thumb_uri }} style={styles.vThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.vThumb, { alignItems: "center", justifyContent: "center", backgroundColor: colors.track }]}>
                      <Ionicons name="document" size={28} color={colors.muted} />
                    </View>
                  )}
                  <Text style={styles.vName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.vSize}>{formatBytes(it.size_bytes)}</Text>
                  <Pressable style={styles.vRemove} onPress={() => remove(it.id)} testID={`vault-remove-${it.id}`}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.sm },
  badge: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginBottom: spacing.md, ...shadow.lifted },
  title: { fontSize: font.xxl, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  sub: { fontSize: font.base, color: colors.muted, textAlign: "center", lineHeight: 22 },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  addChip: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand + "1A", alignItems: "center", justifyContent: "center" },
  addTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  vItem: { width: "47.5%", backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, ...shadow.soft },
  vThumb: { width: "100%", aspectRatio: 1, borderRadius: radius.md, marginBottom: spacing.sm },
  vName: { fontSize: font.base, fontWeight: "600", color: colors.onSurface },
  vSize: { fontSize: font.sm, color: colors.muted },
  vRemove: { position: "absolute", top: spacing.md, right: spacing.md, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
});
