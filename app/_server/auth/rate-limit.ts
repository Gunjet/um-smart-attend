import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";

const { loginAttempts } = schema;

/** Энэ хугацаанд MAX_FAILURES удаа буруу оролдвол түгжинэ. */
const MAX_FAILURES = 5;
const WINDOW_MINUTES = 15;
const LOCK_MINUTES = 10;

export const LOCKED_MESSAGE = `Хэт олон удаа буруу оролдлоо. ${LOCK_MINUTES} минутын дараа дахин оролдоно уу.`;

/** Түгжээтэй бол true. */
export async function isLoginLocked(key: string) {
  const [row] = await getDb()
    .select({
      locked: sql<boolean>`coalesce(${loginAttempts.lockedUntil} > now(), false)`,
    })
    .from(loginAttempts)
    .where(eq(loginAttempts.key, key))
    .limit(1);
  return Boolean(row?.locked);
}

/** Буруу оролдлогыг тоолж, хязгаар хүрвэл түгжинэ. Түгжигдсэн бол true. */
export async function recordLoginFailure(key: string) {
  const [row] = await getDb()
    .insert(loginAttempts)
    .values({ key, failures: 1 })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      // Цонх хуучирсан бол тоолуурыг шинээр эхлүүлнэ.
      set: {
        failures: sql`case when ${loginAttempts.firstFailedAt} < now() - make_interval(mins => ${WINDOW_MINUTES}) then 1 else ${loginAttempts.failures} + 1 end`,
        firstFailedAt: sql`case when ${loginAttempts.firstFailedAt} < now() - make_interval(mins => ${WINDOW_MINUTES}) then now() else ${loginAttempts.firstFailedAt} end`,
      },
    })
    .returning({ failures: loginAttempts.failures });

  if ((row?.failures ?? 0) >= MAX_FAILURES) {
    await getDb()
      .update(loginAttempts)
      .set({
        lockedUntil: sql`now() + make_interval(mins => ${LOCK_MINUTES})`,
        failures: 0,
        firstFailedAt: sql`now()`,
      })
      .where(eq(loginAttempts.key, key));
    return true;
  }
  return false;
}

export async function clearLoginFailures(key: string) {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.key, key));
}
