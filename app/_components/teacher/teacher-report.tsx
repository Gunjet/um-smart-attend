"use client";

import { DownloadIcon, SearchIcon } from "../icons";
import { useMemo, useState, useTransition } from "react";
import { useNow } from "../../_hooks/use-now";
import {
  buildCourseReport,
  type CourseAttendanceReport,
} from "../../_lib/attendance";
import { downloadCsv, reportsToCsv } from "../../_lib/csv";
import { formatMonthKey, formatShortDate, toMonthKey } from "../../_lib/date";
import { STATUS } from "../../_lib/constants";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Notify,
} from "../../_lib/types";
import { updateReportStatus } from "../../_server/attendance/actions";
import { cx, StatusPill } from "../ui";

export function TeacherReport({
  records,
  courses,
  onBack,
  notify,
}: {
  records: AttendanceRecord[];
  courses: Course[];
  onBack: () => void;
  notify: Notify;
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
            <DownloadIcon />
            CSV татах
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
        <CourseDetail
          key={report.course.code}
          report={report}
          month={month}
          notify={notify}
        />
      )}
    </div>
  );
}

function CourseDetail({
  report,
  month,
  notify,
}: {
  report: CourseAttendanceReport;
  month: string;
  notify: Notify;
}) {
  // Засвар серверээс баталгаажих хүртэл шууд харуулна.
  const [overrides, setOverrides] = useState<Map<string, AttendanceStatus>>(
    () => new Map(),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (
    column: CourseAttendanceReport["columns"][number],
    student: CourseAttendanceReport["rows"][number]["student"],
    current: AttendanceStatus,
  ) => {
    if (!student.userId || saving) return;
    const cellKey = `${column.key}|${student.userId}`;
    const next = current === STATUS.present ? STATUS.absent : STATUS.present;
    setSaving(cellKey);
    setOverrides((map) => new Map(map).set(cellKey, next));
    startTransition(async () => {
      const result = await updateReportStatus(
        column.sessionIds,
        student.userId!,
        next === STATUS.present ? "present" : "absent",
      );
      setSaving(null);
      if (result.ok) {
        notify(`${student.name} — «${next}» болгож засагдлаа.`);
      } else {
        setOverrides((map) => {
          const copy = new Map(map);
          copy.delete(cellKey);
          return copy;
        });
        notify(result.error);
      }
    });
  };

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
            <SearchIcon />
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

      {report.columns.length === 0 ? (
        <p className="p-10 text-center text-[15px] text-slate-500">
          Энэ сард энэ хичээлийн ирцийн бүртгэл алга.
        </p>
      ) : (
        <>
          {/* Гар утсанд: оюутан бүр карт, өдөр/пар бүр жижиг мөр. */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((row) => (
              <li key={row.student.id} className="px-4 py-3">
                <p className="font-medium text-slate-800">{row.student.name}</p>
                <p className="text-[13px] text-slate-400">{row.student.id}</p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {report.columns.map((column) => {
                    const cellKey = `${column.key}|${row.student.userId}`;
                    const status =
                      overrides.get(cellKey) ?? row.statusByDate[column.key];
                    const { day } = formatShortDate(column.date);
                    const editable = status && status !== STATUS.pending;
                    return (
                      <button
                        key={column.key}
                        type="button"
                        disabled={!editable || Boolean(saving)}
                        onClick={() =>
                          editable && toggle(column, row.student, status)
                        }
                        aria-label={`${row.student.name}, ${column.date}${column.period ? ` ${column.period}-р пар` : ""}: ${status ?? "бүртгэлгүй"}`}
                        className={cx(
                          "flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-left text-[13px] disabled:cursor-default",
                          saving === cellKey && "animate-pulse",
                        )}
                      >
                        <span className="whitespace-nowrap tabular-nums text-slate-500">
                          {day}
                          {column.period ? ` · ${column.period}-р` : ""}
                        </span>
                        {status ? (
                          <StatusPill status={status} />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="py-8 text-center text-[15px] text-slate-500">
                Оюутан олдсонгүй.
              </li>
            )}
          </ul>
          <div className="hidden max-h-[70vh] overflow-auto md:block">
            <table className="w-full border-separate border-spacing-0 text-[15px]">
              <thead>
                <tr className="text-slate-500">
                  <th
                    scope="col"
                    className="sticky left-0 top-0 z-[3] min-w-60 border-b border-slate-200 bg-surface px-5 py-3 text-left font-medium"
                  >
                    Оюутан
                  </th>
                  {report.columns.map((column) => {
                    const { day, weekday } = formatShortDate(column.date);
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className="sticky top-0 z-[2] border-b border-slate-200 bg-surface px-2 py-3 text-center font-medium"
                      >
                        <span className="block text-[15px] text-slate-700">
                          {day}
                        </span>
                        <span className="block text-[13px] font-normal text-slate-400">
                          {column.period ? `${column.period}-р пар` : weekday}
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
                    {report.columns.map((column) => {
                      const cellKey = `${column.key}|${row.student.userId}`;
                      const status =
                        overrides.get(cellKey) ?? row.statusByDate[column.key];
                      return (
                        <td
                          key={column.key}
                          className="border-b border-slate-100 px-2 py-3 text-center"
                        >
                          {status && status !== STATUS.pending ? (
                            <button
                              type="button"
                              onClick={() =>
                                toggle(column, row.student, status)
                              }
                              disabled={Boolean(saving)}
                              title="Дарж засах"
                              aria-label={`${row.student.name}, ${column.date}${column.period ? ` ${column.period}-р пар` : ""}: ${status}. Дарж засах`}
                              className={cx(
                                "rounded-md transition hover:ring-2 hover:ring-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait",
                                saving === cellKey && "animate-pulse",
                              )}
                            >
                              <StatusPill status={status} />
                            </button>
                          ) : status ? (
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
        </>
      )}
    </section>
  );
}
