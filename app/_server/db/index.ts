import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof createDb>;

function createDb(url: string) {
  const client = postgres(url, {
    // Serverless орчинд холболтыг цөөн байлгана (Neon-ий pooled URL-тэй тохирно).
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    prepare: false,
  });
  return drizzle({ client, schema });
}

// Dev горимд hot reload бүрт шинэ pool үүсгэхгүйн тулд globalThis-д хадгална.
const globalForDb = globalThis as unknown as { db?: Database };

/** DB холболтыг анх хэрэглэх үед үүсгэнэ (build үед DATABASE_URL шаардахгүй). */
export function getDb(): Database {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL тохируулаагүй байна. .env.local файлд Neon-ий холболтын URL-ийг оруулна уу.",
      );
    }
    globalForDb.db = createDb(url);
  }
  return globalForDb.db;
}

export { schema };
