"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Native <dialog> дээр суурилсан модаль: Esc, focus trap, backdrop-ийг
 * браузер өөрөө зохицуулна.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Backdrop дээр дарахад хаана.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      // Гар утсанд доороос гарч ирэх бүтэн өргөнтэй sheet, том дэлгэцэнд голдоо.
      className="mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 bg-surface p-0 text-slate-800 shadow-xl backdrop:bg-black/50 sm:m-auto sm:max-h-[90dvh] sm:w-[min(92vw,30rem)] sm:rounded-2xl"
    >
      <div className="px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-300"
            onClick={onClose}
            aria-label="Хаах"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
