import "server-only";
import { asc } from "drizzle-orm";
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
      deviceIdHash: schema.users.deviceIdHash,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.fullName));

  return rows
    .map(({ deviceIdHash, createdAt, ...row }) => ({
      ...row,
      deviceBound: Boolean(deviceIdHash),
      createdAt: createdAt.toISOString(),
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}
