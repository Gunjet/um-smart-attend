"use client";

import {
  startTransition,
  useActionState,
  useState,
  useTransition,
} from "react";
import { formatShortDate } from "../../_lib/date";
import type { StudentCourse } from "../../_lib/dto";
import { compressImage } from "../../_lib/image";
import {
  LEAVE_STATUS_CLASS,
  LEAVE_STATUS_LABEL,
  type LeaveFormState,
  type LeaveRequestItem,
} from "../../_lib/leave";
import type { Notify } from "../../_lib/types";
import {
  cancelLeaveRequest,
  createLeaveRequest,
} from "../../_server/leave/actions";
import { CalendarIcon, CloseIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-surface px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

/** Оюутны чөлөөний хүсэлт: илгээх форм + өөрийн хүсэлтүүд. */
export function LeavePage({
  courses,
  requests,
  today,
  notify,
}: {
  courses: StudentCourse[];
  requests: LeaveRequestItem[];
  /** Улаанбаатарын цагаар өнөөдөр, "YYYY-MM-DD". */
  today: string;
  notify: Notify;
}) {
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
      <h1 className="mb-5 mt-2 text-2xl font-semibold tracking-tight">
        Чөлөөний хүсэлт
      </h1>

      <section className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Шинэ хүсэлт</h2>
        {courses.length === 0 ? (
          <p className="mt-2 text-[15px] text-slate-500">
            Та одоогоор ямар ч хичээлд бүртгэлгүй байна.
          </p>
        ) : (
          <LeaveForm
            key={formKey}
            courses={courses}
            today={today}
            onDone={(message) => {
              notify(message);
              setFormKey((key) => key + 1);
            }}
          />
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Миний хүсэлтүүд</h2>
        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-surface p-6 text-center text-[15px] text-slate-500">
            Хүсэлт илгээгээгүй байна.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => (
              <MyRequest key={request.id} request={request} notify={notify} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LeaveForm({
  courses,
  today,
  onDone,
}: {
  courses: StudentCourse[];
  today: string;
  onDone: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState<LeaveFormState, FormData>(
    async (previous, formData) => {
      const result = await createLeaveRequest(previous, formData);
      if (result?.ok) onDone(result.message ?? "");
      return result;
    },
    null,
  );
  const [attachment, setAttachment] = useState("");
  const [imageError, setImageError] = useState("");
  const errors = state?.fieldErrors;

  const onFile = async (file: File | undefined) => {
    setImageError("");
    if (!file) return setAttachment("");
    try {
      setAttachment(await compressImage(file));
    } catch {
      setImageError("Зургийг уншиж чадсангүй. Өөр зураг сонгоно уу.");
    }
  };

  return (
    <form
      className="mt-4 space-y-4"
      noValidate
      onSubmit={(event) => {
        // Алдаа гарахад бичсэн утгууд арилахгүй байхаар onSubmit-ээр дуудна.
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Хичээл
          </span>
          <select name="courseId" className={inputClass} defaultValue="">
            <option value="" disabled>
              — Сонгох —
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {errors?.courseId && <FieldError message={errors.courseId} />}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Огноо
          </span>
          <input
            type="date"
            name="date"
            className={inputClass}
            defaultValue={today}
          />
          {errors?.date && <FieldError message={errors.date} />}
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Шалтгаан
        </span>
        <textarea
          name="reason"
          rows={3}
          maxLength={500}
          className={inputClass}
        />
        {errors?.reason && <FieldError message={errors.reason} />}
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Нотлох зураг{" "}
          <span className="font-normal text-slate-400">(заавал биш)</span>
        </span>
        <input type="hidden" name="attachment" value={attachment} />
        {attachment ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment}
              alt="Хавсаргасан зураг"
              className="max-h-40 rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={() => setAttachment("")}
              aria-label="Зургийг хасах"
              className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border border-slate-200 bg-surface text-slate-500 shadow-sm hover:text-rose-700"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        ) : (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-slate-50">
            Зураг сонгох
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
          </label>
        )}
        {(imageError || errors?.attachment) && (
          <FieldError message={imageError || errors?.attachment || ""} />
        )}
      </div>

      {state?.error && (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={cx(primaryButtonClass, "w-full sm:w-auto")}
      >
        {pending ? "Илгээж байна…" : "Хүсэлт илгээх"}
      </button>
    </form>
  );
}

function MyRequest({
  request,
  notify,
}: {
  request: LeaveRequestItem;
  notify: Notify;
}) {
  const [pending, startTransition] = useTransition();
  const { day, weekday } = formatShortDate(request.date);

  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-surface p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <CalendarIcon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-[15px] font-semibold">
            {request.courseTitle}
          </strong>
          <span
            className={cx(
              "rounded-md px-2 py-0.5 text-[13px] font-medium",
              LEAVE_STATUS_CLASS[request.status],
            )}
          >
            {LEAVE_STATUS_LABEL[request.status]}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {day}, {weekday}
        </p>
        <p className="mt-1 text-[15px] text-slate-700">{request.reason}</p>
      </div>
      {request.status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelLeaveRequest(request.id);
              notify(result.ok ? (result.message ?? "") : result.error);
            })
          }
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-rose-700 disabled:opacity-50"
        >
          Цуцлах
        </button>
      )}
    </li>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1.5 text-[13px] text-rose-700">{message}</p>;
}
