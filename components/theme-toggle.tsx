"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Minimal theme toggle — vanilla Button + Sun/Moon icons, flips between
 * "dark" and "light" via next-themes. Dialog is overkill for a binary
 * switch; DropdownMenu reserved for the locale picker which has 2+
 * real options.
 *
 * Both icons render side-by-side; CSS rotate+scale driven by the `dark`
 * class on `<html>` decides which one is visible. No mounted-gate
 * needed — the visible icon is a pure CSS consequence of the class
 * attribute, which next-themes applies before hydration via its inline
 * script, so SSR/CSR stay aligned.
 */
export function ThemeToggle() {
  const t = useTranslations("landing.header.themeToggle");
  const { resolvedTheme, setTheme } = useTheme();
  const nextMode = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={nextMode === "light" ? t("switchToLight") : t("switchToDark")}
      suppressHydrationWarning
      onClick={() => setTheme(nextMode)}
      className="relative size-9"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
