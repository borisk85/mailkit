"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

// Real Gmail screenshots live in /public/screenshots/gmail/, supplied by the
// owner since capturing them needs a Gmail login. Each wizard sub-step passes
// its OWN screens so step 2 doesn't repeat step 1's navigation shots.
export interface GmailScreen {
  src: string;
  label: string;
}

// Default set = the openSettings navigation (gear → Add another email address).
const DEFAULT_SCREENS: GmailScreen[] = [
  { src: "/screenshots/gmail/step-1.webp", label: "Open Settings (gear)" },
  { src: "/screenshots/gmail/step-2.webp", label: "See all settings" },
  { src: "/screenshots/gmail/step-3.webp", label: "Accounts and Import" },
  { src: "/screenshots/gmail/step-4.webp", label: "Add another email address" },
];

interface GmailScreenshotGalleryProps {
  /** Screens to show. Defaults to the openSettings navigation set. */
  screens?: GmailScreen[];
}

export function GmailScreenshotGallery({
  screens = DEFAULT_SCREENS,
}: GmailScreenshotGalleryProps) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const last = screens.length - 1;

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
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, last));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, last]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIdx(0);
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
                  Step {idx + 1} of {screens.length}
                </p>
                <p className="text-sm font-medium text-mk-text-primary">
                  {screens[idx].label}
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
            <div className="relative bg-surface-elevated-2">
              <Image
                src={screens[idx].src}
                alt={screens[idx].label}
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
                {screens.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`size-2 rounded-full transition-colors ${
                      i === idx
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
                  onClick={() => setIdx((i) => Math.max(i - 1, 0))}
                  disabled={idx === 0}
                  className="rounded-md border border-mk-border-subtle p-1.5 text-mk-text-secondary transition-colors hover:bg-mk-border-subtle disabled:opacity-30"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIdx((i) => Math.min(i + 1, last))}
                  disabled={idx === last}
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
