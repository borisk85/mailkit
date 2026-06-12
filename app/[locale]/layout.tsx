import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";

import { CookieConsent } from "@/components/cookie-consent";
import SupportChatWidgetMount from "@/components/landing/SupportChatWidgetMount";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

const GA_ID = "G-QF9LLRVFR6";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("title");
  const description = t("description");
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: "MailKit",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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
    verification: {
      google: "2DJOEDrL_KTMeO_Vj2VLjVaRZEps5lzNLRZD7SZJSz8",
    },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-init" strategy="lazyOnload">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {analytics_storage: 'denied'});
        gtag('js', new Date());
        gtag('config', '${GA_ID}');
        try {
          var c = window.localStorage.getItem('mailkit-cookie-consent-v1');
          if (c && JSON.parse(c).acceptedAt) {
            gtag('consent', 'update', {analytics_storage: 'granted'});
          }
        } catch(e) {}
      `}</Script>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            {children}
            <CookieConsent />
            <SupportChatWidgetMount />
          </NextIntlClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
