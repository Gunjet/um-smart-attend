"use client";

import { useState } from "react";
import { formatClassGroups } from "../../_lib/programs";
import { importTimetable } from "../../_server/admin/timetable-import";
import { AlertIcon, DownloadIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";
import { Field, FormError, inputClass, useAdminAction } from "./user-forms";

const secondaryClass =
  "rounded-lg border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

/**
 * Сургуулийн хичээлийн хуваарийн Excel-ийг оруулна: эхлээд «Шалгах»-аар юу
 * өөрчлөгдөхийг харуулж, «Хадгалах» дарахад хичээлүүд үүсч/шинэчлэгдэнэ.
 */
export function TimetableImportForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(importTimetable, onDone);
  // Файл солигдвол өмнөх шалгалтын үр дүн хүчингүй.
  const [stale, setStale] = useState(false);
  const preview = stale ? undefined : state?.importPreview;
  const errors = state?.importErrors;
  const ready = Boolean(preview?.courses.length) && !errors?.file;

  const added = preview?.courses.filter((course) => !course.exists).length ?? 0;
  const updated = (preview?.courses.length ?? 0) - added;
  const unmatched =
    preview?.courses.filter(
      (course) => course.teacherName && !course.teacherMatched,
    ) ?? [];

  return (
    <form
      onSubmit={(event) => {
        setStale(false);
        onSubmit(event);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-slate-600">
        Сургуулийн хуваарийн хүснэгтийг (.xlsx) оруулна. Хичээлийг кодоор нь
        тулгаж шинээр үүсгэх эсвэл цаг, анги, багшийг нь шинэчилнэ. Хуваарьт
        байхгүй хичээлүүд өөрчлөгдөхгүй.{" "}
        <a
          href="/huvaari-zagvar.xlsx"
          download
          className="inline-flex items-center gap-1 font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          <DownloadIcon className="size-3.5" />
          Загвар татах
        </a>
      </p>

      <Field label="Excel файл" htmlFor="timetable-file" error={errors?.file}>
        <input
          id="timetable-file"
          name="file"
          type="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={() => setStale(true)}
          className={cx(
            inputClass,
            "file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700",
          )}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Эхлэх огноо"
          htmlFor="timetable-start"
          error={errors?.startDate}
        >
          <input
            id="timetable-start"
            name="startDate"
            type="date"
            className={inputClass}
          />
        </Field>
        <Field
          label="Дуусах огноо"
          htmlFor="timetable-end"
          error={errors?.endDate}
        >
          <input
            id="timetable-end"
            name="endDate"
            type="date"
            className={inputClass}
          />
        </Field>
      </div>

      {preview && preview.courses.length > 0 && (
        <section aria-label="Шалгасан үр дүн" className="space-y-2">
          <p className="text-sm font-medium text-slate-800">
            {preview.courses.length} хичээл олдлоо
            <span className="font-normal text-slate-500">
              {" "}
              · {added} шинэ · {updated} шинэчлэгдэнэ
            </span>
          </p>
          <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {preview.courses.map((course) => (
              <li key={course.code} className="px-3 py-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-slate-800">
                    {course.title}
                  </span>
                  <span
                    className={cx(
                      "shrink-0 rounded px-1.5 py-0.5 text-[12px] font-medium",
                      course.exists
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-50 text-emerald-800",
                    )}
                  >
                    {course.exists ? "Шинэчлэх" : "Шинэ"}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  <span className="font-mono">{course.code}</span> ·{" "}
                  {formatClassGroups(course.classGroups)} · {course.schedule}
                </p>
                <p
                  className={cx(
                    "text-[13px]",
                    course.teacherMatched ? "text-slate-500" : "text-amber-700",
                  )}
                >
                  {course.teacherName
                    ? course.teacherMatched
                      ? course.teacherName
                      : `${course.teacherName} — бүртгэлтэй багш олдсонгүй`
                    : "Багш заагаагүй"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {preview && (preview.warnings.length > 0 || unmatched.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertIcon />
            Анхааруулга
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {unmatched.length > 0 && (
              <li>
                {unmatched.length} хичээлийн багш бүртгэлгүй. Хадгалсны дараа
                «Засах»-аас багшийг нь сонгоно уу.
              </li>
            )}
            {preview.warnings.slice(0, 12).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
            {preview.warnings.length > 12 && (
              <li>… бас {preview.warnings.length - 12}</li>
            )}
          </ul>
        </div>
      )}

      <FormError message={state?.error} />

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button type="button" className={secondaryClass} onClick={onCancel}>
          Болих
        </button>
        <button
          type="submit"
          name="intent"
          value="preview"
          disabled={pending}
          className={
            ready
              ? secondaryClass
              : cx(primaryButtonClass, "disabled:opacity-60")
          }
        >
          {pending ? "Уншиж байна…" : "Шалгах"}
        </button>
        {ready && (
          <button
            type="submit"
            name="intent"
            value="apply"
            disabled={pending}
            className={cx(primaryButtonClass, "disabled:opacity-60")}
          >
            Хадгалах
          </button>
        )}
      </div>
    </form>
  );
}
