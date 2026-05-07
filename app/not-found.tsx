import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Root-level 404 — catches URLs outside the [locale] segment,
 * e.g. /ru/*, /ru (old Russian-language pages now discontinued).
 * Uses hardcoded EN strings since there is no locale context here.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="bg-surface-base text-mk-text-primary antialiased">
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "5rem 1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p
            style={{
              fontSize: "4rem",
              fontWeight: 700,
              color: "#6b7280",
              margin: 0,
            }}
          >
            404
          </p>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: 0 }}>
            Page not found
          </h1>
          <p
            style={{
              maxWidth: "28rem",
              color: "#6b7280",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            The page you&apos;re looking for doesn&apos;t exist or was moved.
            Russian-language pages were discontinued — try the home page or
            check the FAQ.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              marginTop: "0.5rem",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Link
              href="/en"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#7c5cff",
                color: "white",
                padding: "0.75rem 1.75rem",
                borderRadius: "0.625rem",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "1rem",
              }}
            >
              Back to home
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/en/faq"
              style={{
                color: "#6b7280",
                fontWeight: 500,
                textDecoration: "underline",
                fontSize: "1rem",
              }}
            >
              View FAQ
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
