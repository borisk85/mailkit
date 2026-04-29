"use client";

import { useEffect } from "react";

export function SectionHashTracker() {
  useEffect(() => {
    let ticking = false;
    const base = window.location.pathname + window.location.search;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (window.scrollY < 200) {
          history.replaceState(null, "", base);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
