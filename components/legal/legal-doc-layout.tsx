/**
 * Legal-doc shell — premium-pass refresh per UI_REVIEW_BRIEF §4.
 * Wraps `/terms`, `/privacy`, and `/guarantee` in a uniform prose
 * layout: 720px content column, mk-tokens, Last-updated pill at the
 * top, soft border on the prose container.
 *
 * The architect's full §4 spec includes a sticky desktop TOC sidebar
 * — that needs the legal source rewritten as structured JSX (the
 * current source is a plain `whitespace-pre-wrap` string from
 * lib/legal/*.ts, no anchor IDs to link to). TOC ships as a follow-up
 * once the legal copy is restructured; the layout is still good for
 * the premium pass.
 */
export function LegalDocLayout({
  title,
  lastUpdatedLabel,
  body,
}: {
  title: string;
  lastUpdatedLabel: string;
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

      <article
        className="mt-10 whitespace-pre-wrap font-sans text-mk-text-secondary"
        style={{ fontSize: "16px", lineHeight: "28px" }}
      >
        {body}
      </article>
    </main>
  );
}
