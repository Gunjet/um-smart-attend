"use client";

import { useState } from "react";
import { useNow } from "../../_hooks/use-now";
import { minutesOfDay } from "../../_lib/date";
import type { TimetableCourse } from "../../_lib/dto";
import { COURSE_YEARS, PROGRAMS } from "../../_lib/programs";
import {
  isWithinPeriodWindow,
  PERIODS,
  slotPeriods,
  WEEKDAY_OPTIONS,
} from "../../_lib/schedule";
import { ChevronRightIcon } from "../icons";
import { cx } from "../ui";

type Cell = TimetableCourse[];

/** Сонгосон ангийн хуваарийг [гариг][пар] → хичээлүүд болгоно. */
function buildGrid(courses: TimetableCourse[], group: string) {
  const grid = new Map<string, Cell>();
  for (const course of courses) {
    if (!course.classGroups.includes(group)) continue;
    for (const slot of course.slots) {
      for (const period of slotPeriods(slot)) {
        const key = `${slot.day}|${period.number}`;
        const cell = grid.get(key) ?? [];
        if (!cell.some((item) => item.id === course.id)) cell.push(course);
        grid.set(key, cell);
      }
    }
  }
  return grid;
}

/** JS-ийн Date.getDay() → ISO гариг (1 = Даваа … 7 = Ням). */
const isoDay = (date: Date) => ((date.getDay() + 6) % 7) + 1;

/**
 * Хичээлийн хуваарь: хөтөлбөр, курсээр шүүж харна. Анхдагчаар оюутны өөрийн
 * анги сонгогдоно. Өнөөдрийн гариг, одоогийн парыг тодруулна.
 */
export function Timetable({
  courses,
  defaultGroup,
}: {
  courses: TimetableCourse[];
  /** Оюутны анги, жишээ нь "МТ-1". */
  defaultGroup: string | null;
}) {
  const [defaultProgram, defaultYear] = (defaultGroup ?? "МТ-1").split("-");
  const [program, setProgram] = useState(defaultProgram);
  const [year, setYear] = useState(defaultYear ?? "1");
  const group = `${program}-${year}`;

  const now = useNow();
  const today = now ? isoDay(new Date(now)) : 0;
  const nowMinutes = now ? minutesOfDay(now) : -1;
  const [pickedDay, setPickedDay] = useState<number | null>(null);

  const grid = buildGrid(courses, group);
  // Амралтын өдөр хичээлтэй бол л харуулна.
  const days = WEEKDAY_OPTIONS.filter(
    (day) =>
      day.value <= 5 ||
      PERIODS.some((period) => grid.has(`${day.value}|${period.number}`)),
  );
  const mobileDay =
    pickedDay ?? (days.some((day) => day.value === today) ? today : 1);
  const isEmpty = grid.size === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
      <h1 className="mb-4 mt-2 text-2xl font-semibold tracking-tight">
        Хичээлийн хуваарь
      </h1>

      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <FilterSelect
          label="Хөтөлбөр"
          value={program}
          onChange={setProgram}
          className="min-w-0 flex-1 sm:w-80 sm:flex-none"
          options={PROGRAMS.map((item) => ({
            value: item.code,
            label: `${item.code} · ${item.name}`,
          }))}
        />
        <FilterSelect
          label="Курс"
          value={year}
          onChange={setYear}
          className="w-32"
          options={COURSE_YEARS.map((item) => ({
            value: String(item),
            label: `${item}-р курс`,
          }))}
        />
      </div>

      {isEmpty ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-surface p-10 text-center text-[15px] text-slate-500">
          {group} ангийн хуваарь алга.
        </p>
      ) : (
        <>
          {/* Гар утсанд: гариг сонгоод тухайн өдрийн парууд. */}
          <div className="md:hidden">
            <div
              className="mb-3 grid gap-1 rounded-xl bg-slate-100 p-1"
              style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
              role="tablist"
              aria-label="Гариг"
            >
              {days.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  role="tab"
                  aria-selected={mobileDay === day.value}
                  onClick={() => setPickedDay(day.value)}
                  className={cx(
                    "rounded-lg py-2 text-sm font-medium",
                    mobileDay === day.value
                      ? "bg-surface text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500",
                    day.value === today &&
                      mobileDay !== day.value &&
                      "text-emerald-700",
                  )}
                >
                  {day.short}
                </button>
              ))}
            </div>
            <DayList
              grid={grid}
              day={mobileDay}
              isToday={mobileDay === today}
              nowMinutes={nowMinutes}
            />
          </div>

          {/* Том дэлгэцэнд: 7 хоногийн хүснэгт. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-surface md:block">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-24 border-b border-slate-200 p-2 text-left text-[13px] font-medium text-slate-400">
                    Пар
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.value}
                      className={cx(
                        "border-b border-l border-slate-200 p-2 text-left font-semibold",
                        day.value === today
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-700",
                      )}
                    >
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => {
                  // Бүх өдөр хоосон сүүлийн паруудыг харуулахгүй.
                  const later = PERIODS.filter(
                    (item) => item.number >= period.number,
                  ).some((item) =>
                    days.some((day) => grid.has(`${day.value}|${item.number}`)),
                  );
                  if (!later) return null;
                  return (
                    <tr key={period.number}>
                      <th className="border-b border-slate-100 p-2 text-left align-top font-normal">
                        <span className="block font-semibold text-slate-700">
                          {period.number}-р пар
                        </span>
                        <span className="text-[12px] tabular-nums text-slate-400">
                          {period.start}–{period.end}
                        </span>
                      </th>
                      {days.map((day) => {
                        const cell =
                          grid.get(`${day.value}|${period.number}`) ?? [];
                        const current =
                          day.value === today &&
                          isWithinPeriodWindow(period.number, nowMinutes);
                        return (
                          <td
                            key={day.value}
                            className={cx(
                              "border-b border-l border-slate-100 p-1.5 align-top",
                              day.value === today && "bg-emerald-50/40",
                            )}
                          >
                            <div className="grid gap-1">
                              {cell.map((course) => (
                                <CourseBlock
                                  key={course.id}
                                  course={course}
                                  current={current}
                                />
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Зөөлөн харагдах select: доор нь сум, дээр нь жижиг шошго. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block px-1 text-[12px] font-medium text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full cursor-pointer appearance-none truncate rounded-xl border border-slate-200 bg-surface pl-3.5 pr-9 text-[15px] font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronRightIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 rotate-90 text-slate-400" />
      </span>
    </label>
  );
}

function CourseBlock({
  course,
  current,
}: {
  course: TimetableCourse;
  current: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-lg border p-2",
        current
          ? "border-emerald-600 bg-emerald-50"
          : "border-slate-200 bg-surface",
      )}
      title={`${course.title} · ${course.code}`}
    >
      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800">
        {course.title}
      </p>
      {course.teacherName && (
        <p className="mt-0.5 truncate text-[12px] text-slate-500">
          {course.teacherName}
        </p>
      )}
    </div>
  );
}

function DayList({
  grid,
  day,
  isToday,
  nowMinutes,
}: {
  grid: Map<string, Cell>;
  day: number;
  isToday: boolean;
  nowMinutes: number;
}) {
  const periods = PERIODS.filter((period) =>
    grid.has(`${day}|${period.number}`),
  );
  if (periods.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-surface p-8 text-center text-[15px] text-slate-500">
        Энэ өдөр хичээл алга.
      </p>
    );
  }
  return (
    <ul className="grid gap-2">
      {periods.map((period) => {
        const current =
          isToday && isWithinPeriodWindow(period.number, nowMinutes);
        return (
          <li
            key={period.number}
            className={cx(
              "flex gap-3 rounded-2xl border bg-surface p-3",
              current ? "border-emerald-600" : "border-slate-200",
            )}
          >
            <div className="w-16 shrink-0">
              <p className="font-semibold text-slate-800">
                {period.number}-р пар
              </p>
              <p className="text-[12px] tabular-nums text-slate-400">
                {period.start}
                <br />
                {period.end}
              </p>
            </div>
            <div className="grid min-w-0 flex-1 gap-1.5">
              {grid.get(`${day}|${period.number}`)!.map((course) => (
                <div key={course.id} className="min-w-0">
                  <p className="font-medium text-slate-800">{course.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[course.teacherName, course.code]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
              {current && (
                <span className="w-fit rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-800">
                  Одоо
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
