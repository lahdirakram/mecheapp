-- 0038 — le contenu des suggestions est conservé, et effacé à la suppression du compte.
--
-- Jusqu'ici `suggest_calls` n'était qu'un compteur de rate-limit : suggest/index.ts renvoyait le
-- contenu au client sans jamais le persister, et le backoffice n'affichait qu'une date. On garde
-- désormais ce que l'IA a proposé ({ name, description, reasons, prompt, lang, model }) pour que
-- l'activité du backoffice raconte quelque chose.
--
-- VIE PRIVÉE : une suggestion est dérivée du selfie de la personne (« pourquoi ça VOUS irait »),
-- donc elle suit le même régime que le brief des générations dans le scrub 0035 : à la
-- suppression du compte, la LIGNE reste (un appel Gemini payant, valeur comptable) mais son
-- contenu est vidé. La fonction ci-dessous REMPLACE celle de 0035 avec cette ligne en plus.

alter table public.suggest_calls add column suggestion jsonb;
comment on column public.suggest_calls.suggestion is
  'Contenu renvoyé par l''IA ({ name, description, reasons, prompt, lang, model }). Null = appel d''avant 0038, échec Gemini, ou compte supprimé (scrub 0035/0038).';

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
  -- La ligne (= un appel Gemini payant) reste.
  update public.suggest_calls set suggestion = null where user_id = old.id;

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
