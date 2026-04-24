"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * Wrapper around next-themes so the `app/[locale]/layout.tsx` server
 * component can mount client-side theme handling without carrying the
 * "use client" boundary itself. Defaults per
 * docs/LANDING_SPEC_V1.md section 9.1 (dark-mode primary, light
 * available, system-preference honored as an override via the toggle).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
