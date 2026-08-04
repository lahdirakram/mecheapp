-- 0035 — la suppression de compte anonymise au lieu de tout effacer.
--
-- POURQUOI. Le 2026-08-04, un utilisateur a acheté un pack (0,99 €) puis supprimé son compte
-- 18 secondes après le grant : la cascade auth.users → profiles → credit_transactions a emporté la
-- ligne d'achat, et RevenueCat/le backoffice racontaient deux histoires différentes. Le revenu et
-- l'historique d'usage sont des données COMPTABLES : on doit les garder, mais sans pouvoir remonter
-- à l'identité de la personne.
--
-- CE QUI RESTE après suppression (pseudonymisé : uuid sans email, sans nom, sans photo) :
--   credit_transactions (le ledger entier), generations (lignes seules : dates et statuts, chemins
--   d'images annulés, brief vidé car son prompt est du texte libre),
--   suggest_calls (chaque ligne = un appel Gemini payant), subscriptions (état d'abonnement Pro,
--   RevenueCat continue de le tenir à jour via iap-webhook), et une ligne profiles-tombstone
--   (role, lang, created_at, deleted_at) qui sert d'ancre aux FK ci-dessus.
-- CE QUI EST EFFACÉ : l'utilisateur auth (email, mot de passe), display_name et handle du profil,
--   looks, devices (push tokens), feed_events, requests + messages, et tous les fichiers storage
--   (delete-account s'en charge ; une suppression dashboard laisse purge-orphan-media rattraper).
--
-- COMMENT. Même patron que 0023 : un trigger BEFORE DELETE sur auth.users, pour couvrir TOUS les
-- chemins de suppression (fonction edge, dashboard, API admin, SQL). La cascade
-- profiles → auth.users est retirée : c'est elle qui effaçait l'histoire.
--
-- OBLIGATION LIÉE : web/site/{fr,en}/privacy.html promettait « la suppression efface votre
-- historique de crédits » — mis à jour dans le même commit. Les deux doivent bouger ensemble.

-- ── 1. profiles devient l'ancre qui survit ────────────────────────────────────
alter table profiles add column if not exists deleted_at timestamptz;
comment on column profiles.deleted_at is
  'Non nul = compte supprimé, ligne conservée comme ancre pseudonyme du ledger. Invisible client (RLS auth.uid()).';

-- La FK vers auth.users portait le ON DELETE CASCADE qui effaçait tout. Drop dynamique : le nom
-- est profiles_id_fkey sur les deux lanes, mais on ne parie pas dessus.
do $$
declare v record;
begin
  for v in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'f'
      and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.profiles drop constraint %I', v.conname);
  end loop;
end $$;

-- Point ouvert de docs/security-model.md, à saisir « au prochain changement de schéma » : c'est
-- maintenant. Aucune policy DELETE n'existe, mais un grant inutilisé qui ne tient que par une
-- policy absente est le motif exact des failles de juillet.
revoke delete on profiles from authenticated;

-- ── 2. Le scrub, dans un trigger pour couvrir tous les chemins ────────────────
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

-- Second trigger sur le même événement que on_auth_user_deleted (0023, le marqueur d'email) ;
-- ils sont indépendants, l'ordre (alphabétique) est sans importance.
drop trigger if exists on_auth_user_deleted_scrub on auth.users;
create trigger on_auth_user_deleted_scrub
  before delete on auth.users
  for each row execute function private.scrub_deleted_account();
