import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Student,
} from "./types";

export type StudentAttendanceRow = {
  student: Student;
  /** Баганын түлхүүр (огноо + пар) → төлөв. */
  statusByDate: Record<string, AttendanceStatus>;
};

/** Тайлангийн нэг багана: нэг өдрийн нэг пар. */
export type ReportColumn = {
  key: string;
  date: string;
  period: number | null;
  sessionIds: string[];
};

export type CourseAttendanceReport = {
  course: Course;
  columns: ReportColumn[];
  rows: StudentAttendanceRow[];
};

const columnKey = (record: AttendanceRecord) =>
  record.period ? `${record.date}#${record.period}` : record.date;

/** "2026-11-10" (+ 2-р пар) → "2026-11-10 2-р пар" — CSV-д. */
export const columnLabel = (column: ReportColumn) =>
  column.period ? `${column.date} ${column.period}-р пар` : column.date;

/** Хичээлийн оюутан бүрийн өдөр тус бүрийн ирцийн төлөв. */
export function buildCourseReport(
  course: Course,
  records: AttendanceRecord[],
): CourseAttendanceReport {
  const courseRecords = records
    .filter((record) => record.courseCode === course.code)
    .sort((a, b) => columnKey(a).localeCompare(columnKey(b)));

  const rowsById = new Map<string, StudentAttendanceRow>();
  for (const record of courseRecords) {
    for (const student of record.students) {
      const row = rowsById.get(student.id) ?? { student, statusByDate: {} };
      row.statusByDate[columnKey(record)] = student.status;
      rowsById.set(student.id, row);
    }
  }

  return {
    course,
    columns: courseRecords.map((record) => ({
      key: columnKey(record),
      date: record.date,
      period: record.period,
      sessionIds: record.sessionIds,
    })),
    rows: [...rowsById.values()].sort((a, b) =>
      a.student.name.localeCompare(b.student.name, "mn"),
    ),
  };
}

export function sum<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}
