import { getDeviceId } from "@/src/lib/device";

const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError("Backend URL is not configured (EXPO_PUBLIC_BACKEND_URL)", 0);
  }
  const deviceId = await getDeviceId();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export type ScanPayload = {
  type: string;
  health_score?: number;
  freed_bytes?: number;
  duplicate_count?: number;
  photo_count?: number;
  storage_used?: number;
  storage_total?: number;
  battery_level?: number;
  junk_bytes?: number;
};

export type Tip = { title: string; body: string; icon: string; ai?: boolean };
export type DashboardResponse = { tip: Tip; predict_days_until_full: number | null; last_scan_at?: string };
export type Prefs = { premium: boolean; autopilot: boolean; schedule: string; notifications: boolean };
export type TrashItemPayload = {
  name: string;
  kind: "photo" | "file" | string;
  size_bytes: number;
  thumb_uri?: string;
  origin?: string;
};
export type VaultItemPayload = {
  name: string;
  kind: "photo" | "file" | string;
  size_bytes: number;
  thumb_uri?: string;
};

export const api = {
  saveScan: (payload: ScanPayload) => request("/scans", { method: "POST", body: JSON.stringify(payload) }),
  getDashboard: () => request<DashboardResponse>("/dashboard"),
  getAiTip: () => request<Tip>("/ai-tip"),
  getStats: () => request<{ total_freed: number }>("/stats"),

  getPrefs: () => request<Prefs>("/prefs"),
  updatePrefs: (patch: Partial<Prefs>) => request<Prefs>("/prefs", { method: "POST", body: JSON.stringify(patch) }),

  listTrash: () => request<any[]>("/trash"),
  addTrash: (items: TrashItemPayload[]) => request<any[]>("/trash", { method: "POST", body: JSON.stringify(items) }),
  restoreTrash: (ids: string[]) => request("/trash/restore", { method: "POST", body: JSON.stringify({ ids }) }),
  deleteTrash: (ids: string[]) => request("/trash/delete", { method: "POST", body: JSON.stringify({ ids }) }),

  listVault: () => request<any[]>("/vault"),
  addVault: (item: VaultItemPayload) => request<any>("/vault", { method: "POST", body: JSON.stringify(item) }),
  removeVault: (id: string) => request(`/vault/${id}`, { method: "DELETE" }),
};
