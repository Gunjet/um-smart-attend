/** Чөлөөний хүсэлтийн төрлүүд (сервер, клиент хоёуланд). */

export type LeaveStatus = "pending" | "approved" | "rejected";

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Хүлээгдэж байна",
  approved: "Зөвшөөрсөн",
  rejected: "Татгалзсан",
};

export const LEAVE_STATUS_CLASS: Record<LeaveStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  approved: "bg-amber-50 text-amber-800",
  rejected: "bg-rose-50 text-rose-800",
};

export type LeaveRequestItem = {
  id: string;
  courseTitle: string;
  courseCode: string;
  /** "YYYY-MM-DD" */
  date: string;
  reason: string;
  /** Зургийн data URL (байхгүй бол null). */
  attachment: string | null;
  status: LeaveStatus;
  /** Багшийн жагсаалтад: оюутны нэр, код. */
  studentName?: string;
  studentCode?: string;
  classGroup?: string | null;
};

export type LeaveFormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<"courseId" | "date" | "reason" | "attachment", string>
  >;
} | null;
