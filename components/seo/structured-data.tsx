/**
 * Server-rendered JSON-LD `<script>` tag. Drops the schema graph into
 * the page's HTML at SSR time so AI crawlers + classic search read
 * it on the initial response without needing to execute JS.
 *
 * The `dangerouslySetInnerHTML` is fine here because the consumer
 * passes a serializable object that we control — never user input.
 * We stringify with `JSON.stringify` (no replacer) which already
 * escapes the dangerous characters (`<` becomes `<` per
 * spec)... except it doesn't always. We hand-replace the known
 * script-injection vectors below to be safe.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
