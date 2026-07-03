"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function LogoLink({
  href,
  className,
  style,
  "aria-label": ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e) => {
        // On the landing page the logo just clears any hash and scrolls to
        // the top. On every other page it must navigate home like a normal
        // link — so only intercept when we're already on "/".
        if (window.location.pathname === "/") {
          e.preventDefault();
          history.replaceState(null, "", window.location.pathname);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      {children}
    </Link>
  );
}
