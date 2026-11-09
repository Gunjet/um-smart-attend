import { STATUS } from "./constants";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Student,
} from "./types";

export type StatusCounts = {
  present: number;
  absent: number;
  pending: number;
};

export function countStatuses(students: Student[]): StatusCounts {
  const counts: StatusCounts = { present: 0, absent: 0, pending: 0 };
  for (const { status } of students) {
    if (status === STATUS.present) counts.present += 1;
    else if (status === STATUS.absent) counts.absent += 1;
    else counts.pending += 1;
  }
  return counts;
}

export type StudentAttendanceRow = {
  student: Student;
  statusByDate: Record<string, AttendanceStatus>;
};

export type CourseAttendanceReport = {
  course: Course;
  dates: string[];
  rows: StudentAttendanceRow[];
};

/** Хичээлийн оюутан бүрийн өдөр тус бүрийн ирцийн төлөв. */
export function buildCourseReport(
  course: Course,
  records: AttendanceRecord[],
): CourseAttendanceReport {
  const courseRecords = records
    .filter((record) => record.courseCode === course.code)
    .sort((a, b) => a.date.localeCompare(b.date));

  const rowsById = new Map<string, StudentAttendanceRow>();
  for (const record of courseRecords) {
    for (const student of record.students) {
      const row = rowsById.get(student.id) ?? { student, statusByDate: {} };
      row.statusByDate[record.date] = student.status;
      rowsById.set(student.id, row);
    }
  }

  return {
    course,
    dates: courseRecords.map((record) => record.date),
    rows: [...rowsById.values()].sort((a, b) =>
      a.student.name.localeCompare(b.student.name, "mn"),
    ),
  };
}

export function sum<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}

/** Нэг хичээл, нэг өдөрт нэг л бүртгэл байна: шинэ нь хуучнаа дарна. */
export function upsertRecord(
  records: AttendanceRecord[],
  record: AttendanceRecord,
) {
  return [
    ...records.filter(
      (item) =>
        !(item.date === record.date && item.courseCode === record.courseCode),
    ),
    record,
  ];
}
