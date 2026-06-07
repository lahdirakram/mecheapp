-- In-app purchase support (RevenueCat → consumable credit packs).

-- Each pack maps to a store product id (the SKU created in App Store Connect / Play Console).
-- The webhook resolves how many credits to grant from this, so store SKUs stay decoupled from
-- our internal pack ids.
alter table credit_packs add column if not exists product_id text;
update credit_packs set product_id = 'meche_credits_' || id where product_id is null;

-- Idempotency key for store-purchase grants: the RevenueCat event id. A unique index means a
-- retried/duplicated webhook can never grant the same purchase twice (insert .. on conflict).
alter table credit_transactions add column if not exists external_id text;
create unique index if not exists credit_tx_external_id_uniq
  on credit_transactions (external_id) where external_id is not null;
