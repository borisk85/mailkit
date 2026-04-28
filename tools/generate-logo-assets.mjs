/**
 * Brand asset generator. Reads the canonical Ideogram envelope mark
 * from `public/brand/mailkit-icon.png`, produces:
 *
 *   - public/favicon/favicon-{32,48,64,96,192,256,384,512}.png
 *     downscaled from the high-res source.
 *   - public/favicon/favicon-16.png — hand-drawn pixel-art envelope
 *     (no flap line, just the silhouette) so the mark stays legible
 *     at 16×16 where the detailed flap blurs into mush.
 *   - public/favicon/apple-touch-icon.png (180×180, full detail).
 *   - public/manifest.json with PWA-size icon references.
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

const SOURCE = "public/brand/mailkit-icon.png";
const FAVICON_DIR = "public/favicon";

const ACCENT = "#7C5CFF";

/**
 * Pixel-art envelope at 16×16 — hand-drawn silhouette without the
 * inner flap line. Drawn as inline SVG so it renders sharp when
 * rasterised at 16×16. Indigo body, white outline matches the
 * Ideogram source visually but stays legible in the tab strip.
 */
const PIXEL_ENVELOPE_SVG = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="16" height="16" rx="3" fill="${ACCENT}"/>
  <rect x="2" y="4" width="12" height="9" fill="white"/>
  <polygon points="2,4 14,4 8,9" fill="${ACCENT}"/>
</svg>`;

async function main() {
  await fs.mkdir(FAVICON_DIR, { recursive: true });
  const src = sharp(SOURCE);
  const meta = await src.metadata();
  console.log(`source: ${SOURCE} ${meta.width}×${meta.height}`);

  const sizes = [32, 48, 64, 96, 192, 256, 384, 512];
  for (const size of sizes) {
    const buf = await sharp(SOURCE)
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

  // apple-touch-icon — full detail, 180×180 standard iOS size.
  const apple = await sharp(SOURCE)
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
