"use client";

import { useNow } from "../../_hooks/use-now";
import { minutesOfDay, parseClock } from "../../_lib/date";
import type { TeacherCourse } from "../../_lib/dto";
import { cx } from "../ui";

type CourseState = { label: string; tone: string };

/** Хичээлийн төлвийг ирцийн бүртгэл болон хуваарийн цагаар тодорхойлно. */
function getCourseState(
  course: TeacherCourse,
  now: number,
  isLive: boolean,
  isClosed: boolean,
): CourseState {
  if (isLive) return { label: "Ирц бүртгэж байна", tone: "text-emerald-700" };
  if (isClosed) return { label: "Ирц хаагдсан", tone: "text-slate-500" };
  if (!now) return { label: "", tone: "text-slate-400" };

  const current = minutesOfDay(now);
  const slots = course.todaySlots.map((slot) => ({
    start: parseClock(slot.start),
    end: parseClock(slot.end),
  }));
  if (slots.some((slot) => current >= slot.start && current <= slot.end))
    return { label: "Хичээл явагдаж байна", tone: "text-emerald-700" };
  if (slots.some((slot) => current < slot.start))
    return { label: "Удахгүй", tone: "text-amber-700" };
  return { label: "Хичээл дууссан", tone: "text-slate-400" };
}

export function CourseList({
  courses,
  selectedId,
  closedCourseId,
  onSelect,
}: {
  courses: TeacherCourse[];
  selectedId: string | null;
  /** Саяхан ирц нь хаагдсан хичээл. */
  closedCourseId: string | null;
  onSelect: (id: string) => void;
}) {
  const now = useNow();

  return (
    <div className="mb-8 space-y-2">
      {courses.map((course) => {
        const isSelected = selectedId === course.id;
        const isLive = Boolean(course.openSessionId);
        const isClosed = !isLive && closedCourseId === course.id;
        const state = getCourseState(course, now, isLive, isClosed);

        return (
          <button
            key={course.id}
            className={cx(
              "grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-surface p-3 text-left transition sm:grid-cols-[36px_minmax(0,1fr)_120px_90px_170px_16px] sm:gap-4 sm:px-4",
              isSelected
                ? "border-emerald-300 shadow-sm ring-1 ring-emerald-200"
                : "border-slate-200 hover:border-emerald-200",
            )}
            aria-pressed={isSelected}
            onClick={() => onSelect(course.id)}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-800">
              {course.title.charAt(0)}
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-[15px] font-semibold text-slate-800">
                {course.title}
              </strong>
              <small className="mt-1 block text-sm text-slate-500">
                {course.code}
                <span className="sm:hidden"> · {course.time}</span>
              </small>
            </span>
            <span className="hidden text-sm text-slate-500 sm:block">
              ◷ {course.time}
            </span>
            <span className="hidden text-sm tabular-nums text-slate-500 sm:block">
              {course.enrolled} оюутан
            </span>
            <span className={cx("text-right text-sm sm:text-left", state.tone)}>
              {state.label && (
                <>
                  <span aria-hidden="true">● </span>
                  <span className="hidden sm:inline">{state.label}</span>
                </>
              )}
            </span>
            <span
              className="hidden text-right text-slate-400 sm:block"
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        );
      })}
    </div>
  );
}
