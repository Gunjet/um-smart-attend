import { QR_PREFIX, QR_ROTATION_MS } from "./constants";

export const currentQrTick = (timestamp: number) =>
  Math.floor(timestamp / QR_ROTATION_MS);

export function createQrPayload(sessionId: string, tick: number) {
  return `${QR_PREFIX}:${sessionId}:${tick}`;
}

/** QR код тухайн session-ийнх бөгөөд одоогийн 30 секундын цонхных эсэх. */
export function isValidQrPayload(
  payload: string,
  sessionId: string,
  timestamp: number,
) {
  const [prefix, payloadSessionId, tick] = payload.split(":");
  return (
    prefix === QR_PREFIX &&
    payloadSessionId === sessionId &&
    Number(tick) === currentQrTick(timestamp)
  );
}

export function createSessionId(courseCode: string) {
  const coursePrefix = courseCode.split(" ")[0] || "SESSION";
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${coursePrefix}-${suffix}`;
}
