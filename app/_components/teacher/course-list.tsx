"use client";

import { useNow } from "../../_hooks/use-now";
import { minutesOfDay, parseClock } from "../../_lib/date";
import type { Course } from "../../_lib/types";
import { cx } from "../ui";

type CourseState = { label: string; tone: string };

/** Хичээлийн төлвийг ирцийн бүртгэл болон хуваарийн цагаар тодорхойлно. */
function getCourseState(
  course: Course,
  now: number,
  isLive: boolean,
  isClosed: boolean,
): CourseState {
  if (isLive) return { label: "Ирц бүртгэж байна", tone: "text-emerald-700" };
  if (isClosed) return { label: "Ирц хаагдсан", tone: "text-slate-500" };
  if (!now) return { label: "", tone: "text-slate-400" };

  const [start, end] = course.time.split("—").map(parseClock);
  const current = minutesOfDay(now);
  if (current < start) return { label: "Удахгүй", tone: "text-amber-700" };
  if (current <= end)
    return { label: "Хичээл явагдаж байна", tone: "text-emerald-700" };
  return { label: "Хичээл дууссан", tone: "text-slate-400" };
}

export function CourseList({
  courses,
  selectedIndex,
  liveIndex,
  closedIndex,
  presentCount,
  onSelect,
}: {
  courses: Course[];
  selectedIndex: number;
  /** Ирц явагдаж буй хичээл. */
  liveIndex: number | null;
  /** Ирц нь хаагдсан, жагсаалт нь харагдаж буй хичээл. */
  closedIndex: number | null;
  presentCount: number;
  onSelect: (index: number) => void;
}) {
  const now = useNow();

  return (
    <div className="mb-8 space-y-2">
      {courses.map((course, index) => {
        const isSelected = selectedIndex === index;
        const isLive = liveIndex === index;
        const isClosed = !isLive && closedIndex === index;
        const state = getCourseState(course, now, isLive, isClosed);

        return (
          <button
            key={course.code}
            className={cx(
              "grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-white p-3 text-left transition sm:grid-cols-[36px_minmax(0,1fr)_120px_70px_170px_16px] sm:gap-4 sm:px-4",
              isSelected
                ? "border-emerald-300 shadow-sm ring-1 ring-emerald-200"
                : "border-slate-200 hover:border-emerald-200",
            )}
            aria-pressed={isSelected}
            onClick={() => onSelect(index)}
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
            <span className="hidden text-sm tabular-nums text-slate-600 sm:block">
              {(isLive || isClosed) && (
                <>
                  {presentCount}
                  <span className="text-slate-400"> / {course.enrolled}</span>
                </>
              )}
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
