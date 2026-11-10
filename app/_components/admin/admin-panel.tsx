"use client";

import { useState } from "react";
import type { AdminUser } from "../../_lib/admin-types";
import type { Notify, UserRole } from "../../_lib/types";
import { Dialog } from "../dialog";
import {
  FingerprintIcon,
  KeyIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from "../icons";
import { cx, primaryButtonClass, secondaryButtonClass } from "../ui";
import {
  ConfirmForm,
  ImportForm,
  ResetPasswordForm,
  ROLE_LABEL,
  UserForm,
} from "./user-forms";

type Filter = "all" | UserRole | "archived";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Бүгд" },
  { id: "student", label: "Оюутан" },
  { id: "teacher", label: "Багш" },
  { id: "admin", label: "Админ" },
  { id: "archived", label: "Архив" },
];

const ROLE_PILL: Record<UserRole, string> = {
  admin: "bg-amber-50 text-amber-800",
  teacher: "bg-emerald-50 text-emerald-800",
  student: "bg-slate-100 text-slate-700",
};

type DialogState =
  | { kind: "create" }
  | { kind: "import" }
  | {
      kind: "edit" | "password" | "device" | "delete" | "restore";
      user: AdminUser;
    };

const DIALOG_TITLE: Record<DialogState["kind"], string> = {
  create: "Хэрэглэгч нэмэх",
  import: "Оюутнуудыг CSV-ээр оруулах",
  edit: "Мэдээлэл засах",
  password: "Нууц үг шинэчлэх",
  device: "Face ID устгах",
  delete: "Хэрэглэгч устгах",
  restore: "Хэрэглэгч сэргээх",
};

export function AdminPanel({
  users,
  currentUserId,
  notify,
}: {
  users: AdminUser[];
  currentUserId: string;
  notify: Notify;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  // Цонх нээх бүрт форм шинээр эхэлнэ.
  const [dialogKey, setDialogKey] = useState(0);

  const open = (next: DialogState) => {
    setDialogKey((key) => key + 1);
    setDialog(next);
  };
  const close = () => setDialog(null);
  const done = (message: string) => {
    setDialog(null);
    if (message) notify(message);
  };

  // Архивласан хэрэглэгчид зөвхөн "Архив" шүүлтүүрт харагдана.
  const active = users.filter((user) => !user.archived);
  const counts: Record<Filter, number> = {
    all: active.length,
    student: active.filter((user) => user.role === "student").length,
    teacher: active.filter((user) => user.role === "teacher").length,
    admin: active.filter((user) => user.role === "admin").length,
    archived: users.length - active.length,
  };

  const query = search.trim().toLowerCase();
  const visible = users.filter(
    (user) =>
      (filter === "archived"
        ? user.archived
        : !user.archived && (filter === "all" || user.role === filter)) &&
      (!query ||
        [user.name, user.email, user.studentCode, user.classGroup]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Хэрэглэгчид
          </h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Багш, оюутны бүртгэл удирдах
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            className={cx(
              secondaryButtonClass,
              "flex items-center justify-center gap-2",
            )}
            onClick={() => open({ kind: "import" })}
          >
            <UploadIcon className="size-4" />
            <span className="sm:hidden">CSV оруулах</span>
            <span className="hidden sm:inline">CSV-ээр оруулах</span>
          </button>
          <button
            className={primaryButtonClass}
            onClick={() => open({ kind: "create" })}
          >
            <PlusIcon className="size-4" />
            <span className="sm:hidden">Нэмэх</span>
            <span className="hidden sm:inline">Хэрэглэгч нэмэх</span>
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div
            className="-mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:w-auto"
            role="tablist"
            aria-label="Эрхээр шүүх"
          >
            {FILTERS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cx(
                  "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  filter === item.id
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
              >
                {item.label}{" "}
                <span className="tabular-nums text-slate-400">
                  {counts[item.id]}
                </span>
              </button>
            ))}
          </div>
          <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 sm:w-auto">
            <span className="text-slate-400" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              className="w-full bg-transparent py-2 sm:w-56 text-[15px] outline-none placeholder:text-slate-400"
              aria-label="Хэрэглэгч хайх"
              placeholder="Нэр, имэйл, код"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {/* Гар утсан дээр: карт жагсаалт */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {visible.map((user) => (
            <li key={user.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-1.5 text-[13px] font-normal text-slate-400">
                        (та)
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-sm text-slate-500">
                    {user.studentCode ?? user.email}
                    {user.classGroup && (
                      <span className="font-sans text-slate-700">
                        {" "}
                        · {user.classGroup}
                      </span>
                    )}
                  </p>
                </div>
                <RolePill role={user.role} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px]">
                  {user.role === "student" ? (
                    <span
                      className={
                        user.passkeyRegistered
                          ? "text-emerald-700"
                          : "text-slate-400"
                      }
                      title="Face ID / хурууны хээ"
                    >
                      <FingerprintIcon className="mr-1 inline size-3.5 align-[-2px]" />
                      {user.passkeyRegistered
                        ? "Face ID бүртгэсэн"
                        : "Face ID бүртгээгүй"}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {user.createdAt.slice(0, 10).replaceAll("-", ".")}
                    </span>
                  )}
                </span>
                <UserActions
                  user={user}
                  isSelf={user.id === currentUserId}
                  onAction={open}
                />
              </div>
            </li>
          ))}
        </ul>

        {/* Том дэлгэцэн дээр: хүснэгт */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[15px]">
            <thead>
              <tr className="text-left text-sm text-slate-500">
                <th
                  scope="col"
                  className="border-b border-slate-100 px-5 py-3 font-medium"
                >
                  Нэр
                </th>
                <th
                  scope="col"
                  className="border-b border-slate-100 px-3 py-3 font-medium"
                >
                  Эрх
                </th>
                <th
                  scope="col"
                  className="border-b border-slate-100 px-3 py-3 font-medium"
                >
                  Нэвтрэх нэр
                </th>
                <th
                  scope="col"
                  className="border-b border-slate-100 px-3 py-3 font-medium"
                >
                  Анги
                </th>
                <th
                  scope="col"
                  className="border-b border-slate-100 px-3 py-3 font-medium"
                >
                  Face ID
                </th>
                <th
                  scope="col"
                  className="border-b border-slate-100 px-3 py-3 font-medium"
                >
                  Бүртгэсэн
                </th>
                <th
                  scope="col"
                  className="border-b border-slate-100 px-5 py-3 text-right font-medium"
                >
                  <span className="sr-only">Үйлдэл</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-5 py-3">
                      <span className="font-medium text-slate-900">
                        {user.name}
                      </span>
                      {isSelf && (
                        <span className="ml-2 text-[13px] text-slate-400">
                          (та)
                        </span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <RolePill role={user.role} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 font-mono text-sm text-slate-600">
                      {user.studentCode ?? user.email}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm whitespace-nowrap">
                      {user.role !== "student" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        (user.classGroup ?? (
                          <span className="text-amber-700">Сонгоогүй</span>
                        ))
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm">
                      {user.role !== "student" ? (
                        <span className="text-slate-300">—</span>
                      ) : user.passkeyRegistered ? (
                        <span className="text-emerald-700">Бүртгэсэн</span>
                      ) : (
                        <span className="text-slate-400">Бүртгээгүй</span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-sm tabular-nums text-slate-500">
                      {user.createdAt.slice(0, 10).replaceAll("-", ".")}
                    </td>
                    <td className="border-b border-slate-100 px-5 py-2">
                      <UserActions
                        user={user}
                        isSelf={isSelf}
                        onAction={open}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <p className="py-10 text-center text-[15px] text-slate-500">
            Хэрэглэгч олдсонгүй.
          </p>
        )}
      </section>

      <Dialog
        open={dialog !== null}
        onClose={close}
        title={dialog ? DIALOG_TITLE[dialog.kind] : ""}
      >
        {dialog?.kind === "create" && (
          <UserForm key={dialogKey} onCancel={close} onDone={done} />
        )}
        {dialog?.kind === "edit" && (
          <UserForm
            key={dialogKey}
            user={dialog.user}
            onCancel={close}
            onDone={done}
          />
        )}
        {dialog?.kind === "password" && (
          <ResetPasswordForm
            key={dialogKey}
            user={dialog.user}
            onCancel={close}
            onDone={done}
          />
        )}
        {(dialog?.kind === "device" ||
          dialog?.kind === "delete" ||
          dialog?.kind === "restore") && (
          <ConfirmForm
            key={dialogKey}
            user={dialog.user}
            kind={dialog.kind}
            onCancel={close}
            onDone={done}
          />
        )}
        {dialog?.kind === "import" && (
          <ImportForm key={dialogKey} onCancel={close} onDone={done} />
        )}
      </Dialog>
    </div>
  );
}

function RolePill({ role }: { role: UserRole }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-md px-2 py-0.5 text-[13px] font-medium",
        ROLE_PILL[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function UserActions({
  user,
  isSelf,
  onAction,
}: {
  user: AdminUser;
  isSelf: boolean;
  onAction: (dialog: DialogState) => void;
}) {
  if (user.archived) {
    return (
      <div className="flex shrink-0 justify-end">
        <button
          type="button"
          onClick={() => onAction({ kind: "restore", user })}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-slate-50"
        >
          Сэргээх
        </button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <RowAction
        label="Засах"
        icon={<PencilIcon className="size-4" />}
        onClick={() => onAction({ kind: "edit", user })}
      />
      <RowAction
        label="Нууц үг шинэчлэх"
        icon={<KeyIcon className="size-4" />}
        onClick={() => onAction({ kind: "password", user })}
      />
      <RowAction
        label="Face ID устгах"
        hidden={user.role !== "student"}
        icon={<FingerprintIcon className="size-4" />}
        disabled={!user.passkeyRegistered}
        onClick={() => onAction({ kind: "device", user })}
      />
      <RowAction
        label={user.hasHistory ? "Архивлах" : "Устгах"}
        icon={<TrashIcon className="size-4" />}
        danger
        disabled={isSelf}
        onClick={() => onAction({ kind: "delete", user })}
      />
    </div>
  );
}

function RowAction({
  label,
  icon,
  onClick,
  danger,
  disabled,
  hidden,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Мөрүүдийн дүрс зэрэгцэхийн тулд зайг нь хадгалж нууна. */
  hidden?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || hidden}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      onClick={onClick}
      className={cx(
        "grid size-9 place-items-center rounded-lg text-slate-400 transition md:size-8 disabled:cursor-not-allowed disabled:opacity-30",
        hidden && "invisible",
        danger
          ? "hover:bg-rose-50 hover:text-rose-700"
          : "hover:bg-slate-100 hover:text-slate-800",
      )}
    >
      {icon}
    </button>
  );
}
