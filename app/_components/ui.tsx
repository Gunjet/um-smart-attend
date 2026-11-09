import Image from "next/image";
import { STATUS_PILL_CLASS } from "../_lib/constants";
import type { AttendanceStatus } from "../_lib/types";

/**
 * Үсгийн хэмжээний дүрэм (бүх хуудсанд ижил):
 *   хуудасны гарчиг  text-2xl sm:text-3xl
 *   хэсгийн гарчиг   text-xl      картын гарчиг  text-lg
 *   үндсэн текст     text-[15px]  туслах текст   text-sm
 *   жижиг шошго      text-[13px]  (үүнээс жижиг хэрэглэхгүй)
 */
export const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300";

export const secondaryButtonClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-300";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      unoptimized
      src="umtds-logo.png"
      alt="Шинжлэх ухаан, технологийн их сургууль"
      width={2255}
      height={396}
      priority={priority}
      className={className}
    />
  );
}

export function StatusPill({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cx(
        "inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-medium",
        STATUS_PILL_CLASS[status],
      )}
    >
      {status}
    </span>
  );
}

export function ProgressBar({
  value,
  className = "h-2",
  barClassName = "bg-emerald-600",
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx("overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx("h-full rounded-full transition-[width]", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
