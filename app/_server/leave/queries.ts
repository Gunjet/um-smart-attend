import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { LeaveRequestItem } from "../../_lib/leave";
import { getDb, schema } from "../db";

const { leaveRequests, courses, users } = schema;

/** Оюутны өөрийн хүсэлтүүд (сүүлийн 60 хоног). */
export async function getStudentLeaveRequests(
  studentId: string,
): Promise<LeaveRequestItem[]> {
  return getDb()
    .select({
      id: leaveRequests.id,
      courseTitle: courses.title,
      courseCode: courses.code,
      date: leaveRequests.date,
      reason: leaveRequests.reason,
      attachment: leaveRequests.attachment,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .innerJoin(courses, eq(courses.id, leaveRequests.courseId))
    .where(
      and(
        eq(leaveRequests.studentId, studentId),
        sql`${leaveRequests.createdAt} > now() - interval '60 days'`,
      ),
    )
    .orderBy(desc(leaveRequests.createdAt));
}

/** Багшийн хичээлүүдийн хүсэлтүүд (хүлээгдэж буй нь эхэндээ, сүүлийн 60 хоног). */
export async function getTeacherLeaveRequests(
  teacherId: string,
): Promise<LeaveRequestItem[]> {
  return getDb()
    .select({
      id: leaveRequests.id,
      courseTitle: courses.title,
      courseCode: courses.code,
      date: leaveRequests.date,
      reason: leaveRequests.reason,
      attachment: leaveRequests.attachment,
      status: leaveRequests.status,
      studentName: users.fullName,
      studentCode: users.studentCode,
      classGroup: users.classGroup,
    })
    .from(leaveRequests)
    .innerJoin(courses, eq(courses.id, leaveRequests.courseId))
    .innerJoin(users, eq(users.id, leaveRequests.studentId))
    .where(
      and(
        eq(courses.teacherId, teacherId),
        sql`${leaveRequests.createdAt} > now() - interval '60 days'`,
      ),
    )
    .orderBy(
      sql`${leaveRequests.status} = 'pending' desc`,
      desc(leaveRequests.date),
    )
    .then((rows) =>
      rows.map((row) => ({ ...row, studentCode: row.studentCode ?? "" })),
    );
}

/** Улаанбаатарын цагаар өнөөдөр, "YYYY-MM-DD" (render-т Date ашиглахгүйн тулд). */
export async function getUlaanbaatarToday() {
  const [row] = await getDb().execute<{ today: string }>(
    sql`select (now() at time zone 'Asia/Ulaanbaatar')::date::text as today`,
  );
  return row.today;
}
