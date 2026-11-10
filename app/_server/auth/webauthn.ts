import "server-only";
import {
  type AuthenticationResponseJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { and, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "../db";

const { passkeys, webauthnChallenges } = schema;

export const RP_NAME = "Ирц бүртгэлийн систем";

/** Challenge хүчинтэй байх хугацаа. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * WebAuthn-ий RP ID (домэйн) ба origin-ийг хүсэлтээс тодорхойлно.
 * Passkey нь домэйнд холбогддог тул production хаягаа тогтмол ашиглах хэрэгтэй.
 */
export async function relyingParty() {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "";
  const hostname = host.split(":")[0];
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const proto =
    store.get("x-forwarded-proto")?.split(",")[0] ?? (local ? "http" : "https");
  return {
    rpID: process.env.WEBAUTHN_RP_ID ?? hostname,
    origin: `${proto}://${host}`,
  };
}

export async function saveChallenge(
  userId: string,
  challenge: string,
  purpose: "register" | "checkin",
) {
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await getDb()
    .insert(webauthnChallenges)
    .values({ userId, challenge, purpose, expiresAt })
    .onConflictDoUpdate({
      target: webauthnChallenges.userId,
      set: { challenge, purpose, expiresAt },
    });
}

/** Хүчинтэй challenge-ийг нэг удаа авч устгана (давтан ашиглуулахгүй). */
export async function takeChallenge(
  userId: string,
  purpose: "register" | "checkin",
) {
  const [row] = await getDb()
    .delete(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.userId, userId),
        eq(webauthnChallenges.purpose, purpose),
        gt(webauthnChallenges.expiresAt, sql`now()`),
      ),
    )
    .returning({ challenge: webauthnChallenges.challenge });
  return row?.challenge ?? null;
}

export async function hasPasskey(userId: string) {
  const [row] = await getDb()
    .select({ id: passkeys.id })
    .from(passkeys)
    .where(eq(passkeys.userId, userId))
    .limit(1);
  return Boolean(row);
}

export async function userPasskeys(userId: string) {
  return getDb()
    .select({ id: passkeys.id, transports: passkeys.transports })
    .from(passkeys)
    .where(eq(passkeys.userId, userId));
}

/**
 * Ирц бүртгүүлэх үеийн Face ID / хурууны хээний баталгааг шалгана.
 * Амжилттай бол null, үгүй бол алдааны мессеж буцаана.
 */
export async function verifyCheckInPasskey(
  userId: string,
  response: AuthenticationResponseJSON | null,
): Promise<string | null> {
  if (!response) return "Face ID эсвэл хурууны хээгээр баталгаажуулна уу.";

  const expectedChallenge = await takeChallenge(userId, "checkin");
  if (!expectedChallenge) {
    return "Баталгаажуулалтын хугацаа дууссан. Дахин оролдоно уу.";
  }

  const [credential] = await getDb()
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.id, response.id), eq(passkeys.userId, userId)))
    .limit(1);
  if (!credential) {
    return "Энэ төхөөрөмжийн Face ID таны бүртгэлд холбогдоогүй байна. Бүртгүүлсэн утаснаасаа оролдоно уу.";
  }

  const { rpID, origin } = await relyingParty();
  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse(
      {
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: credential.id,
          publicKey: isoBase64URL.toBuffer(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports ?? undefined,
        },
      },
    );
    if (!verified) return "Face ID баталгаажсангүй. Дахин оролдоно уу.";
    await getDb()
      .update(passkeys)
      .set({ counter: authenticationInfo.newCounter, lastUsedAt: new Date() })
      .where(eq(passkeys.id, credential.id));
    return null;
  } catch (error) {
    console.warn("Passkey verification failed", error);
    return "Face ID баталгаажсангүй. Дахин оролдоно уу.";
  }
}
