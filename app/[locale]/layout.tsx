import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CookieConsent } from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

// "latin" + "cyrillic" pre-downloads the glyphs for both EN and RU so
// the EN→RU locale switch renders Cyrillic text in Geist on first
// paint — without the cyrillic subset, Cyrillic glyphs fall back to
// the system sans-serif, and the fallback swap creates a visible
// flash of unstyled content the moment a user toggles to /ru. The
// FOUT was pre-existing but invisible at the old hero's 4xl-5xl
// sizing; etap 1's display-grade 72-80px typography made the metric
// mismatch impossible to miss.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  preload: true,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: [
        { url: "/favicon/favicon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon/favicon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/favicon/favicon-64.png", sizes: "64x64", type: "image/png" },
        {
          url: "/favicon/favicon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/favicon/favicon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: "/favicon/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            {children}
            <CookieConsent />
          </NextIntlClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
