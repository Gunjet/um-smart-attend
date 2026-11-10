"use client";

import { useState, useSyncExternalStore } from "react";
import { detectInAppBrowser, isAndroid, isIOS } from "../_lib/in-app-browser";

const noopSubscribe = () => () => {};
const getUserAgent = () => navigator.userAgent;
const getServerUserAgent = () => "";

/**
 * Messenger гэх мэт апп доторх хөтчөөр нээгдсэн бол жинхэнэ хөтчөөр
 * нээхийг санал болгоно. Ийм хөтөч cookie-г мартдаг тул оюутан дахин
 * ороход "өөр төхөөрөмж" гэж гардаг.
 */
export function InAppBrowserNotice() {
  const userAgent = useSyncExternalStore(
    noopSubscribe,
    getUserAgent,
    getServerUserAgent,
  );
  const [copied, setCopied] = useState(false);
  const app = detectInAppBrowser(userAgent);
  if (!app) return null;

  const android = isAndroid(userAgent);
  const ios = isIOS(userAgent);

  const openInBrowser = () => {
    const { host, pathname, search } = window.location;
    const path = `${host}${pathname}${search}`;
    window.location.href = android
      ? `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(`https://${path}`)};end`
      : `x-safari-https://${path}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      window.prompt("Линкийг хуулна уу:", window.location.href);
    }
  };

  return (
    <div
      className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
      role="alert"
    >
      <p className="font-semibold">{app} доторх хөтчөөр нээгдсэн байна</p>
      <p className="mt-1 text-amber-800">
        Энэ хөтөч таныг сануулж чаддаггүй тул оюутнаар нэвтрэх боломжгүй.{" "}
        {ios ? "Safari" : "Chrome"}-оор нээнэ үү.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(android || ios) && (
          <button
            type="button"
            onClick={openInBrowser}
            className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700"
          >
            {ios ? "Safari-д нээх" : "Chrome-д нээх"}
          </button>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-amber-300 bg-surface px-3 py-2 font-medium text-amber-800 hover:bg-amber-100"
        >
          {copied ? "Хуулагдлаа ✓" : "Линк хуулах"}
        </button>
      </div>
      <p className="mt-3 text-[13px] text-amber-700">
        Товч ажиллахгүй бол баруун дээд буланд байрлах <strong>⋯</strong> цэсээс
        «{ios ? "Open in Safari" : "Open in Chrome"}» гэснийг сонгоно уу.
      </p>
    </div>
  );
}
