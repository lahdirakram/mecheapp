-- 0039 — iap_events : le registre EXACT de l'argent, écrit par le webhook RevenueCat.
--
-- POURQUOI. Le webhook ne gardait que { user_id, delta, pack_id, external_id } et JETAIT les
-- montants : le CA du backoffice était une estimation au prix catalogue (brut, EUR supposé,
-- rétroactivement faux au premier repricing), et un remboursement de pack était silencieusement
-- ignoré (l'utilisateur gardait ses crédits). Désormais chaque événement RC est journalisé ici
-- tel quel : prix USD normalisé par RC, prix payé dans la devise réelle, commission store et TVA
-- estimées par RC, environnement (le CA ne compte que PRODUCTION, le sandbox est du test).
--
-- Deux registres, deux rôles : credit_transactions reste la vérité des CRÉDITS (soldes),
-- iap_events devient la vérité de l'ARGENT. Le pont est external_id = event_id.
--
-- Vie privée : les colonnes typées sont comptables (montants, ids) et suivent le régime de
-- credit_transactions (conservées sous tombstone). Le payload brut `event` peut contenir des
-- attributs d'abonné : le scrub 0035 (redéfini ici) le vide à la suppression du compte.

create table public.iap_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_id text not null unique,        -- id d'événement RC : l'idempotence du webhook
  type text not null,                   -- INITIAL_PURCHASE, NON_RENEWING_PURCHASE, CANCELLATION…
  store text,                           -- APP_STORE, PLAY_STORE…
  environment text,                     -- PRODUCTION / SANDBOX
  app_user_id uuid,                     -- notre user id (RC logIn(user.id)) ; null si anonyme
  product_id text,
  pack_id text,                         -- résolu via credit_packs quand c'est un pack
  transaction_id text,
  original_transaction_id text,
  price_usd numeric,                    -- event.price : prix normalisé USD par RC (null si inconnu)
  price_local numeric,                  -- event.price_in_purchased_currency
  currency text,                        -- ISO 4217 de price_local
  tax_percentage numeric,               -- estimation RC (0..1)
  commission_percentage numeric,        -- estimation RC (0..1)
  cancel_reason text,                   -- CUSTOMER_SUPPORT = remboursement, BILLING_ERROR = échec
  purchased_at timestamptz,
  event jsonb                           -- payload brut (audit) ; vidé par le scrub à la suppression
);

create index iap_events_received_idx on public.iap_events (received_at);
create index iap_events_user_idx on public.iap_events (app_user_id, received_at);
create index iap_events_type_idx on public.iap_events (environment, type);

alter table public.iap_events enable row level security;
revoke all on public.iap_events from anon, authenticated;

-- ── Le scrub (0035, déjà redéfini en 0038) apprend iap_events ────────────────
create or replace function private.scrub_deleted_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- L'ancre : on garde la ligne, on retire ce qui identifie.
  update public.profiles
     set display_name = '', handle = null, deleted_at = now()
   where id = old.id;

  -- Personnel, sans valeur comptable : effacé.
  delete from public.looks       where user_id   = old.id;
  delete from public.devices     where user_id   = old.id;
  delete from public.feed_events where user_id   = old.id;
  delete from public.messages    where sender_id = old.id;
  delete from public.requests    where from_user_id = old.id; -- cascade ses messages
  -- Comptable : les lignes restent, les images (déjà effacées du storage par delete-account)
  -- n'ont plus de chemin. Le brief saute aussi : son champ prompt est du texte libre tapé par la
  -- personne, donc potentiellement identifiant. Restent les dates, statuts et compteurs.
  update public.generations
     set selfie_path = null, result_path = null, thumb_path = null, vault_path = null,
         brief = '{}'::jsonb
   where user_id = old.id;
  -- Même régime pour le contenu des suggestions (0038) : dérivé du selfie, donc personnel.
  update public.suggest_calls set suggestion = null where user_id = old.id;
  -- iap_events (0039) : les montants restent (comptable), le payload brut saute (il peut porter
  -- des attributs d'abonné RevenueCat).
  update public.iap_events set event = null where app_user_id = old.id;

  -- Reproduit les ON DELETE SET NULL que la cascade de profiles déclenchait avant 0035.
  update public.bookings set client_user_id = null where client_user_id = old.id;
  update public.salons   set owner_id       = null where owner_id       = old.id;
  update public.stylists set profile_id     = null where profile_id     = old.id;

  return old;
exception when others then
  -- Ne JAMAIS empêcher une suppression de compte (obligation App Store, droit RGPD). Un scrub
  -- partiel laisse des lignes orphelines inaccessibles (RLS), pas une suppression bloquée.
  return old;
end;
$$;
revoke all on function private.scrub_deleted_account() from public, anon, authenticated;
