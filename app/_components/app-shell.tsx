"use client";

import type { ReactNode } from "react";
import { useNow } from "../_hooks/use-now";
import { formatMongolianDate } from "../_lib/date";
import { CheckIcon, CloseIcon, LogoutIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { cx, Logo } from "./ui";

export type NavItem<T extends string> = {
  id: T;
  label: string;
  shortLabel: string;
  icon: ReactNode;
};

type Account = { name: string; roleLabel: string; initials: string };

const navButtonClass = (active: boolean) =>
  cx(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px]",
    active
      ? "bg-emerald-50 font-medium text-emerald-800"
      : "text-slate-600 hover:bg-slate-50",
  );

export function AppShell<T extends string>({
  account,
  navItems,
  activeView,
  onNavigate,
  onSignOut,
  notice,
  onDismissNotice,
  children,
}: {
  account: Account;
  navItems: NavItem<T>[];
  activeView: T;
  onNavigate: (view: T) => void;
  onSignOut: () => void;
  notice: string;
  onDismissNotice: () => void;
  children: ReactNode;
}) {
  const now = useNow();
  const activeItem = navItems.find((item) => item.id === activeView);
  // Гарах товчтой нийлээд 5-аас олон бол утасны цэсийг нягт болгоно.
  const crowded = navItems.length + 1 > 5;

  return (
    <main className="min-h-screen min-w-0 bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 bg-surface p-5 md:flex">
        <a
          className="mb-10 inline-flex items-center gap-3 px-2"
          href="#home"
          aria-label="ШУТИС"
        >
          <Logo priority className="h-9 w-auto max-w-full object-contain" />
        </a>
        <p className="mb-3 px-2 text-[13px] font-bold tracking-widest text-slate-400">
          СУРГАЛТЫН СИСТЕМ
        </p>
        <nav className="space-y-1" aria-label="Үндсэн цэс">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={navButtonClass(item.id === activeView)}
              aria-current={item.id === activeView ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-[13px] font-semibold text-emerald-800">
              {account.initials}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[15px]">
                {account.name}
              </strong>
              <small className="text-[13px] text-slate-500">
                {account.roleLabel}
              </small>
            </span>
          </div>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            onClick={onSignOut}
          >
            <LogoutIcon />
            Гарах
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-surface/95 px-4 backdrop-blur md:ml-60 md:px-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Нүүр</span>
          <span aria-hidden="true">/</span>
          <strong className="text-slate-800">{activeItem?.label}</strong>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:block">
            {now ? formatMongolianDate(now) : "Өнөөдөр"}
          </span>
          <ThemeToggle />
          <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-[13px] font-semibold text-emerald-800">
            {account.initials}
          </span>
        </div>
      </header>

      {notice && (
        <div
          className="fixed bottom-20 right-4 z-30 flex max-w-sm items-center gap-3 rounded-lg border border-emerald-200 bg-surface p-3 text-[15px] shadow-lg md:bottom-6"
          role="status"
          aria-live="polite"
        >
          <CheckIcon className="size-5 shrink-0 text-emerald-700" />
          {notice}
          <button
            className="ml-auto grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
            onClick={onDismissNotice}
            aria-label="Мэдэгдэл хаах"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      )}

      {children}

      <nav
        className={cx(
          "fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-surface md:hidden",
          crowded ? "gap-0.5 p-1.5" : "p-2",
        )}
        style={{
          gridTemplateColumns: `repeat(${navItems.length + 1}, minmax(0, 1fr))`,
        }}
        aria-label="Гар утасны цэс"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            className={cx(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg py-2",
              // Цэс олон бол (админ) үсгийг жижигрүүлж, багтаана.
              crowded ? "text-[11px]" : "text-[13px]",
              item.id === activeView
                ? "bg-emerald-50 font-medium text-emerald-800"
                : "text-slate-600",
            )}
            aria-current={item.id === activeView ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            <span className="max-w-full truncate px-0.5">
              {item.shortLabel}
            </span>
          </button>
        ))}
        <button
          className={cx(
            "flex min-w-0 flex-col items-center gap-1 rounded-lg py-2 text-slate-600",
            crowded ? "text-[11px]" : "text-[13px]",
          )}
          onClick={onSignOut}
        >
          <LogoutIcon />
          Гарах
        </button>
      </nav>
    </main>
  );
}
