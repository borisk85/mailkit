-- #ABUSE-3 — phishing pattern flag on purchases.
-- Set to true when a mailbox name or domain matches a suspicious pattern
-- (reserved names or typosquatting of top brands). Does NOT auto-block;
-- owner reviews flagged purchases manually via Supabase admin.

alter table public.purchases
  add column if not exists kyc_review_required boolean not null default false;

create index if not exists purchases_kyc_review_required_idx
  on public.purchases(kyc_review_required)
  where kyc_review_required = true;
