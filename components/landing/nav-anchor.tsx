"use client";

import type { ReactNode } from "react";

export function NavAnchor({
  sectionId,
  className,
  children,
}: {
  sectionId: string;
  className?: string;
  children: ReactNode;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${sectionId}`);
    }
  };

  return (
    <a href={`#${sectionId}`} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
