"use client";

import { useState } from "react";
import type { Attendance } from "../../_hooks/use-attendance";
import { useNow } from "../../_hooks/use-now";
import { countStatuses } from "../../_lib/attendance";
import { formatMongolianDate } from "../../_lib/date";
import { ACADEMIC_YEAR, COURSES, CURRENT_TEACHER } from "../../_lib/demo-data";
import type { Notify } from "../../_lib/types";
import { cx } from "../ui";
import { CourseList } from "./course-list";
import { LiveRoster } from "./live-roster";
import { SessionPanel } from "./session-panel";

export function TeacherDashboard({
  attendance,
  notify,
}: {
  attendance: Attendance;
  notify: Notify;
}) {
  const now = useNow();
  const {
    session,
    lastCourseIndex,
    roster,
    startSession,
    closeSession,
    markStudent,
  } = attendance;
  const [selectedIndex, setSelectedIndex] = useState(
    session?.courseIndex ?? lastCourseIndex ?? 0,
  );
  const course = COURSES[selectedIndex];
  const showsRoster = lastCourseIndex === selectedIndex;
  const counts = countStatuses(roster);

  const selectCourse = (index: number) => {
    if (session && session.courseIndex !== index) {
      notify("Өөр хичээл сонгохын өмнө одоогийн ирцийн бүртгэлийг хаана уу.");
      return;
    }
    setSelectedIndex(index);
  };

  return (
    <div
      className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8"
      id="home"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-bold tracking-widest text-slate-500">
            {ACADEMIC_YEAR}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Сайн байна уу,{" "}
            <span className="text-emerald-700">
              {CURRENT_TEACHER.firstName}!
            </span>
          </h1>
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Өнөөдрийн хичээлүүд
          </h2>
          <p className="mt-1 text-[15px] text-slate-500">
            {now ? formatMongolianDate(now, true) : "Өнөөдрийн хуваарь"}
          </p>
        </div>
      </div>

      <CourseList
        courses={COURSES}
        selectedIndex={selectedIndex}
        liveIndex={session?.courseIndex ?? null}
        closedIndex={lastCourseIndex}
        presentCount={counts.present + counts.late}
        onSelect={selectCourse}
      />

      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Ирцийн бүртгэл</h2>
        {session && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-semibold text-emerald-800">
            ● LIVE ОДОО
          </span>
        )}
      </div>

      <div
        className={cx(
          "grid gap-4",
          showsRoster && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <SessionPanel
          course={course}
          session={session?.courseIndex === selectedIndex ? session : null}
          pendingCount={counts.pending}
          onStart={() => {
            startSession(selectedIndex);
            notify("Ирцийн бүртгэл эхэллээ.");
          }}
          onClose={() => {
            closeSession();
            notify("Хичээлийн ирцийн бүртгэл хаагдлаа.");
          }}
        />
        {showsRoster && (
          <LiveRoster
            roster={roster}
            enrolled={course.enrolled}
            isLive={session?.courseIndex === selectedIndex}
            onMark={markStudent}
          />
        )}
      </div>
    </div>
  );
}
