"use client";

import { useState, useTransition } from "react";
import { formatShortDate } from "../../_lib/date";
import {
  LEAVE_STATUS_CLASS,
  LEAVE_STATUS_LABEL,
  type LeaveRequestItem,
} from "../../_lib/leave";
import type { Notify } from "../../_lib/types";
import { reviewLeaveRequest } from "../../_server/leave/actions";
import { Dialog } from "../dialog";
import { CalendarIcon, CheckIcon, CloseIcon } from "../icons";
import { cx } from "../ui";

/** Багшийн хичээлүүдийн чөлөөний хүсэлтүүд: зөвшөөрөх / татгалзах. */
export function LeaveReview({
  requests,
  notify,
}: {
  requests: LeaveRequestItem[];
  notify: Notify;
}) {
  const [photo, setPhoto] = useState<LeaveRequestItem | null>(null);
  const pending = requests.filter((request) => request.status === "pending");
  const reviewed = requests.filter((request) => request.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Чөлөөний хүсэлтүүд
      </h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Зөвшөөрвөл тухайн өдрийн ирцэд «Чөлөөтэй» гэж тэмдэглэгдэнэ.
      </p>

      <h2 className="mb-3 mt-6 text-lg font-semibold">
        Хүлээгдэж буй · {pending.length}
      </h2>
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-surface p-6 text-center text-[15px] text-slate-500">
          Шийдвэрлэх хүсэлт алга.
        </p>
      ) : (
        <ul className="space-y-2">
          {pending.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              notify={notify}
              onPhoto={() => setPhoto(request)}
            />
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Шийдвэрлэсэн</h2>
          <ul className="space-y-2">
            {reviewed.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                notify={notify}
                onPhoto={() => setPhoto(request)}
              />
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={photo !== null}
        onClose={() => setPhoto(null)}
        title="Нотлох зураг"
        description={photo?.studentName}
      >
        {photo?.attachment && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.attachment}
            alt="Нотлох зураг"
            className="w-full rounded-lg"
          />
        )}
      </Dialog>
    </div>
  );
}

function RequestRow({
  request,
  notify,
  onPhoto,
}: {
  request: LeaveRequestItem;
  notify: Notify;
  onPhoto: () => void;
}) {
  const [busy, startTransition] = useTransition();
  const { day, weekday } = formatShortDate(request.date);

  const decide = (decision: "approved" | "rejected") =>
    startTransition(async () => {
      const result = await reviewLeaveRequest(request.id, decision);
      notify(result.ok ? (result.message ?? "") : result.error);
    });

  return (
    <li className="rounded-xl border border-slate-200 bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <CalendarIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">
            {request.studentName}{" "}
            <span className="text-sm font-normal text-slate-400">
              {request.studentCode}
              {request.classGroup ? ` · ${request.classGroup}` : ""}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {request.courseTitle} · {day}, {weekday}
          </p>
          <p className="mt-1.5 text-[15px] text-slate-700">{request.reason}</p>
          {request.attachment && (
            <button
              type="button"
              onClick={onPhoto}
              className="mt-2 block overflow-hidden rounded-lg border border-slate-200"
              aria-label="Нотлох зургийг томруулах"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={request.attachment}
                alt=""
                className="h-20 w-auto object-cover"
              />
            </button>
          )}
        </div>
        {request.status === "pending" ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("approved")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:flex-none"
            >
              <CheckIcon />
              Зөвшөөрөх
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("rejected")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 sm:flex-none"
            >
              <CloseIcon className="size-4" />
              Татгалзах
            </button>
          </div>
        ) : (
          <span
            className={cx(
              "rounded-md px-2 py-0.5 text-[13px] font-medium",
              LEAVE_STATUS_CLASS[request.status],
            )}
          >
            {LEAVE_STATUS_LABEL[request.status]}
          </span>
        )}
      </div>
    </li>
  );
}
