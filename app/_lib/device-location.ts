/** Утасны байршлыг авах (зөвхөн хөтөч дээр). */
import type { DeviceLocation } from "./geo";

/** Саяхан авсан байршлыг дахин ашиглах хугацаа. */
const CACHE_MS = 60_000;

let cached: { location: DeviceLocation; at: number } | null = null;
let inFlight: Promise<DeviceLocation> | null = null;

export class LocationError extends Error {}

const MESSAGES: Record<number, string> = {
  1: "Байршлын зөвшөөрөл олгоогүй байна. Утасныхаа тохиргооноос (iPhone: Тохиргоо → Нууцлал → Байршил → Safari) энэ сайтад байршил ашиглахыг зөвшөөрөөд дахин оролдоно уу.",
  2: "Байршил тодорхойлж чадсангүй. Утасныхаа байршил (GPS)-ийг асаагаад дахин оролдоно уу.",
  3: "Байршил тодорхойлоход хэт удлаа. Дахин оролдоно уу.",
};

/**
 * Байршлыг нэг удаа авна. Зэрэг дуудвал нэг хүсэлтийг хуваалцана,
 * сүүлийн 1 минутад авсан бол түүнийг буцаана.
 */
export function requestLocation(): Promise<DeviceLocation> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return Promise.resolve(cached.location);
  }
  if (inFlight) return inFlight;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new LocationError("Энэ хөтөч байршил тодорхойлж чадахгүй байна."),
    );
  }

  inFlight = new Promise<DeviceLocation>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        cached = { location, at: Date.now() };
        resolve(location);
      },
      (error) =>
        reject(
          new LocationError(MESSAGES[error.code] ?? "Байршил авч чадсангүй."),
        ),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
