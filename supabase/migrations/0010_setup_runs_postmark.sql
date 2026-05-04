-- Migration: add postmark_server_id to setup_runs
-- Corresponds to feat/postmark-backend.
-- Existing Brevo-related columns are kept deprecated — remove after 30 days
-- of successful Postmark production traffic.

ALTER TABLE setup_runs
  ADD COLUMN IF NOT EXISTS postmark_server_id integer;

COMMENT ON COLUMN setup_runs.postmark_server_id IS
  'Postmark Server ID for this customer tenant. NULL for Brevo-backend runs.';
