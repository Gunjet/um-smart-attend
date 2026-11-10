"use client";

import { createContext, use, type ReactNode } from "react";
import { useAttendance, type Attendance } from "../_hooks/use-attendance";

const AttendanceContext = createContext<Attendance | null>(null);

/**
 * Ирцийн төлөвийг нэвтрэлтийн хэсгээс дээр байлгаж, гарч/нэвтрэхэд хадгална.
 * (Ирц өгөгдлийн санд шилжих хүртэлх түр шийдэл.)
 */
export function AttendanceProvider({ children }: { children: ReactNode }) {
  const attendance = useAttendance();
  return <AttendanceContext value={attendance}>{children}</AttendanceContext>;
}

export function useAttendanceContext() {
  const attendance = use(AttendanceContext);
  if (!attendance) {
    throw new Error(
      "useAttendanceContext must be used within AttendanceProvider",
    );
  }
  return attendance;
}
