#!/usr/bin/env node
/**
 * Compress every PNG under docs/ui-review/ in place. Target ≤ 500 KB
 * per file (architect spec) without resizing — design review needs
 * the source pixel size; just kill the PNG bloat from raw rendering.
 *
 * Strategy: sharp's PNG encoder with palette + adaptive filter.
 * Most fullPage Playwright shots compress 5-10× from a 200-500KB
 * raw to a 30-70KB palette-compressed PNG with no perceptible
 * quality loss for desktop UI screenshots.
 *
 * Run: `node scripts/optimize-snapshots.mjs`
 */

import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(process.cwd(), "docs/ui-review");
const TARGET_KB = 500;

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let processed = 0;
let skipped = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for await (const file of walk(ROOT)) {
  if (!file.endsWith(".png")) continue;
  const before = (await stat(file)).size;
  bytesBefore += before;
  // Palette + max compression. Re-encoding even an "already small"
  // file keeps the output deterministic, so a CI re-run produces
  // byte-identical bytes.
  const buf = await sharp(await readFile(file))
    .png({ palette: true, compressionLevel: 9, quality: 90 })
    .toBuffer();
  await writeFile(file, buf);
  bytesAfter += buf.byteLength;
  processed += 1;
  if (buf.byteLength > TARGET_KB * 1024) {
    skipped += 1;
    console.warn(
      `over target: ${path.relative(ROOT, file)} = ${Math.round(
        buf.byteLength / 1024,
      )} KB`,
    );
  }
}

console.log(
  `done: ${processed} files, ` +
    `${(bytesBefore / 1024 / 1024).toFixed(1)} MB → ` +
    `${(bytesAfter / 1024 / 1024).toFixed(1)} MB ` +
    `(${Math.round((1 - bytesAfter / bytesBefore) * 100)}% smaller)`,
);
if (skipped > 0) {
  console.warn(`${skipped} files exceed ${TARGET_KB} KB target`);
}
