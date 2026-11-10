import type { AttendanceStatus } from "./types";

export const STATUS = {
  present: "Ирсэн",
  absent: "Тасалсан",
  pending: "Хүлээгдэж байна",
} as const satisfies Record<string, AttendanceStatus>;

/** QR код шинэчлэгдэх хугацаа. */
export const QR_ROTATION_MS = 30_000;
export const QR_PREFIX = "UM-SMART-ATTEND";

export const STATUS_TEXT_CLASS: Record<AttendanceStatus, string> = {
  Ирсэн: "text-emerald-700",
  Тасалсан: "text-rose-700",
  "Хүлээгдэж байна": "text-slate-500",
};

export const STATUS_PILL_CLASS: Record<AttendanceStatus, string> = {
  Ирсэн: "bg-emerald-50 text-emerald-800",
  Тасалсан: "bg-rose-50 text-rose-800",
  "Хүлээгдэж байна": "bg-slate-100 text-slate-600",
};

export const ACADEMIC_YEAR = "2025–2026 ОНЫ ХИЧЭЭЛИЙН ЖИЛ";
