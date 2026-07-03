import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Header section link. Points at `/#section` (not a bare `#section`) so it
 * works from every page: on the landing it just scrolls to the section, and
 * from a subpage like /glossary it navigates home first, then scrolls.
 */
export function NavAnchor({
  sectionId,
  className,
  children,
}: {
  sectionId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/#${sectionId}`} className={className}>
      {children}
    </Link>
  );
}
