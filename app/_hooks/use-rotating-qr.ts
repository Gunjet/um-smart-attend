"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QR_ROTATION_MS } from "../_lib/constants";
import { createQrPayload, currentQrTick } from "../_lib/qr";
import { useNow } from "./use-now";

/** Session-ийн QR кодыг 30 секунд тутам шинэчилж, data URL болгоно. */
export function useRotatingQr(sessionId: string | null) {
  const now = useNow();
  const tick = currentQrTick(now);
  const [qr, setQr] = useState<{ key: string; dataUrl: string } | null>(null);
  const key = sessionId && now ? `${sessionId}:${tick}` : null;

  useEffect(() => {
    if (!sessionId || !key) return;
    let cancelled = false;
    QRCode.toDataURL(createQrPayload(sessionId, tick), {
      width: 240,
      margin: 1,
      color: { dark: "#15221f", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then((dataUrl) => {
        if (!cancelled) setQr({ key, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [key, sessionId, tick]);

  const windowSeconds = QR_ROTATION_MS / 1000;
  return {
    // Өмнөх tick-ийн хуучирсан кодыг харуулахгүй.
    dataUrl: qr && qr.key === key ? qr.dataUrl : "",
    secondsLeft: now
      ? windowSeconds - (Math.floor(now / 1000) % windowSeconds)
      : windowSeconds,
  };
}
