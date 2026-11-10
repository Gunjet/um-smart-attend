"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useQrScanner } from "../../_hooks/use-qr-scanner";
import { useSelfieCamera } from "../../_hooks/use-selfie-camera";
import {
  createQrPayload,
  currentQrTick,
  isValidQrPayload,
} from "../../_lib/qr";
import type {
  AttendanceSession,
  AttendanceStatus,
  Course,
} from "../../_lib/types";
import { cx, primaryButtonClass } from "../ui";

const SCANNER_ELEMENT_ID = "student-qr-reader";

type Step = "scan" | "verify";
type Result = { status: AttendanceStatus; time: string };

const smallButtonClass =
  "rounded-md border border-slate-200 px-2 py-1 text-[13px] font-medium text-slate-700";

export function CheckInFlow({
  course,
  session,
  onCheckIn,
}: {
  course: Course;
  session: AttendanceSession | null;
  onCheckIn: () => Result | null;
}) {
  const [step, setStep] = useState<Step>("scan");
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState<{ ok: boolean; label: string }>({
    ok: false,
    label: "",
  });
  const [faceOk, setFaceOk] = useState(false);
  const {
    videoRef,
    isOpen: cameraOpen,
    photo,
    error: cameraError,
    open: openCamera,
    capture: capturePhoto,
    reset: resetCamera,
  } = useSelfieCamera();

  /** QR payload-ийг шалгаж, зөв бол дараагийн алхам руу шилжинэ. */
  const acceptPayload = useCallback(
    (payload: string) => {
      if (!session) {
        setMessage(
          "Одоогоор идэвхтэй ирцийн QR алга байна. Багшийн бүртгэл эхэлсэн эсэхийг шалгана уу.",
        );
        return false;
      }
      if (!isValidQrPayload(payload, session.id, Date.now())) {
        setMessage(
          "QR код буруу эсвэл хугацаа нь дууссан байна. Дэлгэц дээрх шинэ кодыг уншуулна уу.",
        );
        return false;
      }
      setMessage("");
      setStep("verify");
      return true;
    },
    [session],
  );
  const scanner = useQrScanner(SCANNER_ELEMENT_ID, acceptPayload);

  const checkLocation = () => {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage(
        "Энэ төхөөрөмж байршлын үйлчилгээг дэмжихгүй байна. Demo шалгалтыг ашиглаж болно.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setLocation({
          ok: true,
          label: `Байршил авлаа · ±${Math.round(position.coords.accuracy)} м нарийвчлал`,
        }),
      () =>
        setMessage(
          "Байршлын зөвшөөрөл олгогдсонгүй. Browser-ийн тохиргооноос зөвшөөрөх эсвэл demo-г сонгоно уу.",
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };

  const submit = () => {
    const checkInResult = onCheckIn();
    if (!checkInResult) {
      setMessage("Ирцийн бүртгэл хаагдсан байна. Багштайгаа холбогдоно уу.");
      return;
    }
    // Амжилттай бол эцэг компонент "бүртгүүлсэн" төлөвийг харуулна.
  };

  const reset = () => {
    void scanner.stop();
    resetCamera();
    setStep("scan");
    setMessage("");
    setLocation({ ok: false, label: "" });
    setFaceOk(false);
  };

  const errorMessage = message || (step === "scan" ? scanner.error : "");
  const stepNumber = step === "scan" ? 1 : 2;

  return (
    <>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Ирцээ бүртгүүлэх</h2>
        <span className="text-[15px] font-semibold text-slate-500">
          {stepNumber} / 2 алхам
        </span>
      </div>

      {step === "scan" && (
        <section className="rounded-xl border border-slate-200 bg-surface p-4">
          <StepHeading
            number="01"
            title="QR код уншуулах"
            hint="Багшийн дэлгэц дээрх QR кодыг камертаа тааруулна уу."
          />
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
                  Камераа QR код руу чиглүүлнэ үү
                </strong>
                <small className="text-[13px] text-slate-400">
                  QR кодыг хүрээн дотор байрлуулна уу
                </small>
              </div>
            )}
          </div>
          <ErrorMessage message={errorMessage} />
          <button
            className={cx(primaryButtonClass, "w-full")}
            onClick={
              scanner.isScanning
                ? () => void scanner.stop()
                : () => void scanner.start()
            }
          >
            {scanner.isScanning ? "Камер зогсоох" : "▣ Камер нээх"}
          </button>
          <button
            className="mx-auto mt-3 block px-3 py-1 text-sm font-medium text-emerald-700"
            onClick={() => {
              if (
                acceptPayload(
                  session
                    ? createQrPayload(session.id, currentQrTick(Date.now()))
                    : "",
                )
              )
                void scanner.stop();
            }}
          >
            Demo QR код ашиглах
          </button>
        </section>
      )}

      {step === "verify" && (
        <section className="rounded-xl border border-slate-200 bg-surface p-4">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
            <span className="grid size-7 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800">
              ✓
            </span>
            <span>
              <strong className="block text-sm text-emerald-900">
                QR код амжилттай уншигдлаа
              </strong>
              <small className="text-[13px] text-emerald-800">
                {course.title} · {course.room}
              </small>
            </span>
          </div>
          <StepHeading
            number="02"
            title="Баталгаажуулалт"
            hint="Дараах шалгалтыг хийнэ үү."
          />
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            <CheckRow
              icon="⌖"
              title="Байршлын шалгалт"
              hint={location.label || "Байршлын зөвшөөрлөөр шалгана"}
              done={location.ok}
            >
              <button className={smallButtonClass} onClick={checkLocation}>
                Зөвшөөрөх
              </button>
              <button
                className={smallButtonClass}
                onClick={() => {
                  setLocation({
                    ok: true,
                    label: "Demo байршил · GPS радиус шалгаагүй",
                  });
                  setMessage("");
                }}
              >
                Demo
              </button>
            </CheckRow>
            <CheckRow
              icon="◉"
              title="Нүүрний зураг"
              hint={
                photo
                  ? "Selfie авлаа · бодит танилт биш"
                  : "Камераар selfie авах"
              }
              done={faceOk}
            >
              <button
                className={smallButtonClass}
                onClick={() => void openCamera()}
              >
                Зураг авах
              </button>
            </CheckRow>
          </div>

          <ErrorMessage message={message} className="mt-3" />

          {cameraOpen && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="mx-auto max-h-56 w-full rounded-lg bg-black object-cover"
              />
              {cameraError && (
                <p className="my-2 text-sm text-rose-700">{cameraError}</p>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm"
                  onClick={() => {
                    resetCamera();
                    setFaceOk(true);
                  }}
                >
                  Demo үргэлжлүүлэх
                </button>
                {!cameraError && (
                  <button
                    className={primaryButtonClass}
                    onClick={() => {
                      if (capturePhoto()) setFaceOk(true);
                    }}
                  >
                    Selfie авах
                  </button>
                )}
              </div>
            </div>
          )}

          {photo && !cameraOpen && (
            <Image
              unoptimized
              src={photo}
              alt="Авсан selfie зураг"
              width={320}
              height={220}
              className="mx-auto mt-3 max-h-56 w-full rounded-lg object-cover"
            />
          )}

          <p className="my-3 text-[13px] leading-relaxed text-slate-500">
            Байршил, төхөөрөмжийн алхмууд нь demo шалгалт. Нүүрний биометр
            танилт хийгдэхгүй.
          </p>
          <button
            className={cx(primaryButtonClass, "w-full justify-between")}
            disabled={!location.ok || !faceOk}
            onClick={submit}
          >
            Ирц бүртгүүлэх <span aria-hidden="true">→</span>
          </button>
          <button
            className="mx-auto mt-2 block px-3 py-1 text-sm text-slate-500"
            onClick={reset}
          >
            ← Буцах
          </button>
        </section>
      )}
    </>
  );
}

function StepHeading({
  number,
  title,
  hint,
}: {
  number: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
        {number}
      </span>
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function CheckRow({
  icon,
  title,
  hint,
  done,
  children,
}: {
  icon: string;
  title: string;
  hint: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 p-3">
      <span
        className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-600"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm">{title}</strong>
        <small className="text-[13px] text-slate-500">{hint}</small>
      </span>
      {done ? (
        <span className="font-bold text-emerald-700" aria-label="Шалгагдсан">
          ✓
        </span>
      ) : (
        <div className="flex gap-2">{children}</div>
      )}
    </div>
  );
}

function ErrorMessage({
  message,
  className = "mb-3",
}: {
  message: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      className={cx(
        "rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800",
        className,
      )}
      role="alert"
    >
      ⚠ {message}
    </p>
  );
}
