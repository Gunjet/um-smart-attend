"use client";

import { useCallback, useState } from "react";
import { upsertRecord } from "../_lib/attendance";
import { STATUS } from "../_lib/constants";
import { formatClock, toDateKey } from "../_lib/date";
import { buildDemoHistory, COURSES, getCourseRoster } from "../_lib/demo-data";
import { createSessionId } from "../_lib/qr";
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Student,
} from "../_lib/types";

/** Session эхэлснээс хойш энэ хугацааны дараа бүртгүүлбэл "Хоцорсон". */
const LATE_AFTER_MS = 15 * 60_000;

/**
 * Ирцийн бүх төлөв: идэвхтэй session, түүний жагсаалт, хаагдсан бүртгэлүүд.
 * Багш, оюутны дэлгэц нэг төлөвийг хуваалцана (demo — санах ойд).
 */
export function useAttendance() {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  /** Хамгийн сүүлд ирц авсан хичээл (хаагдсан ч гэсэн). */
  const [lastCourseIndex, setLastCourseIndex] = useState<number | null>(null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  /** Demo түүхийг нэг удаа ачаална. Event handler-оос дуудна. */
  const loadHistory = useCallback(() => {
    setRecords((current) =>
      current.length ? current : buildDemoHistory(Date.now()),
    );
  }, []);

  const startSession = useCallback((courseIndex: number) => {
    const course = COURSES[courseIndex];
    setRoster(getCourseRoster(course));
    setLastCourseIndex(courseIndex);
    setSession({
      id: createSessionId(course.code),
      courseIndex,
      startedAt: Date.now(),
    });
  }, []);

  const closeSession = useCallback(() => {
    if (!session) return;
    const course = COURSES[session.courseIndex];
    const finalRoster = roster.map((student) =>
      student.status === STATUS.pending
        ? { ...student, status: STATUS.absent }
        : student,
    );
    setRoster(finalRoster);
    setRecords((current) =>
      upsertRecord(current, {
        date: toDateKey(Date.now()),
        courseCode: course.code,
        courseTitle: course.title,
        students: finalRoster,
      }),
    );
    setSession(null);
  }, [roster, session]);

  /** Оюутныг идэвхтэй session-д бүртгэнэ. Жагсаалтад байхгүй бол нэмнэ. */
  const checkIn = useCallback(
    (studentCode: string) => {
      if (!session) return null;
      const timestamp = Date.now();
      const status =
        timestamp - session.startedAt > LATE_AFTER_MS
          ? STATUS.late
          : STATUS.present;
      const time = formatClock(timestamp);
      const existing = roster.find((student) => student.id === studentCode);
      // Дахин бүртгүүлэхэд анхны цагийг нь хадгална.
      if (
        existing &&
        (existing.status === STATUS.present || existing.status === STATUS.late)
      ) {
        return { status: existing.status, time: existing.time };
      }

      setRoster((current) =>
        existing
          ? current.map((student) =>
              student.id === studentCode
                ? { ...student, status, time }
                : student,
            )
          : [
              {
                id: studentCode,
                name: `Оюутан ${studentCode}`,
                initials: "ОД",
                status,
                time,
              },
              ...current,
            ],
      );
      return { status, time };
    },
    [roster, session],
  );

  /** Багш идэвхтэй session-д оюутны төлвийг гараар өөрчилнө. */
  const markStudent = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      const time =
        status === STATUS.present || status === STATUS.late
          ? formatClock(Date.now())
          : "—";
      setRoster((current) =>
        current.map((student) =>
          student.id === studentId
            ? {
                ...student,
                status,
                // Аль хэдийн бүртгэгдсэн цагийг дарж бичихгүй.
                time:
                  student.time !== "—" && time !== "—" ? student.time : time,
              }
            : student,
        ),
      );
    },
    [],
  );

  return {
    session,
    lastCourseIndex,
    roster,
    records,
    loadHistory,
    startSession,
    closeSession,
    checkIn,
    markStudent,
  };
}

export type Attendance = ReturnType<typeof useAttendance>;
