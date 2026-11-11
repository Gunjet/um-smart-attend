import "server-only";
import { asc, sql } from "drizzle-orm";
import type { AdminUser } from "../../_lib/admin-types";
import { getAdmin } from "../auth/dal";
import { getDb, schema } from "../db";

const ROLE_ORDER = { admin: 0, teacher: 1, student: 2 } as const;

export async function listUsersForAdmin(): Promise<AdminUser[]> {
  if (!(await getAdmin())) return [];
  const rows = await getDb()
    .select({
      id: schema.users.id,
      role: schema.users.role,
      name: schema.users.fullName,
      email: schema.users.email,
      studentCode: schema.users.studentCode,
      classGroup: schema.users.classGroup,
      isCouncil: schema.users.isCouncil,
      passkeyRegistered: sql<boolean>`exists (select 1 from passkeys p where p.user_id = "users"."id")`,
      hasHistory: sql<boolean>`(
        exists (select 1 from attendance_records r where r.student_id = "users"."id" or r.marked_by = "users"."id")
        or exists (select 1 from attendance_sessions s where s.opened_by = "users"."id")
        or exists (select 1 from courses c where c.teacher_id = "users"."id"))`,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.fullName));

  return rows
    .map(({ passkeyRegistered, hasHistory, createdAt, ...row }) => ({
      ...row,
      passkeyRegistered: Boolean(passkeyRegistered),
      hasHistory: Boolean(hasHistory),
      createdAt: createdAt.toISOString(),
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}
