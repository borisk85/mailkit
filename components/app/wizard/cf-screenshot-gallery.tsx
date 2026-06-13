"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

const STEPS = [
  { label: "Open Profile dropdown" },
  { label: "Click API Tokens" },
  { label: "Click Create Token" },
  { label: "Choose Custom token" },
  { label: "Add permissions" },
  { label: "Set Zone Resource" },
  { label: "Review summary" },
  { label: "Copy your token" },
] as const;

interface CfScreenshotGalleryProps {
  /** 0-based inclusive start index into STEPS */
  from?: number;
  /** 0-based inclusive end index into STEPS */
  to?: number;
}

export function CfScreenshotGallery({
  from = 0,
  to = STEPS.length - 1,
}: CfScreenshotGalleryProps) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(from);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // open/close native dialog
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  // close on backdrop click
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) setOpen(false);
  };

  // keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, to));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, from));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIdx(from);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 text-xs text-mk-text-tertiary hover:text-mk-text-secondary underline underline-offset-2 transition-colors"
      >
        View screenshots
        <Images className="size-3" aria-hidden />
      </button>

      {/* Native dialog for a11y / focus trap / Escape handling */}
      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        onClose={() => setOpen(false)}
        className="m-auto max-w-3xl w-[90vw] rounded-xl border border-mk-border-subtle bg-surface-base p-0 shadow-2xl overflow-hidden backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-mk-border-subtle px-5 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-mk-text-tertiary">
                  Step {idx - from + 1} of {to - from + 1}
                </p>
                <p className="text-sm font-medium text-mk-text-primary">
                  {STEPS[idx].label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-mk-text-tertiary hover:bg-mk-border-subtle hover:text-mk-text-primary transition-colors"
                aria-label="Close screenshots"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Image */}
            <div className="relative bg-zinc-50">
              <Image
                src={`/screenshots/cf-token/step-${idx + 1}.webp`}
                alt={STEPS[idx].label}
                width={1265}
                height={800}
                className="w-full rounded-none object-contain"
                priority
              />
            </div>

            {/* Footer navigation */}
            <div className="flex items-center justify-between border-t border-mk-border-subtle px-5 py-3">
              {/* Step dots */}
              <div className="flex gap-1.5">
                {STEPS.slice(from, to + 1).map((_, i) => (
                  <button
                    key={from + i}
                    type="button"
                    onClick={() => setIdx(from + i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`size-2 rounded-full transition-colors ${
                      from + i === idx
                        ? "bg-mk-accent"
                        : "bg-mk-border-subtle hover:bg-mk-text-tertiary"
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIdx((i) => Math.max(i - 1, from))}
                  disabled={idx === from}
                  className="rounded-md border border-mk-border-subtle p-1.5 text-mk-text-secondary transition-colors hover:bg-mk-border-subtle disabled:opacity-30"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIdx((i) => Math.min(i + 1, to))}
                  disabled={idx === to}
                  className="rounded-md border border-mk-border-subtle p-1.5 text-mk-text-secondary transition-colors hover:bg-mk-border-subtle disabled:opacity-30"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
