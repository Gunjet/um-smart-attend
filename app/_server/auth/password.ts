import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Seed скрипт ч ашигладаг тул "server-only" импортлохгүй.

const KEY_LENGTH = 64;
const COST = 16384; // N
const BLOCK_SIZE = 8; // r
const PARALLELISM = 1; // p

function derive(
  password: string,
  salt: Buffer,
  N: number,
  r: number,
  p: number,
) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, { N, r, p }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

/** "scrypt$N$r$p$salt$hash" хэлбэрээр хадгална. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM);
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, N, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(
    password,
    Buffer.from(salt, "base64url"),
    Number(N),
    Number(r),
    Number(p),
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Хэрэглэгч олдоогүй үед ч ижил хугацаа зарцуулж,
 * "ийм хэрэглэгч байна уу" гэдгийг хариуны хурдаар таахаас сэргийлнэ.
 */
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);

export async function verifyPasswordOrDummy(
  password: string,
  stored: string | undefined,
) {
  const ok = await verifyPassword(password, stored ?? DUMMY_HASH);
  return Boolean(stored) && ok;
}
