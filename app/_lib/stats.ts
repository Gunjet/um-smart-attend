/** Админы тойм самбарын төрлүүд, нэгтгэл. */

export type StatRow = {
  /** "YYYY-MM-DD" (Улаанбаатарын цагаар). */
  day: string;
  /** Анги, жишээ нь "МТ-1" ("—" бол тодорхойгүй). */
  classGroup: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  status: "present" | "absent" | "excused";
  count: number;
};

export type Totals = {
  present: number;
  absent: number;
  excused: number;
  total: number;
  /** Ирцийн хувь (0–100), бичлэггүй бол null. */
  rate: number | null;
};

export function totalsOf(rows: StatRow[]): Totals {
  const sum = (status: StatRow["status"]) =>
    rows
      .filter((row) => row.status === status)
      .reduce((total, row) => total + row.count, 0);
  const present = sum("present");
  const absent = sum("absent");
  const excused = sum("excused");
  const total = present + absent + excused;
  return {
    present,
    absent,
    excused,
    total,
    rate: total ? Math.round((present / total) * 1000) / 10 : null,
  };
}

/** Мөрүүдийг түлхүүрээр бүлэглээд бүлэг бүрийн нийлбэрийг буцаана. */
export function groupTotals(
  rows: StatRow[],
  key: (row: StatRow) => string,
): { key: string; totals: Totals }[] {
  const groups = new Map<string, StatRow[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return [...groups.entries()].map(([k, items]) => ({
    key: k,
    totals: totalsOf(items),
  }));
}

/** "YYYY-MM-DD" → тухайн долоо хоногийн Даваа гараг ("YYYY-MM-DD"). */
export function weekStart(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** "МТ-1" → "МТ" ("—" хэвээр). */
export const programOf = (classGroup: string) => classGroup.split("-")[0];

/** Хичээлийн задаргаа: оюутан бүр ба хичээллэлт (огноо, пар) бүр. */
export type CourseBreakdown = {
  students: {
    studentId: string;
    name: string;
    code: string;
    classGroup: string;
    present: number;
    absent: number;
    excused: number;
  }[];
  sessions: {
    date: string;
    period: number | null;
    present: number;
    absent: number;
    excused: number;
  }[];
};
