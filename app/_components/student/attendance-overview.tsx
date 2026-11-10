import { formatClassGroups } from "../../_lib/programs";
import { sum } from "../../_lib/attendance";
import type { StudentCourse } from "../../_lib/dto";
import { cx } from "../ui";

export function AttendanceOverview({ courses }: { courses: StudentCourse[] }) {
  const summary = [
    {
      label: "Ирсэн",
      icon: "✓",
      iconClass: "bg-emerald-50 text-emerald-700",
      value: sum(courses, (course) => course.attended),
    },
    {
      label: "Тасалсан",
      icon: "×",
      iconClass: "bg-rose-50 text-rose-600",
      value: sum(courses, (course) => course.absent),
    },
  ];

  return (
    <>
      <div className="mb-3 mt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Миний ирцийн тойм
        </h2>
        <p className="mt-1 text-[15px] text-slate-500">Нийт хичээлүүдээр</p>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-5"
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
            <small className="text-sm text-slate-400">хичээл</small>
          </article>
        ))}
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Миний хичээлүүд
        </h2>
        {courses.length === 0 ? (
          <p className="mt-3 text-[15px] text-slate-500">
            Та одоогоор ямар ч хичээлд бүртгэлгүй байна.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {courses.map((course) => (
              <li className="flex items-center gap-3 py-4" key={course.id}>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lg font-bold text-emerald-800">
                  {course.title.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[15px] font-semibold text-slate-900">
                    {course.title}
                  </strong>
                  <small className="mt-0.5 block truncate text-sm text-slate-500">
                    {[
                      course.teacherName,
                      course.time,
                      formatClassGroups(course.classGroups),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                  <small className="block truncate text-[13px] text-slate-400">
                    {course.schedule}
                  </small>
                  {course.openSessionId && (
                    <span
                      className={cx(
                        "mt-1 inline-block rounded-md px-2 py-0.5 text-[13px] font-medium",
                        course.checkedIn
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800",
                      )}
                    >
                      {course.checkedIn ? "✓ Бүртгүүлсэн" : "● Ирц нээлттэй"}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right text-sm">
                  <span className="block text-emerald-700">
                    {course.attended} ирсэн
                  </span>
                  <span
                    className={cx(
                      "mt-0.5 block",
                      course.absent ? "text-rose-600" : "text-slate-400",
                    )}
                  >
                    {course.absent} тасалсан
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
