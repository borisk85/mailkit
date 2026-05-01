import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function isProtectedAppRoute(pathname: string): boolean {
  // localePrefix: "never" — routes have no locale segment in the URL
  if (pathname === "/app" || pathname.startsWith("/app/")) return true;
  // Keep locale-prefixed variant for safety during any future migration
  return routing.locales.some(
    (l) => pathname === `/${l}/app` || pathname.startsWith(`/${l}/app/`),
  );
}

function isMockPreviewAllowed(request: NextRequest): boolean {
  // Non-prod only: hard-disable in VERCEL_ENV=production (prod alias + custom
  // domain) and also in standalone NODE_ENV=production without VERCEL_ENV.
  const isVercelProd = process.env.VERCEL_ENV === "production";
  const isBareProd =
    process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV;
  if (isVercelProd || isBareProd) return false;
  return request.nextUrl.searchParams.has("mock");
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAppRoute(pathname)) {
    return intlMiddleware(request);
  }

  // Wizard mock-state preview bypass — non-prod only. Downstream layout reads
  // the x-mailkit-mock header and renders a stub user instead of calling
  // Supabase auth.getUser() / redirect.
  if (isMockPreviewAllowed(request)) {
    const bypass = NextResponse.next({ request });
    bypass.headers.set("x-mailkit-mock", "1");
    request.headers.set("x-mailkit-mock", "1");
    return bypass;
  }

  // Refresh session cookies on the response and enforce auth for /{locale}/app/*.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
