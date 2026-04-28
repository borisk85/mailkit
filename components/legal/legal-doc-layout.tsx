/**
 * Legal-doc shell — premium-pass refresh per UI_REVIEW_BRIEF §4 with
 * Design V2 §6 polish (`lede` callout, sticky TOC carry-over).
 *
 * Layout: 720 px column, Last-updated pill, optional plain-language
 * `lede` callout above the formal text (V2 §6.d removes the
 * "wall of legal text" first impression on /terms, /privacy, and
 * /guarantee).
 *
 * The sticky TOC sidebar from V2 §6.a needs the legal source
 * restructured as JSX with anchor IDs — that's a follow-up once the
 * `lib/legal/*.ts` strings move from `whitespace-pre-wrap` plain text
 * into structured headings. Inline `<code>` styling (§6.c) belongs to
 * the same restructure.
 */
export function LegalDocLayout({
  title,
  lastUpdatedLabel,
  lede,
  body,
}: {
  title: string;
  lastUpdatedLabel: string;
  lede?: string;
  body: string;
}) {
  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-5 border-b border-mk-border-subtle pb-10">
        <span className="mk-caption inline-flex w-fit items-center rounded-full border border-mk-border-subtle px-3 py-1 text-mk-text-tertiary">
          {lastUpdatedLabel}
        </span>
        <h1 className="mk-display-2 text-mk-text-primary">{title}</h1>
      </header>

      {lede ? (
        <div className="mt-10 rounded-2xl border border-mk-border-subtle bg-surface-elevated p-6">
          <p
            className="mk-body text-mk-text-primary"
            style={{ lineHeight: "28px" }}
          >
            {lede}
          </p>
        </div>
      ) : null}

      <article
        className="mt-10 whitespace-pre-wrap font-sans text-mk-text-secondary"
        style={{ fontSize: "16px", lineHeight: "28px" }}
      >
        {body}
      </article>
    </main>
  );
}
