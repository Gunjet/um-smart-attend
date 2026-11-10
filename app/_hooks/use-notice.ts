"use client";

import { useCallback, useEffect, useState } from "react";

/** 5 секундын дараа өөрөө алга болдог мэдэгдэл (toast). */
export function useNotice() {
  const [notice, setNotice] = useState("");
  const dismissNotice = useCallback(() => setNotice(""), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return { notice, notify: setNotice, dismissNotice };
}
