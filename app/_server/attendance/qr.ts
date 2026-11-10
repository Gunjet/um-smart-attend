import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** QR болон 6 оронтой код энэ хугацаанд шинэчлэгдэнэ. */
export const QR_ROTATION_MS = 30_000;
const PREFIX = "UMSA1";

export const newQrSecret = () => randomBytes(32).toString("hex");
export const tickAt = (ms: number) => Math.floor(ms / QR_ROTATION_MS);

function hmac(secret: string, message: string) {
  return createHmac("sha256", secret).update(message).digest();
}

function signature(secret: string, sessionId: string, tick: number) {
  return hmac(secret, `qr.${sessionId}.${tick}`)
    .toString("base64url")
    .slice(0, 22);
}

/** QR кодонд байх текст: UMSA1.<sessionId>.<tick>.<signature> */
export function qrPayload(secret: string, sessionId: string, tick: number) {
  return [PREFIX, sessionId, tick, signature(secret, sessionId, tick)].join(
    ".",
  );
}

/** Камергүй үед гараар оруулах 6 оронтой код. */
export function shortCode(secret: string, tick: number) {
  const value = hmac(secret, `code.${tick}`).readUInt32BE(0) % 1_000_000;
  return String(value).padStart(6, "0");
}

export function parseQrPayload(text: string) {
  const [prefix, sessionId, tick, sig] = text.trim().split(".");
  if (prefix !== PREFIX || !sessionId || !sig || !/^\d+$/.test(tick ?? ""))
    return null;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return { sessionId, tick: Number(tick), sig };
}

/**
 * Одоогийн эсвэл өмнөх 30 секундын цонхных бол хүчинтэй
 * (уншуулах, сүлжээний хоцрогдолд зай үлдээнэ).
 */
export const acceptedTicks = (now: number) => [tickAt(now), tickAt(now) - 1];

export function verifyQrPayload(
  secret: string,
  parsed: { sessionId: string; tick: number; sig: string },
  now: number,
) {
  if (!acceptedTicks(now).includes(parsed.tick)) return false;
  const expected = Buffer.from(
    signature(secret, parsed.sessionId, parsed.tick),
  );
  const actual = Buffer.from(parsed.sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function matchesShortCode(secret: string, code: string, now: number) {
  return acceptedTicks(now).some((tick) => shortCode(secret, tick) === code);
}
