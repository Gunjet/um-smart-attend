"use client";

import { formatClassGroups } from "../../_lib/programs";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useNow } from "../../_hooks/use-now";
import { useSessionQr } from "../../_hooks/use-session-qr";
import type { TeacherCourse } from "../../_lib/dto";
import { cx, primaryButtonClass } from "../ui";

export function SessionPanel({
  course,
  pendingCount,
  busy,
  onOpen,
  onClose,
}: {
  course: TeacherCourse;
  /** Хаахад "Тасалсан" болох оюутны тоо. */
  pendingCount: number;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5">
      <p className="text-[13px] font-bold tracking-widest text-slate-400">
        {course.openSessionId ? "ИДЭВХТЭЙ ХИЧЭЭЛ" : "СОНГОСОН ХИЧЭЭЛ"}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-slate-800">
        {course.title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {[course.code, formatClassGroups(course.classGroups), course.time]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="my-4 border-t border-slate-100" />

      {course.openSessionId ? (
        <LiveQr
          key={course.openSessionId}
          sessionId={course.openSessionId}
          course={course}
          pendingCount={pendingCount}
          busy={busy}
          onClose={onClose}
        />
      ) : course.enrolled === 0 ? (
        <p className="py-4 text-center text-[15px] text-slate-500">
          Энэ хичээлд бүртгэлтэй оюутан алга. Админд хандаж оюутнуудаа
          бүртгүүлнэ үү.
        </p>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <button
            className={primaryButtonClass}
            onClick={onOpen}
            disabled={busy}
          >
            {busy ? "Нээж байна…" : "▶ Ирц нээх"}
          </button>
        </div>
      )}
    </section>
  );
}

function LiveQr({
  sessionId,
  course,
  pendingCount,
  busy,
  onClose,
}: {
  sessionId: string;
  course: TeacherCourse;
  pendingCount: number;
  busy: boolean;
  onClose: () => void;
}) {
  const qr = useSessionQr(sessionId);
  const now = useNow();
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const secondsLeft =
    qr && now ? Math.max(0, Math.ceil((qr.expiresAt - now) / 1000)) : 30;
  const countdown = `00:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-5 py-2 sm:flex-row sm:items-start sm:justify-center">
      <button
        className="group relative grid size-56 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white p-2"
        onClick={() => setPresenting(true)}
        aria-label="QR кодыг том дэлгэцээр харуулах"
      >
        {qr ? (
          <Image
            unoptimized
            src={qr.dataUrl}
            alt="Ирц бүртгүүлэх QR код"
            width={320}
            height={320}
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
          Оюутнууд QR кодыг уншуулж, эсвэл доорх кодыг оруулж ирцээ бүртгүүлнэ.
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Код</span>
            <span className="text-slate-500">
              шинэчлэгдэхэд{" "}
              <strong className="tabular-nums text-emerald-700">
                {countdown}
              </strong>
            </span>
          </div>
          <p
            className="mt-1 text-center font-mono text-3xl font-semibold tracking-[0.3em] text-slate-900"
            aria-label="Ирцийн код"
          >
            {qr?.code ?? "······"}
          </p>
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
                className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={busy}
                onClick={onClose}
              >
                {busy ? "Хааж байна…" : "Тийм, хаах"}
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
      </div>

      {presenting && (
        <PresentationOverlay
          title={course.title}
          dataUrl={qr?.dataUrl ?? ""}
          code={qr?.code ?? ""}
          countdown={countdown}
          onClose={() => setPresenting(false)}
        />
      )}
    </div>
  );
}

/** Проектор / том дэлгэцэнд зориулсан бүтэн дэлгэцийн QR. Esc дарж хаана. */
function PresentationOverlay({
  title,
  dataUrl,
  code,
  countdown,
  onClose,
}: {
  title: string;
  dataUrl: string;
  code: string;
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-surface p-6"
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
        <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-lg text-slate-500">
          Утсаараа QR кодыг уншуулж ирцээ бүртгүүлнэ үү
        </p>
      </div>
      <div className="grid aspect-square w-[min(62vh,85vw)] place-items-center rounded-2xl border border-slate-200 bg-white p-4">
        {dataUrl ? (
          <Image
            unoptimized
            src={dataUrl}
            alt="Ирц бүртгүүлэх QR код"
            width={320}
            height={320}
            className="size-full [image-rendering:pixelated]"
          />
        ) : (
          <span className="text-slate-500">QR бэлдэж байна…</span>
        )}
      </div>
      <p className="text-lg text-slate-500">
        Код:{" "}
        <strong className="font-mono text-2xl tracking-[0.3em] text-slate-900">
          {code}
        </strong>{" "}
        · шинэчлэгдэхэд{" "}
        <strong className="tabular-nums text-emerald-700">{countdown}</strong>
      </p>
    </div>
  );
}
