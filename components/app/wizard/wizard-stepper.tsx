"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  label: string;
  sublabel?: string;
}

interface WizardStepperProps {
  currentStep: number; // 1-based
  steps: WizardStep[];
}

/**
 * Horizontal stepper on md+, vertical stack on sm.
 * - Completed: filled circle with checkmark, muted label
 * - Active: filled accent circle with step number, bold label
 * - Future: empty gray circle, muted label
 */
export function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  return (
    <nav aria-label="Setup progress">
      {/* Desktop: horizontal */}
      <ol className="hidden md:flex items-start justify-between w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={stepNumber}
              className={cn(
                "flex-1 flex flex-col items-center relative",
                !isLast && "pr-2",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {/* Connector line (right side, except last) */}
              {!isLast && (
                <div
                  aria-hidden
                  className={cn(
                    "absolute top-4 left-1/2 w-full h-px",
                    isCompleted ? "bg-mk-accent" : "bg-mk-border-subtle",
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-mk-accent bg-mk-accent text-white",
                  isActive && "border-mk-accent bg-mk-accent text-white",
                  isFuture &&
                    "border-mk-border-subtle bg-surface-elevated text-mk-text-tertiary",
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <span
                    className="text-xs font-semibold leading-none"
                    aria-hidden
                  >
                    {stepNumber}
                  </span>
                )}
                <span className="sr-only">
                  Step {stepNumber}: {step.label}
                  {isCompleted && " — completed"}
                  {isActive && " — current"}
                </span>
              </div>

              {/* Labels */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-xs font-semibold leading-tight",
                    isActive && "text-mk-text-primary",
                    isCompleted && "text-mk-text-tertiary",
                    isFuture && "text-mk-text-tertiary",
                  )}
                >
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="mt-0.5 text-[11px] leading-tight text-mk-text-tertiary">
                    {step.sublabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical */}
      <ol className="flex md:hidden flex-col gap-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={stepNumber}
              className="flex items-start gap-3"
              aria-current={isActive ? "step" : undefined}
            >
              {/* Indicator + vertical connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-mk-accent bg-mk-accent text-white",
                    isActive && "border-mk-accent bg-mk-accent text-white",
                    isFuture &&
                      "border-mk-border-subtle bg-surface-elevated text-mk-text-tertiary",
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <span
                      className="text-[11px] font-semibold leading-none"
                      aria-hidden
                    >
                      {stepNumber}
                    </span>
                  )}
                  <span className="sr-only">
                    Step {stepNumber}: {step.label}
                    {isCompleted && " — completed"}
                    {isActive && " — current"}
                  </span>
                </div>
                {!isLast && (
                  <div
                    aria-hidden
                    className={cn(
                      "mt-1 w-px flex-1 min-h-[16px]",
                      isCompleted ? "bg-mk-accent" : "bg-mk-border-subtle",
                    )}
                  />
                )}
              </div>

              {/* Labels */}
              <div className="pb-3">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    isActive && "text-mk-text-primary",
                    (isCompleted || isFuture) && "text-mk-text-tertiary",
                  )}
                >
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="mt-0.5 text-xs leading-tight text-mk-text-tertiary">
                    {step.sublabel}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Canonical 5-step definition for the setup wizard. */
export const WIZARD_STEPS: WizardStep[] = [
  { label: "API Token", sublabel: "Cloudflare credentials" },
  { label: "Your domain", sublabel: "Zone & mailbox" },
  { label: "Automation", sublabel: "DNS configuration" },
  { label: "DKIM verify", sublabel: "Domain verification" },
  { label: "Gmail Send-As", sublabel: "Gmail setup" },
];
