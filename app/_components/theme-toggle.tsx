"use client";

import { useTheme } from "../_hooks/use-theme";
import { MoonIcon, SunIcon } from "./icons";
import { cx } from "./ui";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark
    ? "Цайвар горим руу шилжих"
    : "Харанхуй горим руу шилжих";

  return (
    <button
      type="button"
      className={cx(
        "grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
        className,
      )}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
