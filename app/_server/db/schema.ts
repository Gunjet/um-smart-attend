import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
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
    /** Оюутны зөвлөлийн гишүүн — «Оюутны зөвлөл»-ийн нэрээр зарлал оруулна. */
    isCouncil: boolean("is_council").notNull().default(false),
    passwordHash: text("password_hash").notNull(),
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
  /** Чөлөөний хүсэлт зөвшөөрөгдсөн. */
  "excused",
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
    /** Хэддэх парын ирц (1–8). Хуучин бичлэгт null. */
    period: smallint("period"),
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
    /** Бүртгүүлэх үеийн сургуулиас хүртэлх зай (м). Шалгаагүй бол null. */
    distanceM: integer("distance_m"),
    /** Байршил зөвшөөрсөн радиуст багтсан эсэх. Шалгаагүй бол null. */
    locationOk: boolean("location_ok"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.studentId] }),
    index("attendance_records_student_id_idx").on(table.studentId),
  ],
);

/**
 * Оюутны Face ID / хурууны хээний түлхүүр (WebAuthn passkey).
 * Нууц түлхүүр утсанд үлдэнэ, энд зөвхөн нийтийн түлхүүр хадгалагдана.
 */
export const passkeys = pgTable(
  "passkeys",
  {
    /** Credential ID (base64url). */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** COSE нийтийн түлхүүр (base64url). */
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transports: text("transports").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("passkeys_user_id_idx").on(table.userId)],
);

export const webauthnPurpose = pgEnum("webauthn_purpose", [
  "register",
  "checkin",
]);

/** Нэг удаагийн WebAuthn challenge (хэрэглэгч бүрт нэг идэвхтэй). */
export const webauthnChallenges = pgTable("webauthn_challenges", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  challenge: text("challenge").notNull(),
  purpose: webauthnPurpose("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * Сургуулийн байрууд. Оюутан аль нэг байрны радиус дотор байвал ирц
 * бүртгүүлж болно.
 */
export const campusSites = pgTable(
  "campus_sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    /** Зөвшөөрөх радиус (м). */
    radiusM: integer("radius_m").notNull().default(150),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("campus_sites_radius", sql`${table.radiusM} between 20 and 5000`),
  ],
);

/**
 * Нэвтрэх оролдлогын тоо (нууц үг таахаас хамгаална).
 * key = эрх + нэвтрэх нэр, жишээ нь "student:B261940110".
 */
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  firstFailedAt: timestamp("first_failed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

export const leaveStatus = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
]);

/** Оюутны чөлөөний хүсэлт: тухайн өдрийн тухайн хичээлийн бүх пар. */
export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    /** Чөлөө авах өдөр, "YYYY-MM-DD". */
    date: date("date", { mode: "string" }).notNull(),
    reason: text("reason").notNull(),
    /** Нотлох баримтын зураг (жижигрүүлсэн JPEG data URL). */
    attachment: text("attachment"),
    status: leaveStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("leave_requests_course_idx").on(table.courseId, table.date),
    index("leave_requests_student_idx").on(table.studentId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

/* ------------------------------- Зарлал ------------------------------- */

/** Зарлалыг хэний нэрээр оруулсан: Сургалтын алба эсвэл Оюутны зөвлөл. */
export const postSource = pgEnum("post_source", ["academic", "council"]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: postSource("source").notNull(),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("posts_created_idx").on(table.createdAt)],
);

/** Санал асуулгын хариултууд (байхгүй бол энгийн зарлал). */
export const pollOptions = pgTable(
  "poll_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: smallint("position").notNull(),
  },
  (table) => [index("poll_options_post_idx").on(table.postId)],
);

/**
 * Хэрэглэгч бүр нэг санал асуулгад нэг л санал өгнө (солих боломжтой).
 * Хэн юу сонгосныг хэнд ч харуулахгүй — зөвхөн нийт тоо.
 */
export const pollVotes = pgTable(
  "poll_votes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("poll_votes_option_idx").on(table.optionId),
  ],
);
