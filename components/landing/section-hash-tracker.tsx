"use client";

import { useEffect } from "react";

const SECTION_IDS = ["how-it-works", "pricing", "trust", "faq"];

export function SectionHashTracker() {
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (window.scrollY < 200) {
          history.replaceState(null, "", window.location.pathname);
          ticking = false;
          return;
        }

        let current = "";
        for (const id of SECTION_IDS) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 120) {
            current = id;
          }
        }

        if (current) {
          history.replaceState(null, "", `#${current}`);
        }

        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
