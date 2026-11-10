"use server";

import { sql } from "drizzle-orm";
import * as z from "zod";
import type { CourseBreakdown } from "../../_lib/stats";
import { getAdmin } from "../auth/dal";
import { getDb } from "../db";

const Input = z.object({
  courseId: z.uuid(),
  from: z.iso.date(),
  to: z.iso.date(),
  /** "" бол бүх анги; "МТ" бол хөтөлбөр; "МТ-1" бол анги. */
  group: z.string().max(10),
});

/** Тойм самбараас хичээл дээр дарахад: оюутан бүр ба хичээллэлт бүрийн ирц. */
export async function getCourseBreakdown(
  courseId: string,
  from: string,
  to: string,
  group: string,
): Promise<CourseBreakdown | null> {
  if (!(await getAdmin())) return null;
  const parsed = Input.safeParse({ courseId, from, to, group });
  if (!parsed.success) return null;
  const { data } = parsed;

  // Ангийн шүүлтүүр: хоосон, хөтөлбөр ("МТ") эсвэл анги ("МТ-1").
  const groupFilter = !data.group
    ? sql`true`
    : data.group.includes("-")
      ? sql`coalesce(u.class_group, '—') = ${data.group}`
      : sql`coalesce(split_part(u.class_group, '-', 1), '—') = ${data.group}`;

  const base = sql`
    from attendance_records r
    join attendance_sessions s on s.id = r.session_id
    join users u on u.id = r.student_id
    where s.course_id = ${data.courseId}
      and s.closed_at is not null
      and (s.opened_at at time zone 'Asia/Ulaanbaatar')::date between ${data.from} and ${data.to}
      and ${groupFilter}`;

  const db = getDb();
  const [students, sessions] = await Promise.all([
    db.execute<{
      student_id: string;
      name: string;
      code: string | null;
      class_group: string | null;
      present: number;
      absent: number;
      excused: number;
    }>(sql`
      select u.id::text as student_id, u.full_name as name, u.student_code as code,
        u.class_group,
        count(*) filter (where r.status = 'present')::int as present,
        count(*) filter (where r.status = 'absent')::int as absent,
        count(*) filter (where r.status = 'excused')::int as excused
      ${base}
      group by u.id
      order by absent desc, u.full_name`),
    db.execute<{
      date: string;
      period: number | null;
      present: number;
      absent: number;
      excused: number;
    }>(sql`
      select (s.opened_at at time zone 'Asia/Ulaanbaatar')::date::text as date,
        s.period,
        count(*) filter (where r.status = 'present')::int as present,
        count(*) filter (where r.status = 'absent')::int as absent,
        count(*) filter (where r.status = 'excused')::int as excused
      ${base}
      group by 1, 2
      order by 1 desc, 2`),
  ]);

  return {
    students: students.map((row) => ({
      studentId: row.student_id,
      name: row.name,
      code: row.code ?? "",
      classGroup: row.class_group ?? "—",
      present: row.present,
      absent: row.absent,
      excused: row.excused,
    })),
    sessions: sessions.map((row) => ({ ...row })),
  };
}
