"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CopyIcon, DownloadIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";

/**
 * Сайт руу оруулах QR. Утасны камераар уншуулахад линк Safari / Chrome-д
 * шууд нээгддэг тул Messenger-ийн доторх хөтчийн асуудал гардаггүй.
 * Хаягийг сайтыг нээсэн хаягаас (production домэйн) авна.
 */
export function SiteQrPanel() {
  const [url, setUrl] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const origin = window.location.origin;
    QRCode.toDataURL(origin, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((image) => {
      setUrl(origin);
      setDataUrl(image);
    });
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Хаягийг хуулна уу:", url);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Сайтын QR
      </h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Камераар уншуулж системд орно.
      </p>

      <section className="mt-6 flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-surface p-6 sm:flex-row sm:items-start">
        <div className="w-full max-w-[16rem] shrink-0 rounded-xl border border-slate-200 bg-white p-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Сайт руу орох QR код"
              className="aspect-square w-full"
            />
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-lg bg-slate-100" />
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3">
          <div>
            <p className="break-all font-mono text-[15px] font-medium text-slate-900">
              {url || "…"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              disabled={!url}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <CopyIcon className="size-4" />
              {copied ? "Хуулагдлаа" : "Хаяг хуулах"}
            </button>
            <a
              href={dataUrl || undefined}
              download="irts-system-qr.png"
              aria-disabled={!dataUrl}
              className={cx(
                primaryButtonClass,
                !dataUrl && "pointer-events-none opacity-50",
              )}
            >
              <DownloadIcon />
              PNG татах
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
