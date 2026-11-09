"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Scanner = { stop: () => Promise<void>; clear: () => void };

/**
 * html5-qrcode-г `elementId` дотор ажиллуулна.
 * `onDecode` true буцаавал уншилтыг зогсооно. Unmount үед камерыг унтраана.
 */
export function useQrScanner(
  elementId: string,
  onDecode: (text: string) => boolean,
) {
  const scannerRef = useRef<Scanner | null>(null);
  const onDecodeRef = useRef(onDecode);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setIsScanning(false);
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      /* камер аль хэдийн зогссон байж болно */
    }
    scanner.clear();
  }, []);

  const start = useCallback(async () => {
    setError("");
    setIsScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(elementId, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (text) => {
          if (onDecodeRef.current(text)) void stop();
        },
        () => undefined,
      );
    } catch {
      scannerRef.current = null;
      setIsScanning(false);
      setError(
        "Камер нээж чадсангүй. Зөвшөөрлөө шалгах эсвэл demo код ашиглана уу.",
      );
    }
  }, [elementId, stop]);

  useEffect(
    () => () => {
      void scannerRef.current?.stop().catch(() => undefined);
    },
    [],
  );

  return { start, stop, isScanning, error };
}
