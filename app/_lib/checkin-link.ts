/**
 * Ирцийн QR нь сайтын линк: `https://<сайт>/?c=<гарын үсэгтэй код>`.
 * Утасны энгийн камераар уншуулахад сайт Safari / Chrome-д нээгдэж,
 * ирц бүртгэх алхам шууд эхэлнэ. Апп доторх QR уншигч ч мөн уншина.
 */
export const CHECKIN_PARAM = "c";

/** Нэвтрэхээс өмнө уншуулсан кодыг нэвтэрсний дараа үргэлжлүүлэхэд хадгална. */
export const PENDING_CHECKIN_KEY = "pending-checkin";

export function checkInUrl(origin: string, payload: string) {
  return `${origin}/?${CHECKIN_PARAM}=${encodeURIComponent(payload)}`;
}

/** QR-ийн текстээс ирцийн кодыг гаргана (линк бол `c` параметр, үгүй бол текст өөрөө). */
export function extractCheckInCode(text: string) {
  const value = text.trim();
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value).searchParams.get(CHECKIN_PARAM)?.trim() ?? value;
  } catch {
    return value;
  }
}

/** Хуудасны хаягнаас (?c=…) уншуулсан кодыг авна. */
export function checkInCodeFromLocation() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(CHECKIN_PARAM);
}

/** Хаягнаас `?c=` параметрийг арилгана (дахин ачаалахад давтагдахгүй). */
export function clearCheckInFromLocation() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CHECKIN_PARAM)) return;
  url.searchParams.delete(CHECKIN_PARAM);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function readPendingCheckIn() {
  try {
    return sessionStorage.getItem(PENDING_CHECKIN_KEY);
  } catch {
    return null;
  }
}

export function savePendingCheckIn(code: string) {
  try {
    sessionStorage.setItem(PENDING_CHECKIN_KEY, code);
  } catch {
    /* хувийн горимд хадгалагдахгүй байж болно */
  }
}

export function clearPendingCheckIn() {
  try {
    sessionStorage.removeItem(PENDING_CHECKIN_KEY);
  } catch {
    /* хоосон */
  }
}
