-- Store the customer's Cloudflare API token encrypted-at-rest on the
-- setup_runs row so a PAID setup can resume the SMTP/DKIM step in any
-- session (fresh tab, different device, after sign-out) without forcing
-- the user back to step 1 to re-paste the token.
--
-- Security posture (see docs/SECURITY.md + privacy policy):
--   - Value is AES-256-GCM ciphertext (lib/crypto/token-cipher.ts), never
--     plaintext — Cloudflare's own guidance forbids plaintext storage.
--   - Written when the run starts; nulled the moment setup completes or
--     fails, so the retention window is minutes/hours, not forever.
--   - The token is zone-scoped, bounding blast radius if the row leaks.
--
-- Forward-only, idempotent.
alter table public.setup_runs
  add column if not exists cf_token_enc text default null;
