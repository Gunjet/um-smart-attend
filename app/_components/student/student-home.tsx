"use client";

import type { StudentCourse } from "../../_lib/dto";
import type { Notify } from "../../_lib/types";
import { AttendanceOverview } from "./attendance-overview";
import { CheckInFlow } from "./check-in-flow";
import { PasskeySetup } from "./passkey-setup";

export function StudentHome({
  firstName,
  courses,
  locationRequired,
  passkeyRegistered,
  notify,
}: {
  firstName: string;
  courses: StudentCourse[];
  locationRequired: boolean;
  /** Face ID / хурууны хээгээ бүртгүүлсэн эсэх. */
  passkeyRegistered: boolean;
  notify: Notify;
}) {
  const openCourses = courses.filter((course) => course.openSessionId);
  const awaiting = openCourses.find((course) => !course.checkedIn) ?? null;
  const checkedIn = openCourses.filter((course) => course.checkedIn);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
      <h1 className="mb-5 mt-2 text-2xl font-semibold tracking-tight">
        Сайн байна уу, <span className="text-emerald-700">{firstName}!</span>
      </h1>

      {checkedIn.map((course) => (
        <section
          key={course.id}
          className="mb-4 flex items-center gap-4 rounded-xl border border-emerald-200 bg-surface p-4"
        >
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-700"
            aria-hidden="true"
          >
            ✓
          </span>
          <div>
            <h2 className="text-[15px] font-semibold">Ирц бүртгэгдлээ!</h2>
            <p className="text-sm text-slate-500">
              {course.title} хичээлийн ирцэд бүртгэгдсэн.
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

      <AttendanceOverview courses={courses} />
    </div>
  );
}
