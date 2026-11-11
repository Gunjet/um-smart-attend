"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { checkInUrl } from "../_lib/checkin-link";
import type { SessionQr } from "../_lib/dto";
import { getSessionQr } from "../_server/attendance/actions";

/**
 * Серверээс одоогийн QR, 6 оронтой кодыг авч, хугацаа дуусахад дахин авна.
 * Компонентыг session-ээр key хийж ашиглана.
 */
export function useSessionQr(sessionId: string) {
  const [qr, setQr] = useState<(SessionQr & { dataUrl: string }) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const next = await getSessionQr(sessionId);
        if (cancelled || !next) return;
        // Камераар уншуулахад сайт нээгдэж ирц бүртгэх алхам эхэлнэ.
        const dataUrl = await QRCode.toDataURL(
          checkInUrl(window.location.origin, next.payload),
          {
            width: 320,
            margin: 1,
            color: { dark: "#15221f", light: "#ffffff" },
            errorCorrectionLevel: "M",
          },
        );
        if (cancelled) return;
        setQr({ ...next, dataUrl });
        timer = setTimeout(
          load,
          Math.max(1000, next.expiresAt - Date.now() + 250),
        );
      } catch {
        // Сүлжээ тасарвал хэдэн секундын дараа дахин оролдоно.
        if (!cancelled) timer = setTimeout(load, 3000);
      }
    };
    void load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  return qr;
}
