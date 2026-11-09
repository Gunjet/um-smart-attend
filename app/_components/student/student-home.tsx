"use client";

import type { Attendance } from "../../_hooks/use-attendance";
import {
  COURSES,
  CURRENT_TEACHER,
  type StudentProfile,
} from "../../_lib/demo-data";
import { STATUS } from "../../_lib/constants";
import type { Notify } from "../../_lib/types";
import { cx, Logo } from "../ui";
import { AttendanceOverview } from "./attendance-overview";
import { CheckInFlow } from "./check-in-flow";

export function StudentHome({
  attendance,
  student,
  notify,
}: {
  attendance: Attendance;
  student: StudentProfile;
  notify: Notify;
}) {
  const { session, lastCourseIndex, roster, checkIn } = attendance;
  const course = COURSES[session?.courseIndex ?? lastCourseIndex ?? 0];
  const myRecord = session
    ? roster.find((entry) => entry.id === student.code)
    : undefined;
  const registered =
    myRecord?.status === STATUS.present || myRecord?.status === STATUS.late
      ? myRecord
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
      <div className="mb-6 flex items-center justify-between md:hidden">
        <a
          className="inline-flex items-center gap-2 font-bold"
          href="#home"
          aria-label="ШУТИС"
        >
          <Logo className="h-8 w-auto max-w-48 object-contain" />
        </a>
        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-500">
          {course.code}
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Сайн байна уу,{" "}
        <span className="text-emerald-700">{student.firstName}!</span>
      </h1>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <span
          className={cx(
            "rounded-full px-3 py-1 text-sm font-medium",
            session
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800",
          )}
        >
          ● {session ? "Ирц авч байна" : "Ирц эхлээгүй"}
        </span>
        <h2 className="mt-3 text-lg font-semibold">{course.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {course.code} · {course.room}
        </p>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
          <span>◷ {course.time}</span>
          <span>Багш: {CURRENT_TEACHER.name}</span>
        </div>
      </section>

      <div className="mt-7">
        {registered ? (
          <section className="rounded-xl border border-emerald-200 bg-white p-6 text-center">
            <span
              className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700"
              aria-hidden="true"
            >
              ✓
            </span>
            <h2 className="mt-3 text-xl font-semibold">Ирц бүртгэгдлээ!</h2>
            <p className="mt-1 text-[15px] text-slate-500">
              {course.title} хичээлд {registered.time} цагт «{registered.status}
              » гэж бүртгэгдсэн.
            </p>
          </section>
        ) : (
          <CheckInFlow
            key={session?.id ?? "no-session"}
            course={course}
            session={session}
            onCheckIn={() => {
              const result = checkIn(student.code);
              if (result) notify("Ирц амжилттай бүртгэгдлээ.");
              return result;
            }}
          />
        )}
      </div>

      <AttendanceOverview />
    </div>
  );
}
