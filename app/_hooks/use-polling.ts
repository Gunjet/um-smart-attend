"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * `fetcher`-ийг тогтмол давтамжтай дуудаж сүүлийн утгыг буцаана.
 * `enabled` false бол нэг л удаа дуудна. `reload` нь шууд дахин дуудна.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const next = await fetcherRef.current();
        if (!cancelled) setData(next);
      } catch {
      }
      if (!cancelled && enabled) timer = setTimeout(tick, intervalMs);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, intervalMs, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { data, setData, reload };
}
