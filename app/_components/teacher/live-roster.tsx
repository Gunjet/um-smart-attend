"use client";

import { useState } from "react";
import { STATUS, STATUS_TEXT_CLASS } from "../../_lib/constants";
import type { RosterEntry } from "../../_lib/dto";
import type { AttendanceStatus } from "../../_lib/types";
import { cx, ProgressBar } from "../ui";

type Filter = "all" | "pending" | "absent";

const FILTERS: { id: Filter; label: string; activeClass: string }[] = [
  {
    id: "all",
    label: "Бүгд",
    activeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    id: "pending",
    label: "Хүлээгдэж буй",
    activeClass: "border-slate-400 bg-slate-100 text-slate-800",
  },
  {
    id: "absent",
    label: STATUS.absent,
    activeClass: "border-rose-300 bg-rose-50 text-rose-800",
  },
];

const FILTER_STATUS: Record<Exclude<Filter, "all">, AttendanceStatus> = {
  pending: STATUS.pending,
  absent: STATUS.absent,
};

const MARK_OPTIONS = [
  {
    value: "present" as const,
    status: STATUS.present,
    label: "Ирсэн",
    activeClass: "bg-emerald-700 text-white",
  },
  {
    value: "absent" as const,
    status: STATUS.absent,
    label: "Тасалсан",
    activeClass: "bg-rose-600 text-white",
  },
];

export function LiveRoster({
  roster,
  isLive,
  onMark,
}: {
  /** null бол ачаалж байна. */
  roster: RosterEntry[] | null;
  /** Ирц нээлттэй үед багш төлвийг гараар өөрчилж болно. */
  isLive: boolean;
  onMark: (studentId: string, status: "present" | "absent") => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const entries = roster ?? [];
  const present = entries.filter(
    (entry) => entry.status === STATUS.present,
  ).length;
  const absent = entries.filter(
    (entry) => entry.status === STATUS.absent,
  ).length;
  const pending = entries.length - present - absent;
  const filterCount: Record<Filter, number> = {
    all: entries.length,
    pending,
    absent,
  };

  const query = search.trim().toLowerCase();
  const visible = entries.filter((entry) => {
    const matchesSearch =
      !query || `${entry.name} ${entry.code}`.toLowerCase().includes(query);
    const matchesFilter =
      filter === "all" || entry.status === FILTER_STATUS[filter];
    return matchesSearch && matchesFilter;
  });

  return (
    <aside className="flex flex-col rounded-xl border border-slate-200 bg-surface p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Ирцийн явц</h3>
      <p className="mt-1 text-sm text-slate-500">
        {isLive ? "Шууд шинэчлэгдэж байна" : "Ирц хаагдсан"}
      </p>

      <div className="my-4">
        <p className="text-[15px] text-slate-700">
          <strong className="text-2xl font-semibold tabular-nums text-emerald-700">
            {present}
          </strong>{" "}
          / {entries.length} оюутан бүртгэгдсэн
        </p>
        <ProgressBar
          value={entries.length ? (present / entries.length) * 100 : 0}
          className="mt-2 h-2"
        />
        {isLive && pending > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            {pending} оюутан хүлээгдэж байна
          </p>
        )}
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3">
        <span className="text-slate-400" aria-hidden="true">
          ⌕
        </span>
        <input
          className="w-full bg-transparent py-2 text-[15px] outline-none placeholder:text-slate-400"
          aria-label="Оюутан хайх"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Нэр эсвэл код хайх"
        />
      </label>

      <div className="mb-2 flex flex-wrap gap-2">
        {FILTERS.filter((item) => isLive || item.id !== "pending").map(
          (item) => (
            <button
              key={item.id}
              className={cx(
                "rounded-full border px-3 py-1 text-sm",
                filter === item.id
                  ? item.activeClass
                  : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label} {filterCount[item.id]}
            </button>
          ),
        )}
      </div>

      {isLive && (
        <p className="mb-1 text-[13px] text-slate-400">
          Утасгүй ирсэн оюутны ирцийг доорх товчоор гараар тэмдэглэж болно.
        </p>
      )}

      <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-auto">
        {roster === null && (
          <li className="py-6 text-center text-sm text-slate-500">
            Ачаалж байна…
          </li>
        )}
        {visible.map((entry) => (
          <li
            className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 py-2.5"
            key={entry.studentId}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-700">
              {entry.initials}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[15px] font-medium">
                {entry.name}
              </strong>
              <small className="text-[13px] text-slate-400">{entry.code}</small>
            </span>
            {isLive ? (
              <div
                className="flex overflow-hidden rounded-lg border border-slate-200 text-[13px]"
                role="group"
                aria-label={`${entry.name}-ийн ирц`}
              >
                {MARK_OPTIONS.map((option) => {
                  const active = entry.status === option.status;
                  return (
                    <button
                      key={option.value}
                      className={cx(
                        "px-2.5 py-1 transition",
                        active
                          ? option.activeClass
                          : "bg-surface text-slate-600 hover:bg-slate-50",
                      )}
                      aria-pressed={active}
                      onClick={() => onMark(entry.studentId, option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className={cx("text-sm", STATUS_TEXT_CLASS[entry.status])}>
                {entry.status}
              </span>
            )}
          </li>
        ))}
        {roster !== null && visible.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-500">
            Оюутан олдсонгүй.
          </li>
        )}
      </ul>
    </aside>
  );
}
