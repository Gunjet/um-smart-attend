"use client";

import { useCallback, useState, useTransition } from "react";
import { useQrScanner } from "../../_hooks/use-qr-scanner";
import { LocationError, requestLocation } from "../../_lib/device-location";
import type { StudentCourse } from "../../_lib/dto";
import type { Notify } from "../../_lib/types";
import { checkIn } from "../../_server/attendance/actions";
import { MapPinIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";

const SCANNER_ELEMENT_ID = "student-qr-reader";

/**
 * QR уншуулах эсвэл багшийн дэлгэц дээрх 6 оронтой кодыг оруулж ирц бүртгүүлнэ.
 * Сургуулийн байршил тохируулсан бол утасны байршлыг хамт илгээнэ.
 */
export function CheckInFlow({
  openCourse,
  locationRequired,
  notify,
}: {
  /** Ирц нь нээлттэй, хараахан бүртгүүлээгүй хичээл (байхгүй бол null). */
  openCourse: StudentCourse | null;
  /** Сургуулийн байршил тохируулсан эсэх. */
  locationRequired: boolean;
  notify: Notify;
}) {
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (value: string) =>
      startTransition(async () => {
        setError("");
        let location = null;
        if (locationRequired) {
          try {
            location = await requestLocation();
          } catch (cause) {
            setError(
              cause instanceof LocationError
                ? cause.message
                : "Байршил авч чадсангүй.",
            );
            return;
          }
        }
        const result = await checkIn(value, location);
        if (result.ok) {
          setCode("");
          notify(result.message ?? "Ирц бүртгэгдлээ.");
        } else {
          setError(result.error);
        }
      }),
    [locationRequired, notify],
  );

  // Байршлыг урьдчилан авч эхэлбэл бүртгэл хурдан болно.
  const prefetchLocation = () => {
    if (locationRequired) requestLocation().catch(() => {});
  };

  const scanner = useQrScanner(
    SCANNER_ELEMENT_ID,
    useCallback(
      (text: string) => {
        submit(text);
        return true; // эхний уншилтын дараа камерыг зогсооно
      },
      [submit],
    ),
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5">
      <h2 className="text-xl font-semibold">Ирцээ бүртгүүлэх</h2>
      <p className="mt-1 text-[15px] text-slate-500">
        {openCourse
          ? `${openCourse.title} хичээлийн ирц нээлттэй байна.`
          : "Багшийн дэлгэц дээрх QR кодыг уншуулна уу."}
      </p>
      {locationRequired && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-400">
          <MapPinIcon className="size-3.5" />
          Бүртгүүлэхэд таны байршлыг шалгана.
        </p>
      )}

      <div className="relative mx-auto my-4 grid aspect-square w-full max-w-xs place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
        <div
          id={SCANNER_ELEMENT_ID}
          className="absolute inset-0 z-10 size-full"
        />
        {!scanner.isScanning && (
          <div className="pointer-events-none flex flex-col items-center gap-3 text-center text-slate-500">
            <span className="relative grid size-28 place-items-center text-5xl text-emerald-600">
              <i className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-emerald-600" />
              <i className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-emerald-600" />
              <i className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-emerald-600" />
              <i className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-emerald-600" />
              ▦
            </span>
            <strong className="text-sm font-medium">
              {pending
                ? locationRequired
                  ? "Байршил шалгаж байна…"
                  : "Шалгаж байна…"
                : "Камераа QR код руу чиглүүлнэ үү"}
            </strong>
          </div>
        )}
      </div>

      {(error || scanner.error) && (
        <p
          className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          ⚠ {error || scanner.error}
        </p>
      )}

      <button
        className={cx(primaryButtonClass, "w-full")}
        disabled={pending}
        onClick={() => {
          setError("");
          if (scanner.isScanning) void scanner.stop();
          else {
            prefetchLocation();
            void scanner.start();
          }
        }}
      >
        {scanner.isScanning ? "Камер зогсоох" : "▣ Камер нээж QR уншуулах"}
      </button>

      <form
        className="mt-4 border-t border-slate-100 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (/^\d{6}$/.test(code)) submit(code);
          else setError("6 оронтой кодоо оруулна уу.");
        }}
      >
        <label
          htmlFor="checkin-code"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Эсвэл багшийн дэлгэц дээрх кодыг оруулах
        </label>
        <div className="flex gap-2">
          <input
            id="checkin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onFocus={prefetchLocation}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-slate-300 bg-surface px-3.5 py-2.5 text-center font-mono text-xl tracking-[0.4em] text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-slate-200 bg-surface px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={pending || code.length !== 6}
          >
            Бүртгүүлэх
          </button>
        </div>
      </form>
    </section>
  );
}
