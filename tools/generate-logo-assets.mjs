/**
 * Brand asset generator. Reads the canonical Ideogram horizontal
 * lockup `public/brand/mailkit-logo-full.png`, auto-detects the
 * envelope sub-image via alpha bounding-box, re-cuts a clean square
 * `public/brand/mailkit-icon.png`, and produces:
 *
 *   - public/favicon/favicon-{32,48,64,96,192,256,384,512}.png
 *     downscaled from the high-res icon.
 *   - public/favicon/favicon-16.png — hand-drawn pixel-art envelope
 *     (no flap line, just the silhouette) so the mark stays legible
 *     at 16×16 where the detailed flap blurs into mush.
 *   - public/favicon/apple-touch-icon.png (180×180, full detail).
 *   - public/manifest.json with PWA-size icon references.
 *
 * The earlier version (pre-2026-04-28) extracted the icon as a naive
 * left-edge square equal to the trimmed full-logo's height — that
 * pulled in the empty padding above/below the envelope and clipped
 * the envelope's right edge in the process. The header on prod was
 * showing a half-cropped envelope as a result. The alpha-bbox skim
 * below finds exactly the envelope's pixels and ignores the gap and
 * the wordmark to its right.
 *
 * favicon.ico (multi-size 16/32/48 embedded) is produced by the
 * `to-ico` package — install separately and run the ICO step at the
 * bottom if/when the package is added. Until then layout metadata
 * references PNG variants directly, which Chrome/Safari/Firefox all
 * support.
 *
 * Run manually: `node tools/generate-logo-assets.mjs`. Re-run only
 * when the envelope source changes — outputs are committed.
 *
 * Two-tier strategy per UI_REVIEW_BRIEF §7.5: small-size (≤16px)
 * gets a simplified pixel-art version, larger sizes get clean
 * downscale from the full-detail source.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const FULL_LOGO = "public/brand/mailkit-logo-full.png";
const ICON_OUT = "public/brand/mailkit-icon.png";
const ICON_SIZE = 256;
const ICON_PADDING = 16;

const FAVICON_DIR = "public/favicon";
const ACCENT = "#7C5CFF";

/**
 * Pixel-art envelope at 16×16 — hand-drawn silhouette designed per
 * Design V2 §2.4. Solid `#7C5CFF` rounded rectangle (14×11 with 1px
 * side padding, 2px top/bottom), white diagonal flap-line on the
 * upper triangle only, no internal detail. Hard pixel edges
 * (`shape-rendering="crispEdges"`) so the mark stays a recognisable
 * envelope — not a fuzzy purple square — in browser tab strips.
 */
const PIXEL_ENVELOPE_SVG = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="1" y="2" width="14" height="11" rx="2" fill="${ACCENT}"/>
  <path d="M2 4 L8 8 L14 4" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
</svg>`;

const ALPHA_THRESHOLD = 24;

/**
 * Scan the full lockup pixel-by-pixel to find the envelope's
 * bounding box. Strategy:
 *   1. Find first column from the left with any opaque pixel.
 *   2. Walk right while columns remain opaque; stop at the first
 *      gap of ≥8 fully-empty columns (separates icon from wordmark).
 *   3. Within that column range, find topmost / bottommost opaque
 *      rows.
 */
async function findEnvelopeBbox(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const columnHasOpaque = (x) => {
    for (let y = 0; y < H; y++) {
      if (data[(y * W + x) * C + 3] > ALPHA_THRESHOLD) return true;
    }
    return false;
  };

  let left = 0;
  while (left < W && !columnHasOpaque(left)) left++;
  if (left === W) throw new Error("full-logo source is fully transparent");

  let right = left;
  let gap = 0;
  for (let x = left; x < W; x++) {
    if (columnHasOpaque(x)) {
      right = x;
      gap = 0;
    } else if (++gap >= 8) {
      break;
    }
  }

  let top = H;
  let bottom = 0;
  for (let y = 0; y < H; y++) {
    for (let x = left; x <= right; x++) {
      if (data[(y * W + x) * C + 3] > ALPHA_THRESHOLD) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        break;
      }
    }
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

async function buildIcon() {
  const bbox = await findEnvelopeBbox(FULL_LOGO);
  console.log(
    `  envelope bbox: left=${bbox.left} top=${bbox.top} ${bbox.width}×${bbox.height}`,
  );

  const cropped = await sharp(FULL_LOGO)
    .extract(bbox)
    .png()
    .toBuffer();

  const side = Math.max(bbox.width, bbox.height) + ICON_PADDING * 2;
  const offsetLeft = Math.floor((side - bbox.width) / 2);
  const offsetTop = Math.floor((side - bbox.height) / 2);

  const padded = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: offsetLeft, top: offsetTop }])
    .png()
    .toBuffer();

  await sharp(padded)
    .resize(ICON_SIZE, ICON_SIZE, { fit: "contain" })
    .png()
    .toFile(ICON_OUT);
  console.log(`  wrote ${ICON_OUT} (${ICON_SIZE}×${ICON_SIZE})`);
}

async function main() {
  await fs.mkdir(FAVICON_DIR, { recursive: true });

  console.log(`source: ${FULL_LOGO}`);
  await buildIcon();

  const sizes = [32, 48, 64, 96, 192, 256, 384, 512];
  for (const size of sizes) {
    const buf = await sharp(ICON_OUT)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const target = path.join(FAVICON_DIR, `favicon-${size}.png`);
    await fs.writeFile(target, buf);
    console.log(`  wrote ${target}`);
  }

  // 16×16 pixel-art override — bypass the source so the flap line
  // doesn't blur into a single purple square.
  const pixelBuf = await sharp(Buffer.from(PIXEL_ENVELOPE_SVG))
    .resize(16, 16)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(FAVICON_DIR, "favicon-16.png"), pixelBuf);
  console.log(`  wrote ${path.join(FAVICON_DIR, "favicon-16.png")} (pixel-art)`);

  const apple = await sharp(ICON_OUT)
    .resize(180, 180, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(FAVICON_DIR, "apple-touch-icon.png"), apple);
  console.log(`  wrote ${path.join(FAVICON_DIR, "apple-touch-icon.png")}`);

  const manifest = {
    name: "MailKit",
    short_name: "MailKit",
    icons: [
      { src: "/favicon/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon/favicon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/favicon/favicon-384.png", sizes: "384x384", type: "image/png" },
      { src: "/favicon/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: ACCENT,
    background_color: "#0A0A0B",
    display: "standalone",
  };
  await fs.writeFile(
    "public/manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log("  wrote public/manifest.json");

  console.log("done.");
}

await main();
