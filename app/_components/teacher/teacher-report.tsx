"use client";

import { useMemo, useState } from "react";
import { useNow } from "../../_hooks/use-now";
import {
  buildCourseReport,
  type CourseAttendanceReport,
} from "../../_lib/attendance";
import { downloadCsv, reportsToCsv } from "../../_lib/csv";
import { formatMonthKey, formatShortDate, toMonthKey } from "../../_lib/date";
import type { AttendanceRecord, Course } from "../../_lib/types";
import { cx, StatusPill } from "../ui";

export function TeacherReport({
  records,
  courses,
  onBack,
}: {
  records: AttendanceRecord[];
  courses: Course[];
  onBack: () => void;
}) {
  const now = useNow();
  const [pickedMonth, setPickedMonth] = useState("");
  const [courseCode, setCourseCode] = useState(courses[0]?.code ?? "");

  const currentMonth = now ? toMonthKey(now) : "";
  const monthOptions = useMemo(
    () =>
      [
        ...new Set(
          [
            ...records.map((record) => record.date.slice(0, 7)),
            currentMonth,
          ].filter(Boolean),
        ),
      ]
        .sort()
        .reverse(),
    [records, currentMonth],
  );
  const month = pickedMonth || currentMonth || monthOptions[0] || "";

  const course = courses.find((item) => item.code === courseCode) ?? courses[0];
  const report = useMemo(
    () =>
      course
        ? buildCourseReport(
            course,
            records.filter((record) => record.date.startsWith(month)),
          )
        : null,
    [course, month, records],
  );

  const tabClass = (active: boolean) =>
    cx(
      "shrink-0 rounded-lg border px-4 py-2.5 text-[15px] font-medium transition",
      active
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-surface text-slate-600 hover:border-emerald-200",
    );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            className="mb-2 text-sm text-slate-500 hover:text-emerald-700"
            onClick={onBack}
          >
            ← Хяналтын самбар
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Ирцийн тайлан
          </h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Таны заадаг {courses.length} хичээлийн оюутнуудын ирцийн нэгтгэл
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-700"
            aria-label="Сар сонгох"
            value={month}
            onChange={(event) => setPickedMonth(event.target.value)}
          >
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {formatMonthKey(option)}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300 disabled:opacity-50"
            disabled={!month || !report}
            onClick={() =>
              report &&
              downloadCsv(
                reportsToCsv([report], month),
                `irtsiin-tailan-${report.course.code.split(" ")[0]}-${month}.csv`,
              )
            }
          >
            ↧ CSV татах
          </button>
        </div>
      </div>

      <div
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Хичээл сонгох"
      >
        {courses.map((item) => (
          <button
            key={item.code}
            className={tabClass(item.code === course?.code)}
            role="tab"
            aria-selected={item.code === course?.code}
            onClick={() => setCourseCode(item.code)}
          >
            {item.title}
          </button>
        ))}
      </div>

      {report && (
        <CourseDetail key={report.course.code} report={report} month={month} />
      )}
    </div>
  );
}

function CourseDetail({
  report,
  month,
}: {
  report: CourseAttendanceReport;
  month: string;
}) {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const rows = report.rows.filter(
    (row) =>
      !query ||
      `${row.student.name} ${row.student.id}`.toLowerCase().includes(query),
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {report.course.title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {report.course.code} · {formatMonthKey(month)}
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-[15px]">
          <span className="text-slate-400" aria-hidden="true">
            ⌕
          </span>
          <input
            className="w-56 py-2.5 text-[15px] outline-none placeholder:text-slate-400"
            aria-label="Оюутан хайх"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Нэр эсвэл код"
          />
        </label>
      </div>

      {report.dates.length === 0 ? (
        <p className="p-10 text-center text-[15px] text-slate-500">
          Энэ сард энэ хичээлийн ирцийн бүртгэл алга.
        </p>
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[15px]">
            <thead>
              <tr className="text-slate-500">
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-[3] min-w-60 border-b border-slate-200 bg-surface px-5 py-3 text-left font-medium"
                >
                  Оюутан
                </th>
                {report.dates.map((date) => {
                  const { day, weekday } = formatShortDate(date);
                  return (
                    <th
                      key={date}
                      scope="col"
                      className="sticky top-0 z-[2] border-b border-slate-200 bg-surface px-2 py-3 text-center font-medium"
                    >
                      <span className="block text-[15px] text-slate-700">
                        {day}
                      </span>
                      <span className="block text-[13px] font-normal text-slate-400">
                        {weekday}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.student.id} className="hover:bg-slate-50">
                  <th
                    scope="row"
                    className="sticky left-0 z-[1] border-b border-slate-100 bg-surface px-5 py-3 text-left font-normal"
                  >
                    <strong className="block truncate text-[15px] font-medium text-slate-800">
                      {row.student.name}
                    </strong>
                    <small className="text-[13px] text-slate-400">
                      {row.student.id}
                    </small>
                  </th>
                  {report.dates.map((date) => {
                    const status = row.statusByDate[date];
                    return (
                      <td
                        key={date}
                        className="border-b border-slate-100 px-2 py-3 text-center"
                      >
                        {status ? (
                          <StatusPill status={status} />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-[15px] text-slate-500">
              Оюутан олдсонгүй.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
