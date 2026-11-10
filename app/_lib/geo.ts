/** Байршлын тооцоо (сервер, клиент аль алинд ашиглана). */

export type GeoPoint = { latitude: number; longitude: number };

/** Оюутны утаснаас ирэх байршил. accuracy нь метрээр. */
export type DeviceLocation = GeoPoint & { accuracy: number };

/** Сургуулийн байршлын тохиргоо. */
export type CampusSettings = GeoPoint & { radiusM: number };

export const DEFAULT_RADIUS_M = 150;

/** GPS-ийн алдааг (accuracy) хамгийн ихдээ ийм хэмжээгээр хүлцэнэ. */
export const MAX_ACCURACY_TOLERANCE_M = 50;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** Хоёр цэгийн хоорондох зай (м), haversine томьёогоор. */
export function distanceMeters(a: GeoPoint, b: GeoPoint) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** 85 → "85 м", 2300 → "2.3 км". */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} м`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} км`;
}

/** OpenStreetMap дээр цэгийг харуулах линк. */
export const mapLink = ({ latitude, longitude }: GeoPoint) =>
  `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
