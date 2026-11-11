"use client";

import { StatusDot } from "../icons";
import { useCallback, useState, useTransition } from "react";
import { useNow } from "../../_hooks/use-now";
import { usePolling } from "../../_hooks/use-polling";
import { ACADEMIC_YEAR, STATUS } from "../../_lib/constants";
import { formatMongolianDate } from "../../_lib/date";
import type { ActionResult, TeacherCourse } from "../../_lib/dto";
import type { Notify } from "../../_lib/types";
import {
  closeSession,
  getLiveRoster,
  markAttendance,
  openSession,
} from "../../_server/attendance/actions";
import { cx } from "../ui";
import { CourseList } from "./course-list";
import { LiveRoster } from "./live-roster";
import { SessionPanel } from "./session-panel";

/** Оюутнууд өөр утаснаас бүртгүүлэхэд жагсаалт энэ давтамжтай шинэчлэгдэнэ. */
const ROSTER_POLL_MS = 4000;

export function TeacherDashboard({
  courses: allCourses,
  teacherFirstName,
  notify,
}: {
  courses: TeacherCourse[];
  teacherFirstName: string;
  notify: Notify;
}) {
  const now = useNow();
  // Өнөөдөр орох хичээлүүд (нээлттэй ирцтэй хичээл үргэлж харагдана).
  const courses = allCourses.filter(
    (course) => course.scheduledToday || course.openSessionId,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      (courses.find((course) => course.openSessionId) ?? courses[0])?.id ??
      null,
  );
  // Хаасны дараа эцсийн жагсаалтыг харуулахын тулд session-ийг санана.
  const [closed, setClosed] = useState<{
    courseId: string;
    sessionId: string;
  } | null>(null);
  const [busy, startTransition] = useTransition();

  const course = courses.find((item) => item.id === selectedId) ?? null;
  const liveCourse = courses.find((item) => item.openSessionId) ?? null;
  const sessionId =
    course?.openSessionId ??
    (closed && closed.courseId === course?.id ? closed.sessionId : null) ??
    course?.closedTodaySessionId ??
    null;
  const isLive = Boolean(course?.openSessionId);

  const selectCourse = (id: string) => {
    if (liveCourse && liveCourse.id !== id) {
      notify("Өөр хичээл сонгохын өмнө одоогийн ирцийн бүртгэлийг хаана уу.");
      return;
    }
    setSelectedId(id);
  };

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) notify(result.error);
      else if (result.message) notify(result.message);
    });

  return (
    <div
      className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8"
      id="home"
    >
      <div className="mb-6">
        <p className="mb-2 text-sm font-bold tracking-widest text-slate-500">
          {ACADEMIC_YEAR}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Сайн байна уу,{" "}
          <span className="text-emerald-700">{teacherFirstName}!</span>
        </h1>
      </div>

      <div className="mb-3">
        <h2 className="text-xl font-semibold text-slate-900">
          Миний хичээлүүд
        </h2>
        <p className="mt-1 text-[15px] text-slate-500">
          {now ? formatMongolianDate(now, true) : "Өнөөдрийн хуваарь"}
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-surface p-10 text-center">
          <p className="text-[15px] text-slate-600">
            {allCourses.length
              ? "Өнөөдөр хичээл алга."
              : "Танд оноогдсон хичээл алга."}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {allCourses.length
              ? "Хичээлийн хуваарьт орсон өдрүүдэд энд харагдана."
              : "Админ таныг хичээлд багшаар оноосны дараа энд харагдана."}
          </p>
        </div>
      ) : (
        <>
          <CourseList
            courses={courses}
            selectedId={selectedId}
            closedCourseId={closed?.courseId ?? null}
            onSelect={selectCourse}
          />

          {course && (
            <>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Ирцийн бүртгэл
                </h2>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-semibold text-emerald-800">
                    <StatusDot pulse />
                    ШУУД
                  </span>
                )}
              </div>
              <AttendanceSection
                key={sessionId ?? course.id}
                course={course}
                sessionId={sessionId}
                isLive={isLive}
                busy={busy}
                onOpen={() => {
                  setClosed(null);
                  run(() => openSession(course.id));
                }}
                onClose={() => {
                  const id = course.openSessionId;
                  if (!id) return;
                  setClosed({ courseId: course.id, sessionId: id });
                  run(() => closeSession(id));
                }}
                notify={notify}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function AttendanceSection({
  course,
  sessionId,
  isLive,
  busy,
  onOpen,
  onClose,
  notify,
}: {
  course: TeacherCourse;
  sessionId: string | null;
  isLive: boolean;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
  notify: Notify;
}) {
  const fetchRoster = useCallback(
    async () => (sessionId ? getLiveRoster(sessionId) : null),
    [sessionId],
  );
  const {
    data: roster,
    setData: setRoster,
    reload,
  } = usePolling(fetchRoster, ROSTER_POLL_MS, isLive);

  const pendingCount =
    roster?.filter((entry) => entry.status === STATUS.pending).length ??
    course.enrolled;

  const mark = async (studentId: string, status: "present" | "absent") => {
    if (!sessionId) return;
    // Шууд харуулаад, серверийн хариугаар баталгаажуулна.
    setRoster(
      (current) =>
        current?.map((entry) =>
          entry.studentId === studentId
            ? {
                ...entry,
                status: status === "present" ? STATUS.present : STATUS.absent,
              }
            : entry,
        ) ?? current,
    );
    const result = await markAttendance(sessionId, studentId, status);
    if (!result.ok) notify(result.error);
    reload();
  };

  return (
    <div
      className={cx(
        "grid gap-4",
        sessionId && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
      )}
    >
      <SessionPanel
        course={course}
        pendingCount={pendingCount}
        busy={busy}
        onOpen={onOpen}
        onClose={onClose}
      />
      {sessionId && (
        <LiveRoster roster={roster} isLive={isLive} onMark={mark} />
      )}
    </div>
  );
}
