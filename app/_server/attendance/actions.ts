"use server";

import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type {
  ActionResult,
  CheckInResult,
  RosterEntry,
  SessionQr,
} from "../../_lib/dto";
import {
  type DeviceLocation,
  distanceMeters,
  formatDistance,
  MAX_ACCURACY_TOLERANCE_M,
} from "../../_lib/geo";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getCurrentUser } from "../auth/dal";
import { verifyCheckInPasskey } from "../auth/webauthn";
import {
  findTeacherSession,
  getSessionRoster,
  scheduledTodaySql,
} from "../courses/queries";
import { getDb, schema } from "../db";
import { getCampusSites } from "../settings/campus";
import { closeStaleSessions, finalizeSession } from "./sessions";
import {
  matchesShortCode,
  newQrSecret,
  parseQrPayload,
  QR_ROTATION_MS,
  qrPayload,
  shortCode,
  tickAt,
  verifyQrPayload,
} from "./qr";
import {
  formatMinutes,
  isWithinPeriodWindow,
  periodAvailability,
  periodsForDay,
  periodWindow,
  ulaanbaatarMinutes,
} from "../../_lib/schedule";

const { courses, enrollments, attendanceSessions, attendanceRecords } = schema;

const SERVER_ERROR: ActionResult = {
  ok: false,
  error: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
};

/** Session дууссан бол нэвтрэх хуудас руу, өөр эрхтэй бол null. */
async function requireRole(role: "teacher" | "student") {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user.role === role ? user : null;
}

function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code === "23505";
}

/* --------------------------------- Багш --------------------------------- */

export async function openSession(courseId: string): Promise<ActionResult> {
  const teacher = await requireRole("teacher");
  if (!teacher) return { ok: false, error: "Ирцийг зөвхөн багш нээнэ." };
  let period: number | undefined;
  try {
    await closeStaleSessions();
    const db = getDb();
    const [course] = await db
      .select({
        id: courses.id,
        slots: courses.slots,
        scheduledToday: scheduledTodaySql,
        archived: sql<boolean>`${courses.archivedAt} is not null`,
        todayDow: sql<number>`extract(isodow from now() at time zone 'Asia/Ulaanbaatar')::int`,
      })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacher.id)))
      .limit(1);
    if (!course || course.archived) {
      return { ok: false, error: "Хичээл олдсонгүй." };
    }
    if (!course.scheduledToday) {
      return { ok: false, error: "Энэ хичээл өнөөдрийн хуваарьт ороогүй." };
    }

    // Пар бүрийн ирцийг тусад нь, нэг л удаа авна.
    const taken = await db
      .select({ period: attendanceSessions.period })
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.courseId, courseId),
          isNotNull(attendanceSessions.period),
          sql`(${attendanceSessions.openedAt} at time zone 'Asia/Ulaanbaatar')::date = (now() at time zone 'Asia/Ulaanbaatar')::date`,
        ),
      );
    const { openable, upcoming, untaken } = periodAvailability(
      periodsForDay(course.slots, course.todayDow),
      taken.flatMap((row) => (row.period ? [row.period] : [])),
      ulaanbaatarMinutes(),
    );
    if (!openable) {
      const window = upcoming ? periodWindow(upcoming) : null;
      return {
        ok: false,
        error: window
          ? `${upcoming}-р парын ирцийг ${formatMinutes(window.from)}-аас нээх боломжтой.`
          : untaken.length
            ? "Өнөөдрийн ирц авах хугацаа өнгөрсөн."
            : "Энэ хичээлийн өнөөдрийн бүх парын ирц авагдсан.",
      };
    }
    period = openable;
    await db.insert(attendanceSessions).values({
      courseId,
      period,
      openedBy: teacher.id,
      qrSecret: newQrSecret(),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "Энэ хичээлийн ирц аль хэдийн нээлттэй байна.",
      };
    }
    console.error("openSession failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: `${period}-р парын ирцийн бүртгэл эхэллээ.` };
}

export async function closeSession(sessionId: string): Promise<ActionResult> {
  const teacher = await requireRole("teacher");
  if (!teacher) return { ok: false, error: "Ирцийг зөвхөн багш хаана." };
  try {
    const session = await findTeacherSession(sessionId, teacher.id);
    if (!session || session.closedAt) {
      return { ok: false, error: "Нээлттэй ирц олдсонгүй." };
    }
    await getDb().transaction((tx) =>
      finalizeSession(tx, sessionId, session.courseId),
    );
  } catch (error) {
    console.error("closeSession failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true, message: "Ирцийн бүртгэл хаагдлаа." };
}

/** Одоогийн 30 секундын QR болон 6 оронтой код. */
export async function getSessionQr(
  sessionId: string,
): Promise<SessionQr | null> {
  const teacher = await requireRole("teacher");
  if (!teacher) return null;
  const session = await findTeacherSession(sessionId, teacher.id);
  if (!session || session.closedAt) return null;
  const now = Date.now();
  const tick = tickAt(now);
  return {
    payload: qrPayload(session.qrSecret, session.id, tick),
    code: shortCode(session.qrSecret, tick),
    expiresAt: (tick + 1) * QR_ROTATION_MS,
  };
}

export async function getLiveRoster(
  sessionId: string,
): Promise<RosterEntry[] | null> {
  const teacher = await requireRole("teacher");
  if (!teacher) return null;
  // Парын цаг дууссан бол автоматаар хааж, багшийн хуудсыг шинэчилнэ.
  if (await closeStaleSessions()) refresh();
  const session = await findTeacherSession(sessionId, teacher.id);
  if (!session) return null;
  return getSessionRoster(sessionId);
}

/** Утасгүй ирсэн оюутан гэх мэтийг багш гараар тэмдэглэнэ. */
export async function markAttendance(
  sessionId: string,
  studentId: string,
  status: "present" | "absent",
): Promise<ActionResult> {
  const teacher = await requireRole("teacher");
  if (!teacher) return { ok: false, error: "Зөвхөн багш тэмдэглэнэ." };
  try {
    const session = await findTeacherSession(sessionId, teacher.id);
    if (!session || session.closedAt) {
      return { ok: false, error: "Ирц хаагдсан байна." };
    }
    const db = getDb();
    const [enrolled] = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, session.courseId),
          eq(enrollments.studentId, studentId),
        ),
      )
      .limit(1);
    if (!enrolled)
      return { ok: false, error: "Оюутан энэ хичээлд бүртгэлгүй." };

    await db
      .insert(attendanceRecords)
      .values({ sessionId, studentId, status, markedBy: teacher.id })
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: { status, markedBy: teacher.id, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("markAttendance failed", error);
    return SERVER_ERROR;
  }
  return { ok: true };
}

/* -------------------------------- Оюутан -------------------------------- */

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
});

const LOCATION_REQUIRED =
  "Ирц бүртгүүлэхийн тулд байршлаа зөвшөөрнө үү. Утасныхаа тохиргооноос энэ сайтад байршил ашиглахыг зөвшөөрөөд дахин оролдоно уу.";

/**
 * QR кодын текст эсвэл 6 оронтой кодоор ирц бүртгүүлнэ.
 * Face ID / хурууны хээгээр баталгаажуулах шаардлагатай.
 * Сургуулийн байршил тохируулсан бол оюутны байршлыг шалгаж,
 * радиусаас гадна байвал бүртгэхгүй.
 */
export async function checkIn(
  input: string,
  location: DeviceLocation | null,
  passkey: AuthenticationResponseJSON | null,
): Promise<CheckInResult> {
  const student = await requireRole("student");
  if (!student) return { ok: false, error: "Ирцийг зөвхөн оюутан бүртгүүлнэ." };

  const value = input.trim();
  const db = getDb();

  try {
    const resolved = await resolveCheckInSession(student.id, value);
    if ("error" in resolved) {
      return { ok: false, step: "code", error: resolved.error };
    }
    const { session } = resolved;

    // Код зөв бол дараа нь Face ID, байршлыг шалгана (буруу кодоор Face ID
    // дахин хийлгэхгүй).
    // Оюутан өөрийн утсаараа, өөрийн царай/хурууны хээгээр бүртгүүлж буйг шалгана.
    const passkeyError = await verifyCheckInPasskey(student.id, passkey);
    if (passkeyError) {
      return { ok: false, error: passkeyError, step: "passkey" };
    }

    // Сургуулийн аль нэг байрны радиус дотор байгаа эсэх (тохируулсан бол заавал).
    const sites = await getCampusSites();
    let distanceM: number | null = null;
    if (sites.length) {
      const parsedLocation = LocationSchema.safeParse(location);
      if (!parsedLocation.success) {
        return { ok: false, error: LOCATION_REQUIRED, step: "location" };
      }
      const tolerance = Math.min(
        parsedLocation.data.accuracy,
        MAX_ACCURACY_TOLERANCE_M,
      );
      // Хамгийн ойр байр (радиусаас хэтэрсэн зайгаар).
      const nearest = sites
        .map((site) => {
          const distance = distanceMeters(site, parsedLocation.data);
          return { distance, excess: distance - tolerance - site.radiusM };
        })
        .sort((a, b) => a.excess - b.excess)[0];
      distanceM = Math.round(nearest.distance);
      if (nearest.excess > 0) {
        return {
          ok: false,
          step: "location",
          error: `Та сургуулиас ${formatDistance(nearest.distance)} зайтай байна. Ирцээ сургууль дээрээ бүртгүүлнэ үү.`,
        };
      }
    }
    const locationOk = sites.length ? true : null;

    await db
      .insert(attendanceRecords)
      .values({
        sessionId: session.id,
        studentId: student.id,
        status: "present",
        checkedInAt: new Date(),
        distanceM,
        locationOk,
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: "present",
          checkedInAt: sql`coalesce(${attendanceRecords.checkedInAt}, now())`,
          distanceM,
          locationOk,
          updatedAt: new Date(),
        },
      });

    refresh();
    return {
      ok: true,
      message: `${session.courseTitle} хичээлийн ирцэд бүртгэгдлээ.`,
    };
  } catch (error) {
    console.error("checkIn failed", error);
    return SERVER_ERROR;
  }
}

/**
 * QR эсвэл 6 оронтой кодоор оюутны нээлттэй ирцийг олж, кодын хүчинтэй
 * эсэх ба парын цагийг шалгана.
 */
async function resolveCheckInSession(
  studentId: string,
  value: string,
): Promise<
  | { session: { id: string; courseTitle: string } }
  | { error: string; kind: "code_invalid" | "code_expired" }
> {
  const db = getDb();
  // Оюутны бүртгэлтэй хичээлүүдийн нээлттэй session-ууд.
  const openSessions = await db
    .select({
      id: attendanceSessions.id,
      qrSecret: attendanceSessions.qrSecret,
      courseTitle: courses.title,
      period: attendanceSessions.period,
      openedToday: sql<boolean>`(${attendanceSessions.openedAt} at time zone 'Asia/Ulaanbaatar')::date = (now() at time zone 'Asia/Ulaanbaatar')::date`,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(courses.id, attendanceSessions.courseId))
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.courseId, courses.id),
        eq(enrollments.studentId, studentId),
      ),
    )
    .where(isNull(attendanceSessions.closedAt));

  let session: (typeof openSessions)[number] | undefined;
  if (/^\d{6}$/.test(value)) {
    session = openSessions.find((item) =>
      matchesShortCode(item.qrSecret, value, Date.now()),
    );
    if (!session) {
      return {
        kind: "code_invalid",
        error: "Код буруу эсвэл хугацаа нь дууссан байна.",
      };
    }
  } else {
    const parsed = parseQrPayload(value);
    if (!parsed)
      return {
        kind: "code_invalid",
        error: "Энэ QR код ирцийн код биш байна.",
      };
    session = openSessions.find((item) => item.id === parsed.sessionId);
    if (!session) {
      return {
        kind: "code_invalid",
        error:
          "Энэ хичээлийн ирц хаагдсан эсвэл та энэ хичээлд бүртгэлгүй байна.",
      };
    }
    if (!verifyQrPayload(session.qrSecret, parsed, Date.now())) {
      return {
        kind: "code_expired",
        error:
          "QR кодын хугацаа дууссан байна. Дэлгэц дээрх шинэ кодыг уншуулна уу.",
      };
    }
  }

  // Парын цагаас (±10 минут) гадуур бүртгэхгүй.
  if (
    session.period &&
    (!session.openedToday ||
      !isWithinPeriodWindow(session.period, ulaanbaatarMinutes()))
  ) {
    return {
      kind: "code_expired",
      error: "Энэ парын ирц бүртгэх хугацаа дууссан.",
    };
  }

  return { session };
}

/**
 * Оюутан код оруулах эсвэл QR уншуулмагц (Face ID асуухаас өмнө) кодыг
 * урьдчилан шалгана. Ингэснээр буруу кодоор Face ID хийлгэхгүй.
 */
export async function precheckCheckIn(input: string): Promise<CheckInResult> {
  const student = await requireRole("student");
  if (!student) return { ok: false, error: "Ирцийг зөвхөн оюутан бүртгүүлнэ." };
  try {
    const resolved = await resolveCheckInSession(student.id, input.trim());
    if ("error" in resolved) {
      return { ok: false, step: "code", error: resolved.error };
    }
    return { ok: true };
  } catch (error) {
    console.error("precheckCheckIn failed", error);
    return SERVER_ERROR;
  }
}

/* ------------------------------ Тайлан засах ------------------------------ */

const ReportEditSchema = z.object({
  sessionIds: z.array(z.uuid()).min(1).max(20),
  studentId: z.uuid(),
  status: z.enum(["present", "absent"]),
});

/**
 * Хаагдсан ирцийн тайлангаас оюутны төлвийг (Ирсэн ↔ Тасалсан) засна.
 * Зөвхөн өөрийн хичээлийн, хаагдсан ирцийг засна.
 */
export async function updateReportStatus(
  sessionIds: string[],
  studentId: string,
  status: "present" | "absent",
): Promise<ActionResult> {
  const teacher = await requireRole("teacher");
  if (!teacher) return { ok: false, error: "Зөвхөн багш засна." };
  const parsed = ReportEditSchema.safeParse({ sessionIds, studentId, status });
  if (!parsed.success) return { ok: false, error: "Буруу хүсэлт." };

  try {
    const db = getDb();
    const ids = [...new Set(parsed.data.sessionIds)];
    const owned = await db
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .innerJoin(courses, eq(courses.id, attendanceSessions.courseId))
      .where(
        and(
          inArray(attendanceSessions.id, ids),
          eq(courses.teacherId, teacher.id),
          isNotNull(attendanceSessions.closedAt),
        ),
      );
    if (owned.length !== ids.length) {
      return { ok: false, error: "Ирцийн бүртгэл олдсонгүй." };
    }
    await db
      .insert(attendanceRecords)
      .values(
        ids.map((sessionId) => ({
          sessionId,
          studentId: parsed.data.studentId,
          status: parsed.data.status,
          markedBy: teacher.id,
        })),
      )
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: parsed.data.status,
          markedBy: teacher.id,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("updateReportStatus failed", error);
    return SERVER_ERROR;
  }
  refresh();
  return { ok: true };
}
