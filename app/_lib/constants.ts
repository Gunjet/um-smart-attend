import type { AttendanceStatus } from "./types";

export const STATUS = {
  present: "Ирсэн",
  late: "Хоцорсон",
  absent: "Тасалсан",
  pending: "Хүлээгдэж байна",
} as const satisfies Record<string, AttendanceStatus>;

/** QR код шинэчлэгдэх хугацаа. */
export const QR_ROTATION_MS = 30_000;
export const QR_PREFIX = "UM-SMART-ATTEND";

/** Ирцийн хувь үүнээс доош бол "анхаарах" гэж тооцно. */
export const ATTENDANCE_RISK_THRESHOLD = 80;

export const DEVICE_STORAGE_PREFIX = "um-smart-attend-device";

export const STATUS_TEXT_CLASS: Record<AttendanceStatus, string> = {
  Ирсэн: "text-emerald-700",
  Хоцорсон: "text-amber-700",
  Тасалсан: "text-rose-700",
  "Хүлээгдэж байна": "text-slate-500",
};

export const STATUS_PILL_CLASS: Record<AttendanceStatus, string> = {
  Ирсэн: "bg-emerald-50 text-emerald-800",
  Хоцорсон: "bg-amber-50 text-amber-800",
  Тасалсан: "bg-rose-50 text-rose-800",
  "Хүлээгдэж байна": "bg-slate-100 text-slate-600",
};
