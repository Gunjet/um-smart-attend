/**
 * Demo бүртгэлүүдийг өгөгдлийн санд оруулна (дахин ажиллуулахад давхардахгүй).
 *   npm run db:seed
 * Нууц үгийг SEED_PASSWORD орчны хувьсагчаар өөрчилж болно.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../app/_server/auth/password";
import * as schema from "../app/_server/db/schema";
import { ROSTER } from "../app/_lib/demo-data";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env-ийг шууд тохируулсан байж болно */
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL тохируулаагүй байна (.env.local).");
  process.exit(1);
}

const password = process.env.SEED_PASSWORD ?? "Demo1234!";
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle({ client, schema });

async function main() {
  const passwordHash = await hashPassword(password);

  const staff: schema.NewUserRow[] = [
    {
      role: "admin",
      fullName: "Системийн админ",
      email: "admin@must.edu.mn",
      passwordHash,
    },
    {
      role: "teacher",
      fullName: "Б. Энхтөр",
      email: "enkhtur@must.edu.mn",
      passwordHash,
    },
  ];
  const students: schema.NewUserRow[] = ROSTER.map((entry) => ({
    role: "student",
    fullName: entry.name,
    studentCode: entry.id.toUpperCase(),
    passwordHash,
  }));

  const inserted = await db
    .insert(schema.users)
    .values([...staff, ...students])
    .onConflictDoNothing()
    .returning({ id: schema.users.id });

  console.log(`Шинээр нэмэгдсэн: ${inserted.length} хэрэглэгч.`);
  console.log(`Нууц үг (бүгдэд): ${password}`);
  console.log("Багш: enkhtur@must.edu.mn · Админ: admin@must.edu.mn");
  console.log(`Оюутан жишээ: ${ROSTER[0].id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
