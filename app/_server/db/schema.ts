import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "teacher", "student"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: userRole("role").notNull(),
    fullName: text("full_name").notNull(),
    /** Багш, админ нэвтрэх нэр (жижиг үсгээр хадгална). */
    email: text("email").unique(),
    /** Оюутан нэвтрэх нэр (том үсгээр хадгална). */
    studentCode: text("student_code").unique(),
    passwordHash: text("password_hash").notNull(),
    /** Оюутны холбогдсон төхөөрөмжийн hash. Анх нэвтрэхэд тохируулагдана. */
    deviceIdHash: text("device_id_hash"),
    deviceBoundAt: timestamp("device_bound_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_identifier_by_role",
      sql`(${table.role} = 'student' and ${table.studentCode} is not null)
        or (${table.role} <> 'student' and ${table.email} is not null)`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** Cookie дахь token-ий SHA-256 hash. Token өөрөө санд хадгалагдахгүй. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
