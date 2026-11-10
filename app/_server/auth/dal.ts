import "server-only";
import { cache } from "react";
import type { SessionUser } from "../../_lib/types";
import type { UserRow } from "../db/schema";
import { readSessionUser } from "./session";

/** "Б. Энхжин" → { firstName: "Энхжин", initials: "ЭБ" } */
function nameParts(fullName: string) {
  const [surname = "", ...rest] = fullName.split(/\.\s*|\s+/).filter(Boolean);
  const firstName = rest.join(" ") || surname;
  const initials = `${firstName.charAt(0)}${rest.length ? surname.charAt(0) : ""}`;
  return { firstName, initials: initials.toUpperCase() };
}

/** Клиент рүү дамжуулахад аюулгүй, нарийсгасан хэрэглэгчийн мэдээлэл (DTO). */
export function toSessionUser(user: UserRow): SessionUser {
  return {
    id: user.id,
    role: user.role,
    name: user.fullName,
    ...nameParts(user.fullName),
    studentCode: user.studentCode,
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
