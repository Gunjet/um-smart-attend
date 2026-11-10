import type { CourseSlot } from "./schedule";
import type { AttendanceStatus } from "./types";

/** Багшийн хичээл (өөрийн хичээлүүд). */
export type TeacherCourse = {
  id: string;
  code: string;
  title: string;
  /** Ангиуд, жишээ нь ["МТ-1", "ЦИ-1"]. */
  classGroups: string[];
  /** Өнөөдрийн цаг(ууд): "09:00 — 10:30" */
  time: string;
  /** Өнөөдөр орох цагууд (эхлэх цагаар эрэмбэлсэн). */
  todaySlots: CourseSlot[];
  enrolled: number;
  /** "2026.09.01 – 2026.12.25 · Да 09:00–10:30, Пү 14:00–15:30" */
  schedule: string;
  /** Өнөөдөр (Улаанбаатарын цагаар) энэ хичээл орох эсэх. */
  scheduledToday: boolean;
  /** Нээлттэй ирцийн session (байхгүй бол null). */
  openSessionId: string | null;
};

/** Оюутны бүртгэлтэй хичээл. */
export type StudentCourse = {
  id: string;
  code: string;
  title: string;
  /** Ангиуд, жишээ нь ["МТ-1", "ЦИ-1"]. */
  classGroups: string[];
  time: string;
  schedule: string;
  teacherName: string | null;
  openSessionId: string | null;
  /** Нээлттэй session-д бүртгүүлсэн эсэх. */
  checkedIn: boolean;
  attended: number;
  absent: number;
};

export type RosterEntry = {
  studentId: string;
  code: string;
  name: string;
  initials: string;
  status: AttendanceStatus;
};

export type SessionQr = {
  /** QR кодонд байх текст. */
  payload: string;
  /** Камергүй үед гараар оруулах 6 оронтой код. */
  code: string;
  /** Энэ код хүчинтэй байх хугацааны төгсгөл (ms). */
  expiresAt: number;
};

export type AdminCourse = {
  id: string;
  code: string;
  title: string;
  /** Ангиуд, жишээ нь ["МТ-1", "ЦИ-1"]. */
  classGroups: string[];
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  /** Гариг бүрийн цаг. */
  slots: CourseSlot[];
  teacherId: string | null;
  teacherName: string | null;
  studentIds: string[];
};

export type ActionResult =
  { ok: true; message?: string } | { ok: false; error: string };
