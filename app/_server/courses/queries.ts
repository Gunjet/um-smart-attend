import "server-only";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type {
  AdminCourse,
  RosterEntry,
  StudentCourse,
  TeacherCourse,
} from "../../_lib/dto";
import { nameParts } from "../../_lib/names";
import {
  type CourseSlot,
  formatDateRange,
  formatSlots,
  formatSlotTime,
  mergeSlots,
  sortSlots,
} from "../../_lib/schedule";
import type { AttendanceRecord, AttendanceStatus } from "../../_lib/types";
import { getDb, schema } from "../db";

const { courses, enrollments, attendanceSessions, attendanceRecords, users } =
  schema;

/** Тайлангийн огноог Монголын цагаар (UTC+8) тооцно. */
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatSchedule = (row: {
  startDate: string;
  endDate: string;
  slots: CourseSlot[];
}) =>
  `${formatDateRange(row.startDate, row.endDate)} · ${formatSlots(row.slots)}`;

/** Улаанбаатарын цагаар өнөөдрийн гариг (1 = Даваа … 7 = Ням). */
const todayDowSql = sql<number>`extract(isodow from now() at time zone 'Asia/Ulaanbaatar')::int`;

/** Өнөөдөр хугацаандаа багтаж, өнөөдрийн гарагт цагтай эсэх. */
export const scheduledTodaySql = sql<boolean>`(
  (now() at time zone 'Asia/Ulaanbaatar')::date between ${courses.startDate} and ${courses.endDate}
  and exists (
    select 1 from jsonb_array_elements(${courses.slots}) slot
    where (slot->>'day')::int = ${todayDowSql}))`;

const STATUS_LABEL: Record<"present" | "absent", AttendanceStatus> = {
  present: "Ирсэн",
  absent: "Тасалсан",
};

/* --------------------------------- Багш --------------------------------- */

export async function getTeacherCourses(
  teacherId: string,
): Promise<TeacherCourse[]> {
  const rows = await getDb()
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
      classGroups: courses.classGroups,
      startDate: courses.startDate,
      endDate: courses.endDate,
      slots: courses.slots,
      scheduledToday: scheduledTodaySql,
      todayDow: todayDowSql,
      enrolled: sql<number>`(select count(*)::int from enrollments e where e.course_id = ${courses.id})`,
      openSessionId: attendanceSessions.id,
    })
    .from(courses)
    .leftJoin(
      attendanceSessions,
      and(
        eq(attendanceSessions.courseId, courses.id),
        isNull(attendanceSessions.closedAt),
      ),
    )
    .where(eq(courses.teacherId, teacherId))
    .orderBy(asc(courses.title));

  return rows
    .map(({ startDate, endDate, slots, todayDow, ...row }) => {
      const todaySlots = sortSlots(
        slots.filter((slot) => slot.day === todayDow),
      );
      return {
        ...row,
        scheduledToday: Boolean(row.scheduledToday),
        todaySlots,
        time: todaySlots.length
          ? mergeSlots(todaySlots).map(formatSlotTime).join(", ")
          : formatSlots(slots),
        schedule: formatSchedule({ startDate, endDate, slots }),
      };
    })
    .sort((a, b) =>
      (a.todaySlots[0]?.start ?? "99").localeCompare(
        b.todaySlots[0]?.start ?? "99",
      ),
    );
}

/** Session нь энэ багшийн хичээлийнх бол session-ийг буцаана. */
export async function findTeacherSession(sessionId: string, teacherId: string) {
  const [row] = await getDb()
    .select({
      id: attendanceSessions.id,
      courseId: attendanceSessions.courseId,
      closedAt: attendanceSessions.closedAt,
      qrSecret: attendanceSessions.qrSecret,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(courses.id, attendanceSessions.courseId))
    .where(
      and(
        eq(attendanceSessions.id, sessionId),
        eq(courses.teacherId, teacherId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Хичээлийн бүх оюутан ба энэ session дахь төлөв. */
export async function getSessionRoster(
  sessionId: string,
): Promise<RosterEntry[]> {
  const rows = await getDb()
    .select({
      studentId: users.id,
      code: users.studentCode,
      name: users.fullName,
      status: attendanceRecords.status,
    })
    .from(attendanceSessions)
    .innerJoin(
      enrollments,
      eq(enrollments.courseId, attendanceSessions.courseId),
    )
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.sessionId, attendanceSessions.id),
        eq(attendanceRecords.studentId, users.id),
      ),
    )
    .where(eq(attendanceSessions.id, sessionId))
    .orderBy(asc(users.fullName));

  return rows.map((row) => ({
    studentId: row.studentId,
    code: row.code ?? "",
    name: row.name,
    initials: nameParts(row.name).initials,
    status: row.status ? STATUS_LABEL[row.status] : "Хүлээгдэж байна",
  }));
}

/**
 * Тайланд: багшийн хичээлүүдийн хаагдсан session-уудын ирц.
 * Нэг өдөр нэг хичээлд хэд хэдэн session байвал нэгтгэнэ (аль нэгэнд ирсэн бол "Ирсэн").
 */
export async function getTeacherReportRecords(
  teacherId: string,
): Promise<AttendanceRecord[]> {
  const rows = await getDb()
    .select({
      openedAt: attendanceSessions.openedAt,
      courseCode: courses.code,
      courseTitle: courses.title,
      studentId: users.id,
      studentCode: users.studentCode,
      name: users.fullName,
      status: attendanceRecords.status,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(courses.id, attendanceSessions.courseId))
    .innerJoin(
      attendanceRecords,
      eq(attendanceRecords.sessionId, attendanceSessions.id),
    )
    .innerJoin(users, eq(users.id, attendanceRecords.studentId))
    .where(
      and(
        eq(courses.teacherId, teacherId),
        isNotNull(attendanceSessions.closedAt),
      ),
    )
    .orderBy(asc(attendanceSessions.openedAt));

  const byKey = new Map<
    string,
    AttendanceRecord & {
      byStudent: Map<string, AttendanceRecord["students"][number]>;
    }
  >();
  for (const row of rows) {
    const date = dateKeyFormatter.format(row.openedAt);
    const key = `${row.courseCode}|${date}`;
    let record = byKey.get(key);
    if (!record) {
      record = {
        date,
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        students: [],
        byStudent: new Map(),
      };
      byKey.set(key, record);
    }
    const status = STATUS_LABEL[row.status];
    const existing = record.byStudent.get(row.studentId);
    if (!existing) {
      record.byStudent.set(row.studentId, {
        id: row.studentCode ?? "",
        name: row.name,
        initials: nameParts(row.name).initials,
        time: "—",
        status,
      });
    } else if (status === "Ирсэн") {
      existing.status = status;
    }
  }

  return [...byKey.values()].map(({ byStudent, ...record }) => ({
    ...record,
    students: [...byStudent.values()],
  }));
}

/* -------------------------------- Оюутан -------------------------------- */

export async function getStudentCourses(
  studentId: string,
): Promise<StudentCourse[]> {
  const teacher = alias(users, "teacher");
  const rows = await getDb()
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
      classGroups: courses.classGroups,
      startDate: courses.startDate,
      endDate: courses.endDate,
      slots: courses.slots,
      teacherName: teacher.fullName,
      openSessionId: attendanceSessions.id,
      checkedIn: sql<boolean>`exists (
        select 1 from attendance_records r
        where r.session_id = ${attendanceSessions.id}
          and r.student_id = ${studentId} and r.status = 'present')`,
      attended: sql<number>`(
        select count(*)::int from attendance_records r
        join attendance_sessions s on s.id = r.session_id
        where s.course_id = ${courses.id} and r.student_id = ${studentId}
          and r.status = 'present')`,
      absent: sql<number>`(
        select count(*)::int from attendance_records r
        join attendance_sessions s on s.id = r.session_id
        where s.course_id = ${courses.id} and r.student_id = ${studentId}
          and r.status = 'absent')`,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .leftJoin(teacher, eq(teacher.id, courses.teacherId))
    .leftJoin(
      attendanceSessions,
      and(
        eq(attendanceSessions.courseId, courses.id),
        isNull(attendanceSessions.closedAt),
      ),
    )
    .where(eq(enrollments.studentId, studentId))
    .orderBy(asc(courses.title));

  return rows.map(({ startDate, endDate, slots, ...row }) => ({
    ...row,
    checkedIn: Boolean(row.checkedIn),
    time: formatSlots(slots),
    schedule: formatDateRange(startDate, endDate),
  }));
}

/* --------------------------------- Админ --------------------------------- */

export async function listCoursesForAdmin(): Promise<AdminCourse[]> {
  const teacher = alias(users, "teacher");
  const rows = await getDb()
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
      classGroups: courses.classGroups,
      startDate: courses.startDate,
      endDate: courses.endDate,
      slots: courses.slots,
      teacherId: courses.teacherId,
      teacherName: teacher.fullName,
      studentIds: sql<string[]>`coalesce(
        (select array_agg(e.student_id::text) from enrollments e where e.course_id = ${courses.id}),
        '{}')`,
    })
    .from(courses)
    .leftJoin(teacher, eq(teacher.id, courses.teacherId))
    .orderBy(asc(courses.title));
  return rows.map((row) => ({ ...row, slots: sortSlots(row.slots) }));
}
