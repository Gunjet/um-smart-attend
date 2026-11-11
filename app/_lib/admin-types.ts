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
  /** Оюутан Face ID / хурууны хээгээ бүртгүүлсэн эсэх. */
  passkeyRegistered: boolean;
  /** Ирцийн түүхтэй (устгавал түүх нь хамт устна). */
  hasHistory: boolean;
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
  campusErrors?: Partial<
    Record<"name" | "latitude" | "longitude" | "radiusM", string>
  >;
  /** Автоматаар үүсгэсэн нууц үг — зөвхөн нэг удаа харуулна. */
  generatedPassword?: string;
  /** Хуваарийн Excel-ийг шалгасан үр дүн (хадгалахаас өмнө). */
  importPreview?: TimetableImportPreview;
  importErrors?: Partial<Record<"file" | "startDate" | "endDate", string>>;
} | null;

export type TimetableImportPreview = {
  courses: {
    code: string;
    title: string;
    classGroups: string[];
    /** "Да 1-2, Пү 3" гэх мэт. */
    schedule: string;
    teacherName: string;
    /** Бүртгэлтэй багштай тулгагдсан эсэх. */
    teacherMatched: boolean;
    /** Ийм кодтой хичээл өмнө нь байсан (шинэчлэгдэнэ). */
    exists: boolean;
  }[];
  warnings: string[];
};
