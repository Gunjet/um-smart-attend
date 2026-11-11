"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { ActionResult } from "../../_lib/dto";
import type { LeaveFormState } from "../../_lib/leave";
import { getCurrentUser } from "../auth/dal";
import { getDb, schema } from "../db";

const {
  leaveRequests,
  enrollments,
  courses,
  attendanceSessions,
  attendanceRecords,
} = schema;

const SERVER_ERROR = "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.";
/** Жижигрүүлсэн JPEG (≈1280px) ихэнхдээ 100–300 КБ. */
const MAX_ATTACHMENT_CHARS = 900_000;

async function requireRole(role: "student" | "teacher") {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user.role === role ? user : null;
}

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

const LeaveSchema = z.object({
  courseId: z.uuid({ error: "Хичээлээ сонгоно уу." }),
  date: z.iso.date({ error: "Огноогоо сонгоно уу." }),
  reason: z
    .string()
    .min(3, { error: "Шалтгаанаа бичнэ үү." })
    .max(500, { error: "Шалтгаан хэт урт байна." }),
  attachment: z
    .string()
    .max(MAX_ATTACHMENT_CHARS, { error: "Зураг хэт том байна." })
    .refine((value) => !value || value.startsWith("data:image/jpeg;base64,"), {
      error: "Зөвхөн зураг хавсаргана.",
    }),
});

/** Оюутан чөлөөний хүсэлт илгээнэ. */
export async function createLeaveRequest(
  _previous: LeaveFormState,
  formData: FormData,
): Promise<LeaveFormState> {
  const student = await requireRole("student");
  if (!student) return { error: "Зөвхөн оюутан хүсэлт илгээнэ." };

  const parsed = LeaveSchema.safeParse({
    courseId: field(formData, "courseId"),
    date: field(formData, "date"),
    reason: field(formData, "reason"),
    attachment: field(formData, "attachment"),
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: {
        courseId: fields.courseId?.[0],
        date: fields.date?.[0],
        reason: fields.reason?.[0],
        attachment: fields.attachment?.[0],
      },
    };
  }
  const { courseId, date, reason, attachment } = parsed.data;

  try {
    const db = getDb();
    // Өнөөдрөөс 7 хоногийн өмнөөс 30 хоногийн дараа хүртэл.
    const [range] = await db.execute<{ ok: boolean }>(sql`
      select ${date}::date between
        (now() at time zone 'Asia/Ulaanbaatar')::date - 7 and
        (now() at time zone 'Asia/Ulaanbaatar')::date + 30 as ok`);
    if (!range?.ok) {
      return {
        fieldErrors: {
          date: "Сүүлийн 7 хоногоос 30 хоногийн дараа хүртэлх өдөр сонгоно уу.",
        },
      };
    }
    const [enrolled] = await db
      .select({ id: courses.id })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(
        and(
          eq(enrollments.studentId, student.id),
          eq(enrollments.courseId, courseId),
        ),
      )
      .limit(1);
    if (!enrolled) {
      return { fieldErrors: { courseId: "Та энэ хичээлд бүртгэлгүй байна." } };
    }
    const [duplicate] = await db
      .select({ id: leaveRequests.id })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.studentId, student.id),
          eq(leaveRequests.courseId, courseId),
          eq(leaveRequests.date, date),
          inArray(leaveRequests.status, ["pending", "approved"]),
        ),
      )
      .limit(1);
    if (duplicate) {
      return { error: "Энэ өдрийн хүсэлт аль хэдийн илгээгдсэн байна." };
    }
    await db.insert(leaveRequests).values({
      studentId: student.id,
      courseId,
      date,
      reason,
      attachment: attachment || null,
    });
  } catch (error) {
    console.error("createLeaveRequest failed", error);
    return { error: SERVER_ERROR };
  }
  refresh();
  return { ok: true, message: "Чөлөөний хүсэлт илгээгдлээ." };
}

/** Хүлээгдэж буй өөрийн хүсэлтийг цуцлах. */
export async function cancelLeaveRequest(id: string): Promise<ActionResult> {
  const student = await requireRole("student");
  if (!student) return { ok: false, error: "Зөвхөн оюутан цуцална." };
  if (!z.uuid().safeParse(id).success)
    return { ok: false, error: "Буруу хүсэлт." };
  try {
    const removed = await getDb()
      .delete(leaveRequests)
      .where(
        and(
          eq(leaveRequests.id, id),
          eq(leaveRequests.studentId, student.id),
          eq(leaveRequests.status, "pending"),
        ),
      )
      .returning({ id: leaveRequests.id });
    if (!removed.length) return { ok: false, error: "Хүсэлт олдсонгүй." };
  } catch (error) {
    console.error("cancelLeaveRequest failed", error);
    return { ok: false, error: SERVER_ERROR };
  }
  refresh();
  return { ok: true, message: "Хүсэлт цуцлагдлаа." };
}

/**
 * Багш хүсэлтийг зөвшөөрөх / татгалзах. Зөвшөөрвөл тухайн өдрийн хаагдсан
 * ирцүүдэд "Тасалсан" байсныг "Чөлөөтэй" болгоно (дараа нь хаагдах ирцэд
 * автоматаар "Чөлөөтэй" болно).
 */
export async function reviewLeaveRequest(
  id: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  const teacher = await requireRole("teacher");
  if (!teacher) return { ok: false, error: "Зөвхөн багш шийдвэрлэнэ." };
  if (!z.uuid().safeParse(id).success)
    return { ok: false, error: "Буруу хүсэлт." };
  try {
    const db = getDb();
    const [request] = await db
      .select({
        id: leaveRequests.id,
        studentId: leaveRequests.studentId,
        courseId: leaveRequests.courseId,
        date: leaveRequests.date,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .innerJoin(courses, eq(courses.id, leaveRequests.courseId))
      .where(and(eq(leaveRequests.id, id), eq(courses.teacherId, teacher.id)))
      .limit(1);
    if (!request) return { ok: false, error: "Хүсэлт олдсонгүй." };
    if (request.status !== "pending") {
      return { ok: false, error: "Энэ хүсэлтийг аль хэдийн шийдвэрлэсэн." };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(leaveRequests)
        .set({
          status: decision,
          reviewedBy: teacher.id,
          reviewedAt: new Date(),
        })
        .where(eq(leaveRequests.id, id));
      if (decision === "approved") {
        const sessions = tx
          .select({ id: attendanceSessions.id })
          .from(attendanceSessions)
          .where(
            and(
              eq(attendanceSessions.courseId, request.courseId),
              sql`(${attendanceSessions.openedAt} at time zone 'Asia/Ulaanbaatar')::date = ${request.date}`,
            ),
          );
        await tx
          .update(attendanceRecords)
          .set({
            status: "excused",
            markedBy: teacher.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(attendanceRecords.studentId, request.studentId),
              eq(attendanceRecords.status, "absent"),
              inArray(attendanceRecords.sessionId, sessions),
            ),
          );
      }
    });
  } catch (error) {
    console.error("reviewLeaveRequest failed", error);
    return { ok: false, error: SERVER_ERROR };
  }
  refresh();
  return {
    ok: true,
    message:
      decision === "approved"
        ? "Хүсэлт зөвшөөрөгдлөө."
        : "Хүсэлт татгалзагдлаа.",
  };
}
