"use client";

import { ChevronRightIcon, DownloadIcon, SearchIcon } from "../icons";
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
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-surface px-3 text-sm text-slate-700 sm:flex-none"
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
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-surface px-4 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-slate-50 disabled:opacity-50"
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {report.course.title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {report.course.code} · {formatMonthKey(month)}
          </p>
        </div>
        <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-[15px] sm:w-auto">
          <span className="text-slate-400" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            className="w-full min-w-0 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-slate-400 sm:w-56"
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
          {/* Гар утсанд: оюутан бүр нэг мөр (нэгтгэл), дарвал дэлгэрэнгүй. */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((row) => (
              <MobileStudentRow
                key={row.student.id}
                report={report}
                row={row}
                statusOf={(column) =>
                  overrides.get(`${column.key}|${row.student.userId}`) ??
                  row.statusByDate[column.key]
                }
                saving={saving}
                onToggle={(column, status) =>
                  toggle(column, row.student, status)
                }
              />
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

const STATUS_TEXT: Record<AttendanceStatus, string> = {
  Ирсэн: "text-emerald-800",
  Тасалсан: "text-rose-700",
  Чөлөөтэй: "text-amber-800",
  "Хүлээгдэж байна": "text-slate-500",
};

const STATUS_DOT: Record<AttendanceStatus, string> = {
  Ирсэн: "bg-emerald-600",
  Тасалсан: "bg-rose-600",
  Чөлөөтэй: "bg-amber-500",
  "Хүлээгдэж байна": "bg-slate-300",
};

type Column = CourseAttendanceReport["columns"][number];
type Row = CourseAttendanceReport["rows"][number];

/** Гар утсанд: оюутны сарын нэгтгэл, дарвал пар бүрийн ирц (засаж болно). */
function MobileStudentRow({
  report,
  row,
  statusOf,
  saving,
  onToggle,
}: {
  report: CourseAttendanceReport;
  row: Row;
  statusOf: (column: Column) => AttendanceStatus | undefined;
  saving: string | null;
  onToggle: (column: Column, status: AttendanceStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const statuses = report.columns.map(statusOf);
  const count = (status: AttendanceStatus) =>
    statuses.filter((item) => item === status).length;
  const present = count(STATUS.present);
  const absent = count(STATUS.absent);
  const excused = count(STATUS.excused);
  const recorded = present + absent + excused;
  const rate = recorded ? Math.round((present / recorded) * 100) : null;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-slate-800">
            {row.student.name}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-[13px] text-slate-500">
            <span>{row.student.id}</span>
            <span className="text-emerald-800">Ирсэн {present}</span>
            {absent > 0 && (
              <span className="text-rose-700">Тасалсан {absent}</span>
            )}
            {excused > 0 && (
              <span className="text-amber-800">Чөлөөтэй {excused}</span>
            )}
          </span>
        </span>
        {rate !== null && (
          <span
            className={cx(
              "shrink-0 text-[15px] font-semibold tabular-nums",
              rate >= 80
                ? "text-emerald-800"
                : rate >= 60
                  ? "text-amber-800"
                  : "text-rose-700",
            )}
          >
            {rate}%
          </span>
        )}
        <ChevronRightIcon
          className={cx(
            "size-4 shrink-0 text-slate-400 transition",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="mb-2 text-[12px] text-slate-400">
            Ирсэн / тасалсан дээр дарж засна.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {report.columns.map((column, index) => {
              const status = statuses[index];
              const cellKey = `${column.key}|${row.student.userId}`;
              const { day } = formatShortDate(column.date);
              const editable = Boolean(status) && status !== STATUS.pending;
              return (
                <button
                  key={column.key}
                  type="button"
                  disabled={!editable || Boolean(saving)}
                  onClick={() => status && editable && onToggle(column, status)}
                  aria-label={`${row.student.name}, ${column.date}${column.period ? ` ${column.period}-р пар` : ""}: ${status ?? "бүртгэлгүй"}`}
                  className={cx(
                    "min-w-0 rounded-lg border border-slate-100 px-2.5 py-1.5 text-left disabled:cursor-default",
                    editable && "active:bg-slate-50",
                    saving === cellKey && "animate-pulse",
                  )}
                >
                  <span className="block text-[12px] tabular-nums text-slate-400">
                    {day}
                    {column.period ? ` · ${column.period}-р пар` : ""}
                  </span>
                  {status ? (
                    <span
                      className={cx(
                        "flex items-center gap-1.5 text-[13px] font-medium",
                        STATUS_TEXT[status],
                      )}
                    >
                      <span
                        className={cx(
                          "size-1.5 shrink-0 rounded-full",
                          STATUS_DOT[status],
                        )}
                      />
                      {status}
                    </span>
                  ) : (
                    <span className="text-[13px] text-slate-300">—</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </li>
  );
}
