import "server-only";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type {
  AdminCourse,
  RosterEntry,
  StudentCourse,
  TeacherCourse,
  TodayAttendance,
} from "../../_lib/dto";
import { nameParts } from "../../_lib/names";
import {
  type CourseSlot,
  formatDateRange,
  formatSlots,
  formatSlotTime,
  mergeSlots,
  periodsForDay,
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

const STATUS_LABEL: Record<"present" | "absent" | "excused", AttendanceStatus> =
  {
    present: "Ирсэн",
    absent: "Тасалсан",
    excused: "Чөлөөтэй",
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
      openPeriod: attendanceSessions.period,
      closedTodaySessionId: sql<string | null>`(
        select s.id from attendance_sessions s
        where s.course_id = ${courses.id} and s.closed_at is not null
          and (s.opened_at at time zone 'Asia/Ulaanbaatar')::date
            = (now() at time zone 'Asia/Ulaanbaatar')::date
        order by s.closed_at desc limit 1)`,
      takenPeriods: sql<number[]>`coalesce((
        select array_agg(s.period::int) from attendance_sessions s
        where s.course_id = ${courses.id} and s.period is not null
          and (s.opened_at at time zone 'Asia/Ulaanbaatar')::date
            = (now() at time zone 'Asia/Ulaanbaatar')::date), '{}')`,
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
      const todayPeriods = periodsForDay(slots, todayDow);
      const taken = new Set(row.takenPeriods);
      return {
        ...row,
        scheduledToday: Boolean(row.scheduledToday),
        todaySlots,
        todayPeriods,
        nextPeriod: todayPeriods.find((period) => !taken.has(period)) ?? null,
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
 * Тайланд: багшийн хичээлүүдийн хаагдсан session-уудын ирц, пар бүрээр.
 * Нэг пар (эсвэл пар тодорхойгүй хуучин бичлэгт нэг өдөр) хэд хэдэн session
 * байвал нэгтгэнэ (аль нэгэнд ирсэн бол "Ирсэн").
 */
export async function getTeacherReportRecords(
  teacherId: string,
): Promise<AttendanceRecord[]> {
  const rows = await getDb()
    .select({
      sessionId: attendanceSessions.id,
      openedAt: attendanceSessions.openedAt,
      period: attendanceSessions.period,
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
    // Пар бүр тусдаа багана (хуучин, пар тодорхойгүй бичлэгүүд өдрөөрөө нэгдэнэ).
    const key = `${row.courseCode}|${date}|${row.period ?? ""}`;
    let record = byKey.get(key);
    if (!record) {
      record = {
        date,
        period: row.period,
        sessionIds: [],
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        students: [],
        byStudent: new Map(),
      };
      byKey.set(key, record);
    }
    if (!record.sessionIds.includes(row.sessionId)) {
      record.sessionIds.push(row.sessionId);
    }
    const status = STATUS_LABEL[row.status];
    const existing = record.byStudent.get(row.studentId);
    if (!existing) {
      record.byStudent.set(row.studentId, {
        id: row.studentCode ?? "",
        userId: row.studentId,
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
      excused: sql<number>`(
        select count(*)::int from attendance_records r
        join attendance_sessions s on s.id = r.session_id
        where s.course_id = ${courses.id} and r.student_id = ${studentId}
          and r.status = 'excused')`,
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

/** Оюутны өнөөдрийн (Улаанбаатарын цагаар) хичээллэлтүүд ба ирц, цагийн дарааллаар. */
export async function getStudentToday(
  studentId: string,
): Promise<TodayAttendance[]> {
  const rows = await getDb()
    .select({
      sessionId: attendanceSessions.id,
      courseTitle: courses.title,
      period: attendanceSessions.period,
      open: sql<boolean>`${attendanceSessions.closedAt} is null`,
      status: attendanceRecords.status,
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
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.sessionId, attendanceSessions.id),
        eq(attendanceRecords.studentId, studentId),
      ),
    )
    .where(
      sql`(${attendanceSessions.openedAt} at time zone 'Asia/Ulaanbaatar')::date = (now() at time zone 'Asia/Ulaanbaatar')::date`,
    )
    .orderBy(asc(attendanceSessions.openedAt));

  return rows.map((row) => ({
    sessionId: row.sessionId,
    courseTitle: row.courseTitle,
    period: row.period,
    open: Boolean(row.open),
    status: row.status ? STATUS_LABEL[row.status] : "Хүлээгдэж байна",
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
      hasHistory: sql<boolean>`exists (select 1 from attendance_sessions s where s.course_id = ${courses.id})`,
      studentIds: sql<string[]>`coalesce(
        (select array_agg(e.student_id::text) from enrollments e where e.course_id = ${courses.id}),
        '{}')`,
    })
    .from(courses)
    .leftJoin(teacher, eq(teacher.id, courses.teacherId))
    .orderBy(asc(courses.title));
  return rows.map((row) => ({ ...row, slots: sortSlots(row.slots) }));
}
