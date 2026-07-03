"use client";

import { useEffect, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Controlled FAQ accordion. Clicking anywhere outside the list
 * collapses whatever is open (Boris: открытый вопрос сворачивается
 * по клику в пустоту). Pointerdown, not click, so it also closes
 * when the outside press starts a drag/scroll.
 */
export function FaqAccordion({
  items,
  className,
}: {
  items: Array<{ id: string; q: string; a: string }>;
  className?: string;
}) {
  const [value, setValue] = useState<unknown[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setValue([]);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef}>
      <Accordion
        className={className}
        value={value}
        onValueChange={(next: unknown[]) => setValue(next)}
      >
        {items.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="mk-hover-lift mk-faq-item rounded-xl border border-mk-border-subtle bg-surface-elevated px-6 py-1 transition-colors hover:bg-surface-elevated/60"
          >
            <AccordionTrigger className="mk-heading-3 text-left text-mk-text-primary">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="mk-body text-mk-text-secondary">
              <p className="max-w-[65ch]">{item.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
