"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook that returns true when the viewport is below `md` (768px).
 * Used to swap behavior between desktop and mobile (e.g. dialog → sheet, table → card list).
 *
 * On the server and during the first client render, returns `false` to match the desktop
 * default. After mount, it reflects the real viewport and updates on resize.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
