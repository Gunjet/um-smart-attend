import { defineConfig } from "drizzle-kit";

// drizzle-kit нь Next шиг .env.local-ийг өөрөө уншдаггүй.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI орчинд env-ийг шууд тохируулсан байж болно */
}

export default defineConfig({
  schema: "./app/_server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migration нь PgBouncer-ээр (pooled) биш шууд холболтоор ажиллах ёстой.
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
});
