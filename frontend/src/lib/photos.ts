import { Platform } from "react-native";

export type SimplePhoto = {
  id: string;
  uri: string;
  filename: string;
  size: number;
  creationTime: number;
};

export type DuplicateAsset = { id: string; uri: string; filename: string; size: number };
export type DuplicateGroup = {
  id: string;
  label: string;
  bestId: string;
  totalBytes: number;
  assets: DuplicateAsset[];
};

// ---------------------------------------------------------------------------
// Sample data — used only on web, or when the user hasn't granted photo
// library permission yet. Always paired with `simulated: true` in the UI so
// it's never presented as real data.
// ---------------------------------------------------------------------------
const SAMPLE_URIS = [
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=60",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=60",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=60",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=60",
  "https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=400&q=60",
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&q=60",
];

function sampleGroups(): DuplicateGroup[] {
  return [
    {
      id: "g1",
      label: "Burst — Sunset walk",
      bestId: "g1-0",
      totalBytes: 3 * 4.1 * 1024 * 1024,
      assets: [0, 1, 2].map((i) => ({
        id: `g1-${i}`,
        uri: SAMPLE_URIS[i],
        filename: `IMG_${1000 + i}.jpg`,
        size: 4.1 * 1024 * 1024,
      })),
    },
    {
      id: "g2",
      label: "Similar — Coffee shot",
      bestId: "g2-0",
      totalBytes: 2 * 3.4 * 1024 * 1024,
      assets: [3, 4].map((i) => ({
        id: `g2-${i}`,
        uri: SAMPLE_URIS[i],
        filename: `IMG_${1010 + i}.jpg`,
        size: 3.4 * 1024 * 1024,
      })),
    },
  ];
}

function samplePhotos(count: number, daysAgoStart: number): SimplePhoto[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `sample-${i}`,
    uri: SAMPLE_URIS[i % SAMPLE_URIS.length],
    filename: `IMG_${2000 + i}.jpg`,
    size: (3 + (i % 5)) * 1024 * 1024,
    creationTime: Date.now() - (daysAgoStart + i * 11) * 86400000,
  }));
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
export async function ensurePhotoPermission() {
  if (Platform.OS === "web") return { granted: true, canAskAgain: true };
  const MediaLibrary = await import("expo-media-library");
  return MediaLibrary.getPermissionsAsync();
}

export async function requestPhotoPermission() {
  if (Platform.OS === "web") return { granted: true, canAskAgain: true };
  const MediaLibrary = await import("expo-media-library");
  return MediaLibrary.requestPermissionsAsync();
}

// ---------------------------------------------------------------------------
// Duplicate scan — groups photos taken within a short time window of each
// other (a reasonable device-only proxy for "burst"/"similar" without a full
// perceptual-hash pipeline). Falls back to sample groups on web/no permission.
// ---------------------------------------------------------------------------
export async function scanDuplicates(): Promise<{ groups: DuplicateGroup[]; simulated: boolean; photoCount: number }> {
  if (Platform.OS === "web") {
    return { groups: sampleGroups(), simulated: true, photoCount: 240 };
  }
  try {
    const MediaLibrary = await import("expo-media-library");
    const perm = await MediaLibrary.getPermissionsAsync();
    if (!perm.granted) {
      return { groups: sampleGroups(), simulated: true, photoCount: 240 };
    }
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: 300,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });
    const groups: DuplicateGroup[] = [];
    let current: DuplicateAsset[] = [];
    let currentTimes: number[] = [];

    const flush = () => {
      if (current.length > 1) {
        groups.push({
          id: `g-${groups.length}`,
          label: "Burst photos",
          bestId: current[0].id,
          totalBytes: current.reduce((a, c) => a + c.size, 0),
          assets: current,
        });
      }
      current = [];
      currentTimes = [];
    };

    for (const asset of page.assets) {
      const info = { id: asset.id, uri: asset.uri, filename: asset.filename, size: (asset as any).fileSize ?? 3 * 1024 * 1024 };
      if (currentTimes.length === 0 || asset.creationTime - currentTimes[currentTimes.length - 1] < 15000) {
        current.push(info);
        currentTimes.push(asset.creationTime);
      } else {
        flush();
        current.push(info);
        currentTimes.push(asset.creationTime);
      }
    }
    flush();

    return { groups, simulated: false, photoCount: page.totalCount ?? page.assets.length };
  } catch {
    return { groups: sampleGroups(), simulated: true, photoCount: 240 };
  }
}

// ---------------------------------------------------------------------------
// Large photos (for the Compressor) and old photos (for Cloud Offload).
// ---------------------------------------------------------------------------
export async function listLargePhotos(): Promise<{ photos: SimplePhoto[]; simulated: boolean }> {
  if (Platform.OS === "web") return { photos: samplePhotos(9, 5), simulated: true };
  try {
    const MediaLibrary = await import("expo-media-library");
    const perm = await MediaLibrary.getPermissionsAsync();
    if (!perm.granted) return { photos: samplePhotos(9, 5), simulated: true };
    const page = await MediaLibrary.getAssetsAsync({ mediaType: "photo", first: 200 });
    const photos: SimplePhoto[] = page.assets
      .map((a) => ({
        id: a.id,
        uri: a.uri,
        filename: a.filename,
        size: (a as any).fileSize ?? 0,
        creationTime: a.creationTime,
      }))
      .filter((p) => p.size > 2 * 1024 * 1024)
      .sort((a, b) => b.size - a.size)
      .slice(0, 24);
    if (photos.length === 0) return { photos: samplePhotos(9, 5), simulated: true };
    return { photos, simulated: false };
  } catch {
    return { photos: samplePhotos(9, 5), simulated: true };
  }
}

export async function listOldPhotos(): Promise<{ photos: SimplePhoto[]; simulated: boolean }> {
  const sixMonths = 182 * 86400000;
  if (Platform.OS === "web") return { photos: samplePhotos(6, 200), simulated: true };
  try {
    const MediaLibrary = await import("expo-media-library");
    const perm = await MediaLibrary.getPermissionsAsync();
    if (!perm.granted) return { photos: samplePhotos(6, 200), simulated: true };
    const page = await MediaLibrary.getAssetsAsync({ mediaType: "photo", first: 300 });
    const cutoff = Date.now() - sixMonths;
    const photos: SimplePhoto[] = page.assets
      .filter((a) => a.creationTime < cutoff)
      .map((a) => ({
        id: a.id,
        uri: a.uri,
        filename: a.filename,
        size: (a as any).fileSize ?? 3 * 1024 * 1024,
        creationTime: a.creationTime,
      }));
    if (photos.length === 0) return { photos: samplePhotos(6, 200), simulated: true };
    return { photos, simulated: false };
  } catch {
    return { photos: samplePhotos(6, 200), simulated: true };
  }
}

// ---------------------------------------------------------------------------
// Real on-device compression (native only). Non-fatal on failure — the trash
// + "space saved" flow still proceeds using the estimate, per the PRD.
// ---------------------------------------------------------------------------
export async function compressPhoto(uri: string, quality: number): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const ImageManipulator = await import("expo-image-manipulator");
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return null;
  }
}
