/**
 * Inline-SVG MailKit envelope mark — handcrafted to match the
 * Ideogram lockup (`public/brand/mailkit-logo-full.png`) so the
 * raster icon used in V1 (`mailkit-icon.png`) can step aside in the
 * header and app-header per Design V2 §2.3.
 *
 * Pure SVG, scales to any size. Default 24 px when inserted with
 * `className="size-6"`. Keep the SVG output identical to
 * `public/brand/mailkit-icon.svg` — that file feeds favicon
 * generation and OG image use; this component feeds the React tree.
 *
 * Decorative inside lockups carrying their own aria-label, so the
 * SVG itself is `aria-hidden`.
 */
export function MailkitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-hidden>
      <defs>
        <linearGradient id="mk-icon-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6B4FE6" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="14"
        width="52"
        height="36"
        rx="6"
        fill="url(#mk-icon-grad)"
      />
      <path
        d="M9 18.5 L32 35 L55 18.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 49.5 L25 35 M55 49.5 L39 35"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
