"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRotatingQr } from "../../_hooks/use-rotating-qr";
import type { AttendanceSession, Course } from "../../_lib/types";
import { cx, primaryButtonClass } from "../ui";

export function SessionPanel({
  course,
  session,
  pendingCount,
  onStart,
  onClose,
}: {
  course: Course;
  /** Сонгосон хичээлийн идэвхтэй session (байхгүй бол null). */
  session: AttendanceSession | null;
  /** Хаахад "Тасалсан" болох оюутны тоо. */
  pendingCount: number;
  onStart: () => void;
  onClose: () => void;
}) {
  const { dataUrl, secondsLeft } = useRotatingQr(session?.id ?? null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const countdown = `00:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5">
      <p className="text-[13px] font-bold tracking-widest text-slate-400">
        {session ? "ИДЭВХТЭЙ ХИЧЭЭЛ" : "СОНГОСОН ХИЧЭЭЛ"}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-slate-800">
        {course.title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {course.code} · {course.room} · {course.time}
      </p>
      <div className="my-4 border-t border-slate-100" />

      {session ? (
        <div className="flex flex-col items-center gap-5 py-2 sm:flex-row sm:items-start sm:justify-center">
          <button
            className="group relative grid size-56 shrink-0 place-items-center rounded-xl border border-slate-200 bg-surface p-2"
            onClick={() => setPresenting(true)}
            aria-label="QR кодыг том дэлгэцээр харуулах"
          >
            {dataUrl ? (
              <Image
                unoptimized
                src={dataUrl}
                alt="Ирц бүртгүүлэх QR код"
                width={240}
                height={240}
                className="size-full"
              />
            ) : (
              <span className="text-sm text-slate-500">QR бэлдэж байна…</span>
            )}
            <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/70 py-1 text-[13px] text-white opacity-0 transition group-hover:opacity-100">
              ⛶ Томруулах
            </span>
          </button>

          <div className="w-full max-w-xs">
            <p className="text-[13px] font-bold tracking-widest text-emerald-700">
              ● QR КОД ИДЭВХТЭЙ
            </p>
            <p className="mt-2 text-[15px] text-slate-700">
              Оюутнууд энэ кодыг утсаараа уншуулж ирцээ бүртгүүлнэ.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">Код шинэчлэгдэхэд</span>
              <strong className="tabular-nums text-emerald-700">
                {countdown}
              </strong>
            </div>
            <button
              className={cx(primaryButtonClass, "mt-3 w-full")}
              onClick={() => setPresenting(true)}
            >
              ⛶ Том дэлгэцээр харуулах
            </button>

            {confirmingClose ? (
              <div
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3"
                role="alertdialog"
                aria-label="Ирцийн бүртгэл хаах уу?"
              >
                <p className="text-sm text-rose-900">
                  Бүртгэлийг хаах уу?
                  {pendingCount > 0 &&
                    ` Бүртгүүлээгүй ${pendingCount} оюутан «Тасалсан» гэж тэмдэглэгдэнэ.`}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex-1 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm font-medium text-slate-700"
                    onClick={() => setConfirmingClose(false)}
                  >
                    Болих
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                    onClick={() => {
                      setConfirmingClose(false);
                      onClose();
                    }}
                  >
                    Тийм, хаах
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="mt-2 w-full rounded-lg border border-rose-200 bg-surface px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                onClick={() => setConfirmingClose(true)}
              >
                Ирцийн бүртгэл хаах
              </button>
            )}
            <p className="mt-3 text-[13px] text-slate-400">
              Session ID: {session.id}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <button className={primaryButtonClass} onClick={onStart}>
            ▶ Ирц нээх
          </button>
        </div>
      )}

      {session && presenting && (
        <PresentationOverlay
          course={course}
          dataUrl={dataUrl}
          countdown={countdown}
          onClose={() => setPresenting(false)}
        />
      )}
    </section>
  );
}

/** Проектор / том дэлгэцэнд зориулсан бүтэн дэлгэцийн QR. Esc дарж хаана. */
function PresentationOverlay({
  course,
  dataUrl,
  countdown,
  onClose,
}: {
  course: Course;
  dataUrl: string;
  countdown: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-surface p-6"
      role="dialog"
      aria-modal="true"
      aria-label="QR код том дэлгэцээр"
    >
      <button
        className="absolute right-4 top-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={onClose}
        autoFocus
      >
        ✕ Хаах (Esc)
      </button>
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-slate-900">
          {course.title}
        </h2>
        <p className="mt-2 text-lg text-slate-500">
          Утсаараа QR кодыг уншуулж ирцээ бүртгүүлнэ үү
        </p>
      </div>
      <div className="grid aspect-square w-[min(70vh,85vw)] place-items-center rounded-2xl border border-slate-200 p-4">
        {dataUrl ? (
          <Image
            unoptimized
            src={dataUrl}
            alt="Ирц бүртгүүлэх QR код"
            width={240}
            height={240}
            className="size-full [image-rendering:pixelated]"
          />
        ) : (
          <span className="text-slate-500">QR бэлдэж байна…</span>
        )}
      </div>
      <p className="text-lg text-slate-500">
        Код шинэчлэгдэхэд{" "}
        <strong className="tabular-nums text-emerald-700">{countdown}</strong>
      </p>
    </div>
  );
}
