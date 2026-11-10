import type { UserRole } from "./types";

/** Admin panel-д харуулах хэрэглэгч (нууц үгийн hash зэрэг нууц мэдээлэлгүй). */
export type AdminUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string | null;
  studentCode: string | null;
  /** Оюутны анги, жишээ нь "МТ-1". */
  classGroup: string | null;
  deviceBound: boolean;
  /** ISO огноо */
  createdAt: string;
};

export type AdminActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<
      "fullName" | "identifier" | "classGroup" | "password" | "csv",
      string
    >
  >;
  courseErrors?: Partial<
    Record<
      | "title"
      | "code"
      | "classGroups"
      | "startDate"
      | "endDate"
      | "slots"
      | "teacherId",
      string
    >
  >;
  /** Автоматаар үүсгэсэн нууц үг — зөвхөн нэг удаа харуулна. */
  generatedPassword?: string;
} | null;
