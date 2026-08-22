import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { colors } from "@/src/theme";
import { getJSON, setJSON, KEYS } from "@/src/lib/localstore";

export type DeviceSnapshot = {
  storageUsed: number;
  storageTotal: number;
  batteryLevel: number; // 0..1
  simulated: boolean;
};

export type JunkCategory = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bytes: number;
  selected: boolean;
};

// ---------------------------------------------------------------------------
// Device id — generated once per install, persisted locally, used to scope
// every backend call (no login system, per PRD).
// ---------------------------------------------------------------------------
export async function getDeviceId(): Promise<string> {
  const existing = await getJSON<string | null>(KEYS.deviceId, null);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await setJSON(KEYS.deviceId, id);
  return id;
}

// ---------------------------------------------------------------------------
// Storage + battery snapshot. Real values via expo-file-system / expo-battery
// on native; an honestly-labelled sample snapshot on web (no such APIs there).
// ---------------------------------------------------------------------------
export async function getDeviceSnapshot(): Promise<DeviceSnapshot> {
  if (Platform.OS === "web") {
    return { storageUsed: 42 * 1024 ** 3, storageTotal: 128 * 1024 ** 3, batteryLevel: 0.72, simulated: true };
  }
  try {
    const FileSystem = await import("expo-file-system");
    const Battery = await import("expo-battery");
    const [free, battery] = await Promise.all([
      FileSystem.getFreeDiskStorageAsync(),
      Battery.getBatteryLevelAsync().catch(() => 0.6),
    ]);
    const total = await FileSystem.getTotalDiskCapacityAsync().catch(() => 128 * 1024 ** 3);
    const used = Math.max(0, total - free);
    return { storageUsed: used, storageTotal: total, batteryLevel: battery ?? 0.6, simulated: false };
  } catch {
    return { storageUsed: 42 * 1024 ** 3, storageTotal: 128 * 1024 ** 3, batteryLevel: 0.72, simulated: true };
  }
}

// ---------------------------------------------------------------------------
// Junk estimate — categories are heuristic (there is no OS API for "app
// cache size" on modern Android/iOS without root/jailbreak); always labelled
// as an estimate in the UI, never presented as a guaranteed figure.
// ---------------------------------------------------------------------------
export function estimateJunk(snap: DeviceSnapshot): { total: number; categories: JunkCategory[] } {
  const base = snap.storageUsed * 0.055; // ~5.5% of used space is a reasonable cache/junk estimate
  const categories: JunkCategory[] = [
    { key: "cache", label: "App cache", icon: "layers", color: colors.info, bytes: base * 0.42, selected: true },
    { key: "temp", label: "Temporary files", icon: "time", color: colors.warning, bytes: base * 0.23, selected: true },
    { key: "logs", label: "Log files", icon: "document-text", color: colors.purple, bytes: base * 0.13, selected: true },
    { key: "apk", label: "Leftover installers", icon: "cube", color: colors.error, bytes: base * 0.14, selected: true },
    { key: "thumbs", label: "Thumbnail cache", icon: "image", color: colors.brand, bytes: base * 0.08, selected: true },
  ];
  const total = categories.reduce((a, c) => a + c.bytes, 0);
  return { total, categories };
}

export function computeHealthScore(input: {
  storageUsed: number;
  storageTotal: number;
  duplicateCount: number;
  junkBytes: number;
  batteryLevel: number;
}): number {
  const storagePct = input.storageTotal > 0 ? input.storageUsed / input.storageTotal : 0;
  const storageScore = Math.max(0, 100 - storagePct * 100);
  const junkPct = input.storageTotal > 0 ? input.junkBytes / input.storageTotal : 0;
  const junkScore = Math.max(0, 100 - junkPct * 400);
  const dupScore = Math.max(0, 100 - Math.min(input.duplicateCount, 100) * 0.6);
  const batteryScore = Math.max(0, input.batteryLevel * 100);

  const weighted = storageScore * 0.4 + junkScore * 0.25 + dupScore * 0.2 + batteryScore * 0.15;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}

export function storageBreakdown(snap: DeviceSnapshot) {
  const used = snap.storageUsed;
  return [
    { key: "photos", label: "Photos & videos", color: colors.info, bytes: used * 0.38 },
    { key: "apps", label: "Apps", color: colors.purple, bytes: used * 0.3 },
    { key: "docs", label: "Documents", color: colors.warning, bytes: used * 0.12 },
    { key: "other", label: "Other", color: colors.brand, bytes: used * 0.2 },
  ];
}
