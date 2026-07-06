-- Mèche Pro V1 — "le Studio au fauteuil".
-- Salon fiche fields, a single 'pro' subscription plan (29€/mois, quota mensuel d'essais),
-- the in-chair try-on quota status, and portfolio publishing from the pro app.

-- ─── Salon fiche (edited in the pro app's Salon tab) ─────────────────────────
alter table salons add column if not exists city       text;
alter table salons add column if not exists phone      text;
alter table salons add column if not exists bio        text;
alter table salons add column if not exists hours_text text;   -- free-form ("Mar–Sam · 9h–19h") — structured hours can come later
alter table salons add column if not exists cover_path text;   -- storage path in the public 'portfolio' bucket

-- ─── Single V1 plan ───────────────────────────────────────────────────────────
-- The old design had solo/salon/maison; V1 ships one plan. Added (not replacing) so any
-- existing rows keep their value. NOTE: usable only after this transaction commits (PG rule),
-- which is fine — only the RevenueCat webhook writes it, at runtime.
alter type subscription_plan add value if not exists 'pro';

-- One live subscription row per owner, upserted by the RevenueCat webhook.
create unique index if not exists subscriptions_owner_uniq on subscriptions (owner_id);
alter table subscriptions add column if not exists rc_product_id text;
alter table subscriptions add column if not exists environment   text;
alter table subscriptions add column if not exists updated_at    timestamptz not null default now();

-- ─── Pro quota status (display only — enforcement lives in /generate) ────────
-- lifetime: total try-ons ever (drives the 3 free discovery try-ons).
-- month: try-ons since the 1st (drives the subscription's monthly quota).
create or replace function my_pro_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'lifetime',   (select count(*) from generations where user_id = auth.uid()),
    'month',      (select count(*) from generations where user_id = auth.uid() and created_at >= date_trunc('month', now())),
    'sub_active', coalesce((select s.current_period_end > now() from subscriptions s where s.owner_id = auth.uid()), false),
    'sub_status', (select s.status from subscriptions s where s.owner_id = auth.uid()),
    'period_end', (select s.current_period_end from subscriptions s where s.owner_id = auth.uid())
  );
$$;

-- ─── Portfolio publishing ─────────────────────────────────────────────────────
-- The 'portfolio' bucket (public-read) previously only accepted service-role writes. The pro app
-- publishes a finished try-on (and the salon cover) itself: allow each user to write under a
-- folder named after their uid — same convention as the private 'selfies' bucket.
create policy portfolio_write_own on storage.objects for all
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
