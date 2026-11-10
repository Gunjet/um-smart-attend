import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CourseSlot } from "../../_lib/schedule";

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
    /** Оюутны анги (хөтөлбөр + курс), жишээ нь "МТ-1". */
    classGroup: text("class_group"),
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

/* ------------------------------- Хичээл ------------------------------- */

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Хичээлийн код, жишээ нь "CS304". */
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    /** Хичээл ордог ангиуд (хөтөлбөр + курс), жишээ нь ["МТ-1", "ЦИ-1"]. */
    classGroups: text("class_groups")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Хичээл орох хугацаа, "YYYY-MM-DD". */
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    /** Хичээл орох цагууд: гариг (1 = Даваа … 7 = Ням) + эхлэх/дуусах цаг. */
    slots: jsonb("slots")
      .$type<CourseSlot[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    teacherId: uuid("teacher_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("courses_teacher_id_idx").on(table.teacherId),
    check("courses_date_range", sql`${table.endDate} >= ${table.startDate}`),
  ],
);

/** Хичээлд бүртгэлтэй оюутнууд. */
export const enrollments = pgTable(
  "enrollments",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.studentId] }),
    index("enrollments_student_id_idx").on(table.studentId),
  ],
);

/* ------------------------------- Ирц ------------------------------- */

export const attendanceStatus = pgEnum("attendance_status", [
  "present",
  "absent",
]);

/** Багш нэг удаа ирц нээж хаах нь нэг session. */
export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    openedBy: uuid("opened_by").references(() => users.id, {
      onDelete: "set null",
    }),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** QR код болон 6 оронтой кодын гарын үсгийн нууц түлхүүр. Клиент рүү явахгүй. */
    qrSecret: text("qr_secret").notNull(),
  },
  (table) => [
    index("attendance_sessions_course_id_idx").on(table.courseId),
    // Нэг хичээлд зэрэг нэг л нээлттэй session байна.
    uniqueIndex("attendance_sessions_one_open_per_course")
      .on(table.courseId)
      .where(sql`${table.closedAt} is null`),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    /** Оюутан өөрөө бүртгүүлсэн цаг (багш гараар тэмдэглэсэн бол null). */
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    /** Багш гараар тэмдэглэсэн бол багшийн id. */
    markedBy: uuid("marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.studentId] }),
    index("attendance_records_student_id_idx").on(table.studentId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
