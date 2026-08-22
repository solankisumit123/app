import { storage } from "@/src/utils/storage";

export const KEYS = {
  lastOffload: "dmp_last_offload",
  deviceId: "dmp_device_id",
  onboarded: "dmp_onboarded",
};

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  return storage.getItem<T>(key, fallback);
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  return storage.setItem<T>(key, value);
}
