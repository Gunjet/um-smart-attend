import { DEVICE_STORAGE_PREFIX } from "./constants";
import type { Role } from "./types";

export type DeviceRegistration = "existing" | "registered" | "unavailable";

/** Төхөөрөмжийг тухайн эрхэд нэг удаа бүртгэнэ (demo, localStorage). */
export function registerDevice(role: Role): DeviceRegistration {
  try {
    const key = `${DEVICE_STORAGE_PREFIX}:${role}`;
    if (window.localStorage.getItem(key)) return "existing";
    const deviceId =
      window.crypto?.randomUUID?.() ??
      `device-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, deviceId);
    return "registered";
  } catch {
    return "unavailable";
  }
}
