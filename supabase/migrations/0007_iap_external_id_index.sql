-- The partial unique index from 0006 can't serve as an ON CONFLICT target via PostgREST
-- (upsert), which the iap-webhook relies on for idempotent grants. Replace it with a plain
-- unique index. Postgres treats NULLs as distinct, so rows without an external_id (free_trial /
-- generation) are still unconstrained.
drop index if exists credit_tx_external_id_uniq;
create unique index if not exists credit_tx_external_id_uniq
  on credit_transactions (external_id);
