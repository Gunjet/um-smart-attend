"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import {
  checkInCodeFromLocation,
  savePendingCheckIn,
} from "../_lib/checkin-link";
import { login } from "../_server/auth/actions";
import type { Role } from "../_lib/types";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  StudentIcon,
  TeacherIcon,
} from "./icons";
import { InAppBrowserNotice } from "./in-app-browser-notice";
import { ThemeToggle } from "./theme-toggle";
import { cx, Logo } from "./ui";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-surface px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

const ROLE_OPTIONS: { role: Role; label: string; icon: ReactNode }[] = [
  { role: "teacher", label: "Багш", icon: <TeacherIcon /> },
  { role: "student", label: "Оюутан", icon: <StudentIcon /> },
];

const ROLE_COPY: Record<
  Role,
  {
    idLabel: string;
    idType: string;
    submit: string;
  }
> = {
  teacher: {
    idLabel: "Имэйл хаяг",
    idType: "email",
    submit: "Багшаар нэвтрэх",
  },
  student: {
    idLabel: "Оюутны код",
    idType: "text",
    submit: "Оюутнаар нэвтрэх",
  },
};

export function LoginScreen() {
  const [state, formAction, pending] = useActionState(login, null);
  const [role, setRole] = useState<Role>("teacher");
  // Алдаа гарахад React формыг цэвэрлэдэг тул нэвтрэх нэрийг state-д хадгална.
  const [identifier, setIdentifier] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const copy = ROLE_COPY[role];

  // Багшийн QR-ийг камераар уншуулж нээсэн бол кодыг хадгалж, нэвтэрсний
  // дараа ирц бүртгэх алхмыг үргэлжлүүлнэ.
  useEffect(() => {
    const code = checkInCodeFromLocation();
    if (!code) return;
    savePendingCheckIn(code);
    // Ирцийн QR-ийг оюутан уншуулдаг тул «Оюутан» табыг сонгоно.
    const timer = setTimeout(() => setRole("student"), 0);
    return () => clearTimeout(timer);
  }, []);
  const fieldErrors = state?.fieldErrors;

  return (
    <main className="relative flex min-h-screen flex-col bg-surface text-slate-800">
      <ThemeToggle className="absolute right-4 top-4" />
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-surface px-6 py-8 sm:px-10 sm:py-10">
          <Logo priority className="mx-auto h-12 w-auto object-contain" />

          <h2 className="mt-8 text-center text-2xl font-bold sm:text-[28px] leading-tight tracking-tight text-emerald-700">
            Ирц бүртгэлийн систем
          </h2>
          <span
            className="mx-auto mt-3 block h-1 w-12 rounded-full bg-emerald-400"
            aria-hidden="true"
          />
          <p className="mt-3 text-center text-[15px] text-slate-500">
            Эрхээ сонгоод нэвтэрнэ үү.
          </p>

          <InAppBrowserNotice />

          <div
            className="mt-7 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            role="radiogroup"
            aria-label="Нэвтрэх эрх"
          >
            {ROLE_OPTIONS.map((option) => {
              const active = role === option.role;
              return (
                <button
                  key={option.role}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cx(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-[15px] font-medium transition",
                    active
                      ? "bg-surface text-emerald-800 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() => {
                    setRole(option.role);
                    setIdentifier("");
                  }}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>

          <form className="mt-6 space-y-5" action={formAction} noValidate>
            <input type="hidden" name="role" value={role} />
            <div>
              <label
                htmlFor="login-identifier"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {copy.idLabel}
              </label>
              <input
                className={fieldClass}
                id="login-identifier"
                name="identifier"
                type={copy.idType}
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                aria-invalid={Boolean(fieldErrors?.identifier)}
                aria-describedby="login-identifier-error"
                required
              />
              <FieldError
                id="login-identifier-error"
                message={fieldErrors?.identifier}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Нууц үг
                </label>
                <button
                  className="text-[13px] font-medium text-emerald-700 hover:text-emerald-900"
                  type="button"
                  onClick={() => setShowHelp((value) => !value)}
                  aria-expanded={showHelp}
                >
                  Нууц үг мартсан уу?
                </button>
              </div>
              <div className="relative">
                <input
                  className={cx(fieldClass, "pr-11")}
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors?.password)}
                  aria-describedby="login-password-error"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Нууц үг нуух" : "Нууц үг харуулах"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <FieldError
                id="login-password-error"
                message={fieldErrors?.password}
              />
              {showHelp && (
                <p className="mt-2 text-[13px] text-slate-500">
                  Нууц үгээ сэргээхийн тулд сургуулийн админд хандана уу.
                </p>
              )}
            </div>

            {state?.error && (
              <p
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
                role="alert"
              >
                {state.error}
              </p>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 disabled:opacity-70 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-emerald-800 dark:hover:bg-emerald-700 dark:hover:brightness-110"
              type="submit"
              disabled={pending}
            >
              {pending ? "Нэвтэрч байна…" : copy.submit}
              {!pending && <ArrowRightIcon />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-[13px] text-rose-700">
      {message}
    </p>
  );
}
