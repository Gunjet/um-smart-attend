"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { Notify, Role } from "../_lib/types";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  StudentIcon,
  TeacherIcon,
} from "./icons";
import { cx, Logo } from "./ui";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

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

export type Credentials = { role: Role; identifier: string };

export function LoginScreen({
  initialRole,
  notice,
  onDismissNotice,
  notify,
  onSignIn,
}: {
  initialRole: Role;
  notice: string;
  onDismissNotice: () => void;
  notify: Notify;
  onSignIn: (credentials: Credentials) => void;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const copy = ROLE_COPY[role];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSignIn({
      role,
      identifier: String(formData.get("identifier") ?? "").trim(),
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-800">
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
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
                      ? "bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() => setRole(option.role)}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-identifier"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {copy.idLabel}
              </label>
              <input
                key={role}
                className={fieldClass}
                id="login-identifier"
                name="identifier"
                type={copy.idType}
                autoComplete="username"
                required
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
                  onClick={() =>
                    notify("Нууц үг сэргээх demo холбоос идэвхгүй байна.")
                  }
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
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              type="submit"
            >
              {copy.submit}
              <ArrowRightIcon />
            </button>
          </form>

          {notice && (
            <div
              className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
              role="status"
            >
              {notice}
              <button
                className="text-slate-400 hover:text-slate-700"
                onClick={onDismissNotice}
                aria-label="Мэдэгдэл хаах"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
