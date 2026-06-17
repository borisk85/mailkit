import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for the customer's Cloudflare API token at rest.
 *
 * Why this exists: a PAID setup must be able to resume the SMTP/DKIM
 * step in any session without forcing the user to re-paste their token
 * on step 1. To do that the server keeps the token encrypted on the
 * setup_runs row (see migration 0013) and decrypts it only for the
 * authenticated owner of the run.
 *
 * Format: base64(iv) + "." + base64(authTag) + "." + base64(ciphertext).
 * 12-byte IV is the GCM standard; the auth tag makes tampering detectable
 * (decrypt throws on mismatch).
 *
 * Key: `CF_TOKEN_ENC_KEY` — base64 of exactly 32 random bytes. If unset
 * or malformed, encrypt/decrypt no-op to null so the flow degrades to the
 * old client-only (sessionStorage) behavior instead of crashing.
 */
const ALGO = "aes-256-gcm";

function loadKey(): Buffer | null {
  const raw = process.env.CF_TOKEN_ENC_KEY;
  if (!raw) return null;
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    return null;
  }
  return key.length === 32 ? key : null;
}

/**
 * Encrypt a token. Returns null if no usable key is configured — callers
 * store null and the resume simply falls back to asking for the token.
 */
export function encryptToken(plaintext: string): string | null {
  const key = loadKey();
  if (!key || !plaintext) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/**
 * Decrypt a token produced by encryptToken. Returns null on any problem
 * (no key, malformed payload, tampered ciphertext) — never throws, so a
 * bad value just falls back to the re-paste path.
 */
export function decryptToken(
  payload: string | null | undefined,
): string | null {
  const key = loadKey();
  if (!key || !payload) return null;
  const parts = payload.split(".");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const ct = Buffer.from(parts[2], "base64");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}
