"use client";

import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from "@simplewebauthn/browser";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useQrScanner } from "../../_hooks/use-qr-scanner";
import {
  checkInCodeFromLocation,
  clearCheckInFromLocation,
  clearPendingCheckIn,
  extractCheckInCode,
  readPendingCheckIn,
} from "../../_lib/checkin-link";
import { LocationError, requestLocation } from "../../_lib/device-location";
import type { CheckInStep, StudentCourse } from "../../_lib/dto";
import type { Notify } from "../../_lib/types";
import { describeWebAuthnError } from "../../_lib/webauthn-client";
import { checkIn, precheckCheckIn } from "../../_server/attendance/actions";
import { startCheckInPasskey } from "../../_server/auth/passkey-actions";
import {
  AlertIcon,
  CheckIcon,
  FingerprintIcon,
  MapPinIcon,
  QrIcon,
  StatusDot,
} from "../icons";
import { cx, primaryButtonClass } from "../ui";

const SCANNER_ELEMENT_ID = "student-qr-reader";

type StepState = "idle" | "active" | "done" | "error";
type Progress = { active: CheckInStep | null; failed: CheckInStep | null };

const IDLE: Progress = { active: null, failed: null };

/**
 * Ирц бүртгүүлэх: QR уншуулах эсвэл 6 оронтой код → Face ID → байршил.
 *
 * Safari нь товч дарсны даруйд WebAuthn дуудахыг шаарддаг тул Face ID-ийн
 * challenge-ийг урьдчилан татаж, QR уншсаны дараа баталгаажуулах товч харуулна.
 */
export function CheckInFlow({
  openCourse,
  locationRequired,
  notify,
}: {
  openCourse: StudentCourse | null;
  locationRequired: boolean;
  notify: Notify;
}) {
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  const [scanned, setScanned] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(IDLE);
  /** Урьдчилан шалгаж зөв болсон код (Face ID-г зөвхөн зөв кодонд асууна). */
  const [validCode, setValidCode] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const [pending, startTransition] = useTransition();

  const passkeyOptions = useRef<PublicKeyCredentialRequestOptionsJSON | null>(
    null,
  );
  const prepareSeq = useRef(0);

  const preparePasskey = useCallback(async () => {
    const seq = ++prepareSeq.current;
    passkeyOptions.current = null;
    const result = await startCheckInPasskey();
    if (seq === prepareSeq.current) {
      passkeyOptions.current = result.ok ? result.options : null;
    }
  }, []);

  useEffect(() => {
    void preparePasskey();
  }, [preparePasskey]);

  const fail = useCallback(
    (step: CheckInStep, message: string) => {
      setProgress({ active: null, failed: step });
      setError(message);
      void preparePasskey();
    },
    [preparePasskey],
  );

  const submit = useCallback(
    (value: string) =>
      startTransition(async () => {
        setError("");

        // 1) Face ID — товч дарсан даруйд дуудна.
        setProgress({ active: "passkey", failed: null });
        if (!browserSupportsWebAuthn()) {
          fail("passkey", describeWebAuthnError({ name: "NotSupportedError" }));
          return;
        }
        if (!passkeyOptions.current) await preparePasskey();
        const optionsJSON = passkeyOptions.current;
        passkeyOptions.current = null;
        if (!optionsJSON) {
          fail("passkey", "Face ID бэлтгэж чадсангүй. Дахин оролдоно уу.");
          return;
        }
        let passkey;
        try {
          passkey = await startAuthentication({ optionsJSON });
        } catch (cause) {
          fail("passkey", describeWebAuthnError(cause));
          return;
        }

        // 2) Байршил
        let location = null;
        if (locationRequired) {
          setProgress({ active: "location", failed: null });
          try {
            location = await requestLocation();
          } catch (cause) {
            fail(
              "location",
              cause instanceof LocationError
                ? cause.message
                : "Байршил авч чадсангүй.",
            );
            return;
          }
        }

        // 3) Сервер шалгана
        setProgress({ active: "code", failed: null });
        const result = await checkIn(value, location, passkey);
        if (!result.ok) {
          fail(result.step ?? "code", result.error);
          return;
        }
        setProgress(IDLE);
        setCode("");
        setScanned(null);
        setValidCode(null);
        void preparePasskey();
        notify(result.message ?? "Ирц бүртгэгдлээ.");
        // Дээд талын «Ирц бүртгэгдлээ» баталгааг харагдуулна.
        window.scrollTo({ top: 0, behavior: "smooth" });
      }),
    [fail, locationRequired, notify, preparePasskey],
  );

  // Байршлыг урьдчилан авч эхэлбэл бүртгэл хурдан болно.
  const prefetchLocation = () => {
    if (locationRequired) requestLocation().catch(() => {});
  };

  const precheck = useCallback(async (value: string) => {
    setCheckingCode(true);
    setError("");
    setProgress(IDLE);
    const result = await precheckCheckIn(value);
    setCheckingCode(false);
    if (result.ok) {
      setValidCode(value);
      return true;
    }
    setValidCode(null);
    setProgress({ active: null, failed: "code" });
    setError(result.error);
    return false;
  }, []);

  const scanner = useQrScanner(
    SCANNER_ELEMENT_ID,
    useCallback(
      (text: string) => {
        const value = extractCheckInCode(text);
        void precheck(value).then((ok) => setScanned(ok ? value : null));
        return true; // эхний уншилтын дараа камерыг зогсооно
      },
      [precheck],
    ),
  );

  // Багшийн QR-ийг утасны камераар уншуулж сайт нээгдсэн бол (…/?c=…),
  // эсвэл нэвтрэхээс өмнө уншуулсан бол кодыг шууд шалгаж Face ID товч гаргана.
  useEffect(() => {
    const code = checkInCodeFromLocation() ?? readPendingCheckIn();
    if (!code) return;
    clearCheckInFromLocation();
    clearPendingCheckIn();
    const timer = setTimeout(() => {
      void precheck(code).then((ok) => setScanned(ok ? code : null));
    }, 0);
    return () => clearTimeout(timer);
  }, [precheck]);

  const hasCode = Boolean(validCode);
  const stepState = (step: CheckInStep): StepState => {
    if (progress.failed === step) return "error";
    if (progress.active === step) return "active";
    const order: CheckInStep[] = ["passkey", "location", "code"];
    if (progress.active && order.indexOf(step) < order.indexOf(progress.active))
      return "done";
    if (step === "code" && hasCode && progress.failed !== "code") return "done";
    return "idle";
  };

  const resetScan = () => {
    setScanned(null);
    setValidCode(null);
    setError("");
    setProgress(IDLE);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Ирцээ бүртгүүлэх</h2>
          <p className="mt-0.5 truncate text-[15px] text-slate-500">
            {openCourse ? openCourse.title : "Багшийн дэлгэц дээрх QR код"}
          </p>
        </div>
        {openCourse && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-semibold text-emerald-800">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot pulse />
              Нээлттэй
            </span>
          </span>
        )}
      </div>

      <ol className="mt-4 flex items-center" aria-label="Шалгах алхмууд">
        <Step
          icon={<QrIcon className="size-4" />}
          label="Код"
          state={stepState("code")}
        />
        <StepLine />
        <Step
          icon={<FingerprintIcon className="size-4" />}
          label="Face ID"
          state={stepState("passkey")}
        />
        {locationRequired && (
          <>
            <StepLine />
            <Step
              icon={<MapPinIcon className="size-4" />}
              label="Байршил"
              state={stepState("location")}
            />
          </>
        )}
      </ol>

      <div
        className={cx(
          "relative mx-auto mt-4 grid aspect-square w-full max-w-[17rem] place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition",
          scanned
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <div
          id={SCANNER_ELEMENT_ID}
          className="absolute inset-0 z-10 size-full"
        />
        {!scanner.isScanning && (
          <div className="pointer-events-none flex flex-col items-center gap-3 px-6 text-center">
            {scanned ? (
              <>
                <span className="grid size-16 place-items-center rounded-full bg-emerald-700 text-3xl text-white">
                  <CheckIcon className="size-8" />
                </span>
                <strong className="text-[15px] font-semibold text-emerald-800">
                  QR уншигдлаа
                </strong>
              </>
            ) : (
              <>
                <span className="relative grid size-24 place-items-center text-emerald-600">
                  <i className="absolute left-0 top-0 size-5 rounded-tl-md border-l-[3px] border-t-[3px] border-emerald-600" />
                  <i className="absolute right-0 top-0 size-5 rounded-tr-md border-r-[3px] border-t-[3px] border-emerald-600" />
                  <i className="absolute bottom-0 right-0 size-5 rounded-br-md border-b-[3px] border-r-[3px] border-emerald-600" />
                  <i className="absolute bottom-0 left-0 size-5 rounded-bl-md border-b-[3px] border-l-[3px] border-emerald-600" />
                  <QrIcon className="size-10" />
                </span>
                <span className="text-sm text-slate-500">
                  Камераа QR код руу чиглүүлнэ үү
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {(error || scanner.error) && (
        <p
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          role="alert"
        >
          {error || scanner.error}
        </p>
      )}

      <div className="mt-4">
        {scanned && !scanner.isScanning ? (
          <div className="space-y-1">
            <button
              className={cx(primaryButtonClass, "min-h-12 w-full text-[15px]")}
              disabled={pending}
              onClick={() => submit(scanned)}
            >
              <FingerprintIcon className="size-5" />
              {pending ? "Шалгаж байна…" : "Face ID-гаар баталгаажуулах"}
            </button>
            <button
              className="w-full rounded-lg py-2 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
              disabled={pending}
              onClick={resetScan}
            >
              Дахин уншуулах
            </button>
          </div>
        ) : (
          <button
            className={cx(primaryButtonClass, "min-h-12 w-full text-[15px]")}
            disabled={pending}
            onClick={() => {
              setError("");
              setProgress(IDLE);
              if (scanner.isScanning) void scanner.stop();
              else {
                prefetchLocation();
                void scanner.start();
              }
            }}
          >
            <QrIcon className="size-5" />
            {scanner.isScanning ? "Камер зогсоох" : "QR уншуулах"}
          </button>
        )}
      </div>

      <div className="my-4 flex items-center gap-3 text-[13px] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        эсвэл кодоор
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validCode === code) submit(code);
          else if (!/^\d{6}$/.test(code))
            setError("6 оронтой кодоо оруулна уу.");
        }}
      >
        <label htmlFor="checkin-code" className="sr-only">
          Багшийн дэлгэц дээрх 6 оронтой код
        </label>
        <div className="flex gap-2">
          <input
            id="checkin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onFocus={prefetchLocation}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "");
              setCode(next);
              setValidCode(null);
              if (progress.failed === "code") {
                setProgress(IDLE);
                setError("");
              }
              // 6 орон бүрэн болмогц кодыг шалгана.
              if (next.length === 6) void precheck(next);
            }}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-surface px-3 py-3 text-center font-mono text-xl tracking-[0.4em] text-slate-900 outline-none placeholder:text-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-slate-200 bg-surface px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={pending || checkingCode || validCode !== code}
          >
            {checkingCode ? "…" : pending && !scanned ? "…" : "Бүртгүүлэх"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Step({
  icon,
  label,
  state,
}: {
  icon: ReactNode;
  label: string;
  state: StepState;
}) {
  return (
    <li
      className="flex flex-col items-center gap-1"
      aria-current={state === "active" ? "step" : undefined}
    >
      <span
        className={cx(
          "grid size-9 place-items-center rounded-full border-2 transition",
          state === "done" && "border-emerald-700 bg-emerald-700 text-white",
          state === "active" &&
            "animate-pulse border-emerald-700 bg-emerald-50 text-emerald-800",
          state === "error" && "border-rose-500 bg-rose-50 text-rose-700",
          state === "idle" && "border-slate-200 bg-surface text-slate-400",
        )}
      >
        {state === "done" ? (
          <CheckIcon />
        ) : state === "error" ? (
          <AlertIcon />
        ) : (
          icon
        )}
      </span>
      <span
        className={cx(
          "text-xs font-medium",
          state === "error"
            ? "text-rose-700"
            : state === "idle"
              ? "text-slate-400"
              : "text-slate-700",
        )}
      >
        {label}
      </span>
    </li>
  );
}

function StepLine() {
  return (
    <li aria-hidden="true" className="mx-1 mb-5 h-0.5 flex-1 bg-slate-200" />
  );
}
