"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult, RosterEntry, SessionQr } from "../../_lib/dto";
import { getCurrentUser } from "../auth/dal";
import {
  findTeacherSession,
  getSessionRoster,
  scheduledTodaySql,
} from "../courses/queries";
import { getDb, schema } from "../db";
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
  try {
    const db = getDb();
    const [course] = await db
      .select({ id: courses.id, scheduledToday: scheduledTodaySql })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.teacherId, teacher.id)))
      .limit(1);
    if (!course) return { ok: false, error: "Хичээл олдсонгүй." };
    if (!course.scheduledToday) {
      return { ok: false, error: "Энэ хичээл өнөөдрийн хуваарьт ороогүй." };
    }
    await db.insert(attendanceSessions).values({
      courseId,
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
  return { ok: true, message: "Ирцийн бүртгэл эхэллээ." };
}

export async function closeSession(sessionId: string): Promise<ActionResult> {
  const teacher = await requireRole("teacher");
  if (!teacher) return { ok: false, error: "Ирцийг зөвхөн багш хаана." };
  try {
    const session = await findTeacherSession(sessionId, teacher.id);
    if (!session || session.closedAt) {
      return { ok: false, error: "Нээлттэй ирц олдсонгүй." };
    }
    await getDb().transaction(async (tx) => {
      // Бүртгүүлээгүй оюутнуудыг "Тасалсан" гэж тэмдэглэнэ.
      await tx.execute(sql`
        insert into attendance_records (session_id, student_id, status)
        select ${sessionId}, e.student_id, 'absent'
        from enrollments e
        where e.course_id = ${session.courseId}
        on conflict do nothing`);
      await tx
        .update(attendanceSessions)
        .set({ closedAt: new Date() })
        .where(eq(attendanceSessions.id, sessionId));
    });
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

/** QR кодын текст эсвэл 6 оронтой кодоор ирц бүртгүүлнэ. */
export async function checkIn(input: string): Promise<ActionResult> {
  const student = await requireRole("student");
  if (!student) return { ok: false, error: "Ирцийг зөвхөн оюутан бүртгүүлнэ." };

  const value = input.trim();
  const now = Date.now();
  const db = getDb();

  try {
    // Оюутны бүртгэлтэй хичээлүүдийн нээлттэй session-ууд.
    const openSessions = await db
      .select({
        id: attendanceSessions.id,
        qrSecret: attendanceSessions.qrSecret,
        courseTitle: courses.title,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(courses.id, attendanceSessions.courseId))
      .innerJoin(
        enrollments,
        and(
          eq(enrollments.courseId, courses.id),
          eq(enrollments.studentId, student.id),
        ),
      )
      .where(isNull(attendanceSessions.closedAt));

    let session: (typeof openSessions)[number] | undefined;
    if (/^\d{6}$/.test(value)) {
      session = openSessions.find((item) =>
        matchesShortCode(item.qrSecret, value, now),
      );
      if (!session) {
        return {
          ok: false,
          error: "Код буруу эсвэл хугацаа нь дууссан байна.",
        };
      }
    } else {
      const parsed = parseQrPayload(value);
      if (!parsed)
        return { ok: false, error: "Энэ QR код ирцийн код биш байна." };
      session = openSessions.find((item) => item.id === parsed.sessionId);
      if (!session) {
        return {
          ok: false,
          error:
            "Энэ хичээлийн ирц хаагдсан эсвэл та энэ хичээлд бүртгэлгүй байна.",
        };
      }
      if (!verifyQrPayload(session.qrSecret, parsed, now)) {
        return {
          ok: false,
          error:
            "QR кодын хугацаа дууссан байна. Дэлгэц дээрх шинэ кодыг уншуулна уу.",
        };
      }
    }

    await db
      .insert(attendanceRecords)
      .values({
        sessionId: session.id,
        studentId: student.id,
        status: "present",
        checkedInAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: "present",
          checkedInAt: sql`coalesce(${attendanceRecords.checkedInAt}, now())`,
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
