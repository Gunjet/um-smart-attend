"use client";

import { useState } from "react";
import { ATTENDANCE_RISK_THRESHOLD } from "../../_lib/constants";
import { COURSES, STUDENT_COURSE_HISTORY } from "../../_lib/demo-data";
import { sum } from "../../_lib/attendance";
import { cx, ProgressBar } from "../ui";

const history = STUDENT_COURSE_HISTORY.map((item) => ({
  ...item,
  attended: item.meetings - item.late - item.absent,
}));

const SUMMARY = [
  {
    label: "Ирсэн",
    icon: "✓",
    iconClass: "bg-emerald-50 text-emerald-700",
    value: sum(history, (item) => item.attended),
    unit: "хичээл",
  },
  {
    label: "Хоцорсон",
    icon: "◷",
    iconClass: "bg-amber-50 text-amber-700",
    value: sum(history, (item) => item.late),
    unit: "удаа",
  },
  {
    label: "Тасалсан",
    icon: "×",
    iconClass: "bg-rose-50 text-rose-600",
    value: sum(history, (item) => item.absent),
    unit: "хичээл",
  },
];

export function AttendanceOverview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="mb-3 mt-7">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Миний ирцийн тойм
        </h2>
        <p className="mt-1 text-[15px] text-slate-500">
          Энэ улирлын нийт үзүүлэлт
        </p>
      </div>
      <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-3">
        {SUMMARY.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5"
          >
            <span
              className={cx(
                "grid size-9 place-items-center rounded-xl text-lg",
                item.iconClass,
              )}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <p className="mt-3 text-sm text-slate-500">{item.label}</p>
            <strong className="mt-1 block text-2xl font-bold text-slate-900 sm:text-3xl">
              {item.value}
            </strong>
            <small className="text-sm text-slate-400">{item.unit}</small>
          </article>
        ))}
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Хичээл тус бүрийн ирц
            </h2>
            <p className="mt-1 text-[15px] text-slate-500">
              Таны энэ улирлын үзүүлэлт
            </p>
          </div>
          <button
            className="shrink-0 text-[15px] font-semibold text-emerald-700 hover:text-emerald-900"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Хураах ↑" : "Дэлгэрэнгүй ›"}
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {COURSES.map((course, index) => {
            const item = history[index];
            if (!item) return null;
            const percentage = Math.round(
              (item.attended / item.meetings) * 100,
            );
            const low = percentage < ATTENDANCE_RISK_THRESHOLD;
            return (
              <div className="py-5 first:pt-1 last:pb-1" key={course.code}>
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-800">
                    {course.title.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[15px] font-semibold text-slate-900">
                      {course.title}
                    </strong>
                    <small className="mt-1 block text-sm text-slate-500">
                      {item.teacher}
                    </small>
                  </div>
                  <div className="shrink-0 text-right">
                    <strong
                      className={cx(
                        "text-xl font-bold",
                        low ? "text-amber-600" : "text-emerald-700",
                      )}
                    >
                      {percentage}%
                    </strong>
                    <small className="mt-1 block text-sm text-slate-400">
                      {item.attended}/{item.meetings} хичээл
                    </small>
                  </div>
                </div>
                <ProgressBar
                  value={percentage}
                  className="mt-3 h-1.5 sm:ml-15"
                  barClassName={low ? "bg-amber-500" : "bg-emerald-600"}
                />
                {expanded && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm sm:pl-15">
                    <span className="text-emerald-700">
                      {item.attended} ирсэн
                    </span>
                    <span className="text-amber-700">{item.late} хоцорсон</span>
                    <span className="text-rose-600">
                      {item.absent} тасалсан
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
