"use client";

import { useSyncExternalStore } from "react";

/**
 * Бүх компонент нэг л interval хуваалцдаг цагийн store.
 * Server / prerender үед 0 буцаана (Cache Components render үед Date.now()-г хориглодог).
 */
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function emit() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(emit, 1000);
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

/** Секунд тутам шинэчлэгддэг одоогийн цаг (ms). Эхний render-т 0 байна. */
export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
