"use client";

import { useEffect } from "react";

export function SectionHashTracker() {
  useEffect(() => {
    let ticking = false;
    let lastHashChange = 0;
    const base = window.location.pathname + window.location.search;

    // Клик по якорю (#pricing и т.п.) меняет hash → запоминаем момент.
    // Без этого: если юзер был наверху и кликнул секцию, плавный скролл к ней
    // на первых кадрах еще проходит зону scrollY<200, и hash стирался бы на лету —
    // ссылка мгновенно схлопывалась в чистый /. Гасим чистку на время анимации.
    const onHashChange = () => {
      lastHashChange = performance.now();
    };
    window.addEventListener("hashchange", onHashChange);

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // чистим только когда юзер реально осел наверху И скролл-анимация к
        // якорю уже завершилась (>1.2с после перехода) — тогда прямые якорные
        // ссылки живут, а «грязь» при возврате на самый верх все равно убирается.
        if (window.scrollY < 200 && performance.now() - lastHashChange > 1200) {
          history.replaceState(null, "", base);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return null;
}
