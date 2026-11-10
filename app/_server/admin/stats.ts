import "server-only";
import { sql } from "drizzle-orm";
import type { StatRow } from "../../_lib/stats";
import { getAdmin } from "../auth/dal";
import { getDb } from "../db";

/**
 * Сүүлийн 90 хоногийн ирцийг өдөр, анги, хичээл, төлөвөөр нэгтгэнэ.
 * Клиент хугацааны шүүлтүүрээр (7/30/90 хоног) дахин нэгтгэнэ.
 */
export async function getAttendanceStats(): Promise<StatRow[]> {
  if (!(await getAdmin())) return [];
  const rows = await getDb().execute<{
    day: string;
    class_group: string;
    course_id: string;
    course_code: string;
    course_title: string;
    status: "present" | "absent" | "excused";
    n: number;
  }>(sql`
    select
      (s.opened_at at time zone 'Asia/Ulaanbaatar')::date::text as day,
      coalesce(u.class_group, '—') as class_group,
      c.id::text as course_id,
      c.code as course_code,
      c.title as course_title,
      r.status,
      count(*)::int as n
    from attendance_records r
    join attendance_sessions s on s.id = r.session_id
    join courses c on c.id = s.course_id
    join users u on u.id = r.student_id
    where s.closed_at is not null
      and s.opened_at > now() - interval '90 days'
    group by 1, 2, 3, 4, 5, 6
    order by 1`);
  return rows.map((row) => ({
    day: row.day,
    classGroup: row.class_group,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    status: row.status,
    count: row.n,
  }));
}
