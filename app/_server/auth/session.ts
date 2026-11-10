import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "../db";
import { newToken, sha256 } from "./tokens";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb()
    .insert(schema.sessions)
    .values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    ...cookieBase,
    expires: expiresAt,
  });
}

/** Хүчинтэй session-ий хэрэглэгчийг буцаана, байхгүй бол null. */
export async function readSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb()
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.id, sha256(token)),
        // Цагийг DB-ээс авна: render үед JS-ийн одоогийн цагийг уншихгүй.
        gt(schema.sessions.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  return row?.user ?? null;
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb()
      .delete(schema.sessions)
      .where(eq(schema.sessions.id, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}
