import { sum } from "../../_lib/attendance";
import { COURSES, STUDENT_COURSE_HISTORY } from "../../_lib/demo-data";
import { cx } from "../ui";

const history = STUDENT_COURSE_HISTORY.map((item) => ({
  ...item,
  attended: item.meetings - item.absent,
}));

const SUMMARY = [
  {
    label: "Ирсэн",
    icon: "✓",
    iconClass: "bg-emerald-50 text-emerald-700",
    value: sum(history, (item) => item.attended),
  },
  {
    label: "Тасалсан",
    icon: "×",
    iconClass: "bg-rose-50 text-rose-600",
    value: sum(history, (item) => item.absent),
  },
];

export function AttendanceOverview() {
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
      <div className="mb-8 grid grid-cols-2 gap-3">
        {SUMMARY.map((item) => (
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
          Хичээл тус бүрийн ирц
        </h2>
        <p className="mt-1 text-[15px] text-slate-500">
          Таны энэ улирлын үзүүлэлт
        </p>
        <ul className="mt-4 divide-y divide-slate-100">
          {COURSES.map((course, index) => {
            const item = history[index];
            if (!item) return null;
            return (
              <li className="flex items-center gap-3 py-4" key={course.code}>
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
                <div className="shrink-0 text-right text-sm">
                  <span className="block text-emerald-700">
                    {item.attended} ирсэн
                  </span>
                  <span
                    className={cx(
                      "mt-0.5 block",
                      item.absent ? "text-rose-600" : "text-slate-400",
                    )}
                  >
                    {item.absent} тасалсан
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
