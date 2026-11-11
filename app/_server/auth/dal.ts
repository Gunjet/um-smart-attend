import "server-only";
import { cache } from "react";
import type { SessionUser } from "../../_lib/types";
import type { UserRow } from "../db/schema";
import { nameParts } from "../../_lib/names";
import { readSessionUser } from "./session";

/** Клиент рүү дамжуулахад аюулгүй, нарийсгасан хэрэглэгчийн мэдээлэл (DTO). */
export function toSessionUser(user: UserRow): SessionUser {
  return {
    id: user.id,
    role: user.role,
    name: user.fullName,
    ...nameParts(user.fullName),
    studentCode: user.studentCode,
    isCouncil: user.role === "student" && user.isCouncil,
  };
}

/** Нэг render дотор session-ийг нэг л удаа уншина. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const user = await readSessionUser();
  return user ? toSessionUser(user) : null;
});

/** Зөвхөн админ бол хэрэглэгчийг, үгүй бол null буцаана. Admin үйлдэл бүр дуудна. */
export async function getAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
