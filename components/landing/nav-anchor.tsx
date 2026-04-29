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
  return (
    <a href={`#${sectionId}`} className={className}>
      {children}
    </a>
  );
}
