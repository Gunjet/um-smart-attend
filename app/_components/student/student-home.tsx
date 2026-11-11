"use client";

import { STATUS, STATUS_PILL_CLASS } from "../../_lib/constants";
import type { StudentCourse, TodayAttendance } from "../../_lib/dto";
import type { Notify } from "../../_lib/types";
import { CheckIcon } from "../icons";
import { cx } from "../ui";
import { AttendanceOverview } from "./attendance-overview";
import { CheckInFlow } from "./check-in-flow";
import { PasskeySetup } from "./passkey-setup";

const periodLabel = (period: number | null) =>
  period ? `${period}-р пар` : "Ирц";

export function StudentHome({
  firstName,
  courses,
  locationRequired,
  passkeyRegistered,
  todayAttendance,
  notify,
}: {
  firstName: string;
  courses: StudentCourse[];
  locationRequired: boolean;
  /** Face ID / хурууны хээгээ бүртгүүлсэн эсэх. */
  passkeyRegistered: boolean;
  /** Өнөөдрийн хичээллэлт (пар) бүрийн ирц. */
  todayAttendance: TodayAttendance[];
  notify: Notify;
}) {
  const awaiting =
    courses.find((course) => course.openSessionId && !course.checkedIn) ?? null;
  // Нээлттэй ирцэд бүртгэгдсэн бол дээд талд тод баталгаа харуулна.
  const justCheckedIn = todayAttendance.filter(
    (item) => item.open && item.status === STATUS.present,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
      <h1 className="mb-5 mt-2 text-2xl font-semibold tracking-tight">
        Сайн байна уу, <span className="text-emerald-700">{firstName}!</span>
      </h1>

      {justCheckedIn.map((item) => (
        <section
          key={item.sessionId}
          className="mb-4 flex items-center gap-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4"
          role="status"
        >
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-700 text-white"
            aria-hidden="true"
          >
            <CheckIcon className="size-7" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-emerald-900">
              Ирц бүртгэгдлээ
            </h2>
            <p className="truncate text-[15px] text-emerald-900">
              {item.courseTitle} · {periodLabel(item.period)}
            </p>
          </div>
        </section>
      ))}

      {passkeyRegistered ? (
        <CheckInFlow
          openCourse={awaiting}
          locationRequired={locationRequired}
          notify={notify}
        />
      ) : (
        <PasskeySetup notify={notify} />
      )}

      {todayAttendance.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Өнөөдрийн ирц</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {todayAttendance.map((item) => (
              <li
                key={item.sessionId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-slate-800">
                    {item.courseTitle}
                  </p>
                  <p className="text-sm text-slate-500">
                    {periodLabel(item.period)}
                    {item.open ? " · ирц нээлттэй" : ""}
                  </p>
                </div>
                <span
                  className={cx(
                    "shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium",
                    STATUS_PILL_CLASS[item.status],
                  )}
                >
                  {item.status === STATUS.pending
                    ? "Бүртгүүлээгүй"
                    : item.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AttendanceOverview courses={courses} />
    </div>
  );
}
