import "server-only";
import { cookies } from "next/headers";
import { newToken, sha256 } from "./tokens";

const DEVICE_COOKIE = "device_id";
const DEVICE_TTL_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/**
 * Төхөөрөмжийн тогтмол ID-г httpOnly cookie-д хадгална (байхгүй бол үүсгэнэ)
 * ба түүний hash-ийг буцаана. Санд зөвхөн hash хадгалагдана.
 */
export async function getDeviceIdHash() {
  const store = await cookies();
  let deviceId = store.get(DEVICE_COOKIE)?.value;
  if (!deviceId) {
    deviceId = newToken();
    store.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + DEVICE_TTL_MS),
    });
  }
  return sha256(deviceId);
}
