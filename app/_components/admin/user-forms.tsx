"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { AdminActionState, AdminUser } from "../../_lib/admin-types";
import { COURSE_YEARS, PROGRAMS } from "../../_lib/programs";
import type { UserRole } from "../../_lib/types";
import {
  createUser,
  deleteUser,
  importStudents,
  resetPasskey,
  resetPassword,
  updateUser,
} from "../../_server/admin/actions";
import { CopyIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";

export type Action = (
  previous: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Админ",
  teacher: "Багш",
  student: "Оюутан",
};

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-surface px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

const secondaryClass =
  "rounded-lg border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

/**
 * Server action-ийг дуудаж, амжилттай бол (шинэ нууц үг харуулах шаардлагагүй үед)
 * цонхыг хааж мэдэгдэл гаргана.
 *
 * `<form action>` нь илгээсний дараа талбаруудыг автоматаар цэвэрлэдэг тул
 * алдаа гарахад бичсэн утгууд арилдаг. Үүнээс сэргийлж `onSubmit`-ээр дуудна.
 */
export function useAdminAction(
  action: Action,
  onDone: (message: string) => void,
) {
  const [state, dispatch, pending] = useActionState<AdminActionState, FormData>(
    async (previous, formData) => {
      const result = await action(previous, formData);
      if (result?.ok && !result.generatedPassword) onDone(result.message ?? "");
      return result;
    },
    null,
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };

  return [state, onSubmit, pending] as const;
}

/* -------------------------------- Хэсгүүд -------------------------------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-rose-700">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-[13px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
      role="alert"
    >
      {message}
    </p>
  );
}

export function FormActions({
  onCancel,
  submitLabel,
  pending,
  danger,
}: {
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className={secondaryClass} onClick={onCancel}>
        Болих
      </button>
      <button
        type="submit"
        disabled={pending}
        className={
          danger
            ? "rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            : cx(primaryButtonClass, "disabled:opacity-60")
        }
      >
        {pending ? "Түр хүлээнэ үү…" : submitLabel}
      </button>
    </div>
  );
}

/** Автоматаар үүсгэсэн нууц үгийг нэг удаа харуулна. */
function PasswordReveal({
  password,
  message,
  onDone,
}: {
  password: string;
  message?: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      {message && <p className="text-[15px] text-slate-700">{message}</p>}
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Нууц үг</p>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <code className="flex-1 font-mono text-[17px] tracking-wider text-slate-900">
            {password}
          </code>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-emerald-700 hover:bg-slate-100"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(password);
                setCopied(true);
              } catch {
                /* clipboard хориглогдсон бол гараар хуулна */
              }
            }}
          >
            <CopyIcon className="size-4" />
            {copied ? "Хуулсан" : "Хуулах"}
          </button>
        </div>
        <p className="mt-2 text-[13px] text-amber-700">
          Энэ нууц үг зөвхөн одоо харагдана. Хэрэглэгчид дамжуулаад цонхыг хаана
          уу.
        </p>
      </div>
      <div className="flex justify-end">
        <button type="button" className={primaryButtonClass} onClick={onDone}>
          Болсон
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Нэмэх / засах ------------------------------ */

export function UserForm({
  user,
  onCancel,
  onDone,
}: {
  /** Байвал засах, үгүй бол шинээр нэмэх. */
  user?: AdminUser;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(
    user ? updateUser : createUser,
    onDone,
  );
  const [role, setRole] = useState<UserRole>(user?.role ?? "student");
  const isStudent = role === "student";

  if (state?.generatedPassword) {
    return (
      <PasswordReveal
        password={state.generatedPassword}
        message={state.message}
        onDone={() => onDone(state.message ?? "")}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {user ? (
        <input type="hidden" name="id" value={user.id} />
      ) : (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Эрх</p>
          <div
            className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
            role="radiogroup"
            aria-label="Эрх"
          >
            {(["student", "teacher", "admin"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={role === option}
                onClick={() => setRole(option)}
                className={cx(
                  "rounded-lg py-2 text-sm font-medium transition",
                  role === option
                    ? "bg-surface text-emerald-800 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {ROLE_LABEL[option]}
              </button>
            ))}
          </div>
          <input type="hidden" name="role" value={role} />
        </div>
      )}

      <Field
        label="Овог нэр"
        htmlFor="user-fullName"
        error={state?.fieldErrors?.fullName}
      >
        <input
          id="user-fullName"
          name="fullName"
          className={inputClass}
          defaultValue={user?.name}
          autoComplete="off"
          required
        />
      </Field>

      <Field
        label={isStudent ? "Оюутны код" : "Имэйл хаяг"}
        htmlFor="user-identifier"
        error={state?.fieldErrors?.identifier}
      >
        <input
          key={role}
          id="user-identifier"
          name="identifier"
          type={isStudent ? "text" : "email"}
          className={cx(inputClass, isStudent && "uppercase")}
          defaultValue={(isStudent ? user?.studentCode : user?.email) ?? ""}
          autoComplete="off"
          required
        />
      </Field>

      {isStudent && (
        <Field
          label="Анги"
          htmlFor="user-classGroup"
          error={state?.fieldErrors?.classGroup}
        >
          <ClassGroupSelect
            id="user-classGroup"
            defaultValue={user?.classGroup ?? ""}
          />
        </Field>
      )}

      {!user && (
        <Field
          label="Нууц үг"
          htmlFor="user-password"
          error={state?.fieldErrors?.password}
          hint="Хоосон орхивол автоматаар үүсгэнэ."
        >
          <input
            id="user-password"
            name="password"
            type="text"
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
      )}

      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel={user ? "Хадгалах" : "Нэмэх"}
        pending={pending}
      />
    </form>
  );
}

/** Хөтөлбөрөөр бүлэглэсэн 16 анги (МТ-1 … ГТИ-4). */
export function ClassGroupSelect({
  id,
  defaultValue,
}: {
  id: string;
  defaultValue: string;
}) {
  return (
    <select
      id={id}
      name="classGroup"
      className={inputClass}
      defaultValue={defaultValue}
    >
      <option value="">— Сонгоогүй —</option>
      {PROGRAMS.map((program) => (
        <optgroup key={program.code} label={program.name}>
          {COURSE_YEARS.map((year) => (
            <option key={year} value={`${program.code}-${year}`}>
              {`${program.code}-${year} · ${year}-р курс`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/* ------------------------------ Нууц үг шинэчлэх ----------------------------- */

export function ResetPasswordForm({
  user,
  onCancel,
  onDone,
}: {
  user: AdminUser;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(resetPassword, onDone);

  if (state?.generatedPassword) {
    return (
      <PasswordReveal
        password={state.generatedPassword}
        message={`${user.name}-ийн шинэ нууц үг:`}
        onDone={() => onDone(state.message ?? "")}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={user.id} />
      <Field
        label="Шинэ нууц үг"
        htmlFor="reset-password"
        error={state?.fieldErrors?.password}
        hint="Хоосон орхивол автоматаар үүсгэнэ. Хэрэглэгч бүх төхөөрөмжөөс гарна."
      >
        <input
          id="reset-password"
          name="password"
          type="text"
          className={inputClass}
          autoComplete="new-password"
        />
      </Field>
      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel="Шинэчлэх"
        pending={pending}
      />
    </form>
  );
}

/* -------------------------- Баталгаажуулах үйлдлүүд -------------------------- */

export function ConfirmForm({
  user,
  kind,
  onCancel,
  onDone,
}: {
  user: AdminUser;
  kind: "delete" | "device";
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(
    kind === "delete" ? deleteUser : resetPasskey,
    onDone,
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <p className="text-[15px] text-slate-700">
        {kind === "delete" ? (
          <>
            <strong>{user.name}</strong>-ийн бүртгэлийг бүрмөсөн устгах уу?
            {user.hasHistory && " Түүний бүх ирцийн бүртгэл хамт устна."} Энэ
            үйлдлийг буцаах боломжгүй.
          </>
        ) : (
          <>
            <strong>{user.name}</strong>-ийн Face ID-г устгах уу? Оюутан
            дараагийн удаа нэвтрэхдээ шинэ утсандаа дахин бүртгүүлнэ.
          </>
        )}
      </p>
      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel={kind === "delete" ? "Устгах" : "Face ID устгах"}
        pending={pending}
        danger={kind === "delete"}
      />
    </form>
  );
}

/* ---------------------------- CSV-ээр оруулах ---------------------------- */

export function ImportForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(importStudents, onDone);
  const [csv, setCsv] = useState("");

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        label="Оюутны жагсаалт"
        htmlFor="import-csv"
        error={state?.fieldErrors?.csv}
        hint="Мөр бүрт: оюутны код, овог нэр, анги (заавал биш). Жишээ: 22B1NUM0142, Б. Энхжин, МТ-1"
      >
        <textarea
          id="import-csv"
          name="csv"
          rows={7}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          className={cx(inputClass, "font-mono text-sm")}
          spellCheck={false}
        />
      </Field>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900">
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) setCsv(await file.text());
          }}
        />
        CSV файл сонгох
      </label>
      <Field
        label="Анхны нууц үг"
        htmlFor="import-password"
        error={state?.fieldErrors?.password}
        hint="Бүх шинэ оюутанд ижил анхны нууц үг өгөгдөнө."
      >
        <input
          id="import-password"
          name="password"
          type="text"
          className={inputClass}
          autoComplete="new-password"
        />
      </Field>
      <FormError message={state?.error} />
      <FormActions
        onCancel={onCancel}
        submitLabel="Оруулах"
        pending={pending}
      />
    </form>
  );
}
