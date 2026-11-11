export type Role = "teacher" | "student";
export type UserRole = Role | "admin";

/** Нэвтэрсэн хэрэглэгчийн клиент рүү дамжуулах мэдээлэл. */
export type SessionUser = {
  id: string;
  role: UserRole;
  name: string;
  firstName: string;
  initials: string;
  studentCode: string | null;
  /** Оюутны зөвлөлийн гишүүн (зарлал оруулах эрхтэй). */
  isCouncil: boolean;
};

export type AttendanceStatus =
  "Ирсэн" | "Тасалсан" | "Чөлөөтэй" | "Хүлээгдэж байна";

export type Student = {
  /** Оюутны код. */
  id: string;
  /** Хэрэглэгчийн id (тайлангаас ирц засахад). */
  userId?: string;
  name: string;
  initials: string;
  /** Бүртгүүлсэн цаг (HH:MM) эсвэл "—". */
  time: string;
  status: AttendanceStatus;
};

export type Course = {
  title: string;
  code: string;
  classGroups: string[];
  /** "09:00 — 10:30" хэлбэртэй. */
  time: string;
  /** Хичээлд бүртгэлтэй оюутны тоо. */
  enrolled: number;
};

/** Нэг хичээллэлтийн хаагдсан ирцийн бүртгэл. */
export type AttendanceRecord = {
  /** YYYY-MM-DD (локал цагаар). */
  date: string;
  /** Хэддэх пар (хуучин бичлэгт null). */
  period: number | null;
  /** Энэ баганад хамаарах ирцийн session-ууд (засахад). */
  sessionIds: string[];
  courseCode: string;
  courseTitle: string;
  students: Student[];
};

export type Notify = (message: string) => void;
