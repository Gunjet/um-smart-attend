import "server-only";
import { eq, isNull, sql } from "drizzle-orm";
import { periodWindow } from "../../_lib/schedule";
import { getDb, schema } from "../db";

const { attendanceSessions } = schema;

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Ирцийг хааж, бүртгүүлээгүй оюутнуудыг "Тасалсан" (чөлөөтэй бол "Чөлөөтэй") болгоно. */
export async function finalizeSession(
  tx: Tx,
  sessionId: string,
  courseId: string,
) {
  // Зөвшөөрөгдсөн чөлөөтэй оюутан "Чөлөөтэй", бусад нь "Тасалсан".
  await tx.execute(sql`
    insert into attendance_records (session_id, student_id, status)
    select ${sessionId}, e.student_id,
      case when exists (
        select 1 from leave_requests l
        join attendance_sessions s on s.id = ${sessionId}
        where l.student_id = e.student_id and l.course_id = e.course_id
          and l.status = 'approved'
          and l.date = (s.opened_at at time zone 'Asia/Ulaanbaatar')::date
      ) then 'excused'::attendance_status else 'absent'::attendance_status end
    from enrollments e
    where e.course_id = ${courseId}
    on conflict do nothing`);
  await tx
    .update(attendanceSessions)
    .set({ closedAt: sql`now()` })
    .where(eq(attendanceSessions.id, sessionId));
}

/**
 * Багш хаахаа мартсан ирцийг автоматаар хаана:
 * - өмнөх өдрүүдэд нээгдсэн бүх ирц;
 * - парын цаг (+10 минут) өнгөрсөн өнөөдрийн ирц.
 * Хуудас ачаалах, ирц нээх/бүртгүүлэх үед дуудагдана (давтан дуудахад аюулгүй).
 * Хаасан ирцийн тоог буцаана.
 */
export async function closeStaleSessions() {
  const db = getDb();
  // Цагийг өгөгдлийн сангаас (Улаанбаатарын цагаар) авна.
  const open = await db
    .select({
      id: attendanceSessions.id,
      courseId: attendanceSessions.courseId,
      period: attendanceSessions.period,
      openedToday: sql<boolean>`(${attendanceSessions.openedAt} at time zone 'Asia/Ulaanbaatar')::date = (now() at time zone 'Asia/Ulaanbaatar')::date`,
      nowMinutes: sql<number>`(extract(hour from now() at time zone 'Asia/Ulaanbaatar') * 60 + extract(minute from now() at time zone 'Asia/Ulaanbaatar'))::int`,
    })
    .from(attendanceSessions)
    .where(isNull(attendanceSessions.closedAt));

  const stale = open.filter((session) => {
    if (!session.openedToday) return true;
    const window = session.period ? periodWindow(session.period) : null;
    return Boolean(window && session.nowMinutes > window.to);
  });

  for (const session of stale) {
    await db.transaction((tx) =>
      finalizeSession(tx, session.id, session.courseId),
    );
  }
  return stale.length;
}
