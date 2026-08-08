-- 0040 — registre de consentement : la preuve vit en DB, plus seulement sur le téléphone.
--
-- POURQUOI. Jusqu'ici l'acceptation CGU/confidentialité de l'écran de consentement n'était
-- enregistrée NULLE PART, et le choix pub vivait en AsyncStorage local : aucune preuve opposable
-- (RGPD art. 7.1, la charge de la preuve du consentement est sur nous), et une réinstallation ou
-- un second appareil re-posait la question à quelqu'un qui avait déjà répondu. Ce registre est la
-- source de vérité : l'app interroge la DB pour savoir si l'écran doit s'afficher, le local n'est
-- plus qu'un cache (hors-ligne + démarrage des SDKs avant le réseau).
--
-- FORME. Journal append-only, une ligne par choix exprimé (jamais d'update : retirer son
-- consentement = une NOUVELLE ligne 'denied', l'historique complet est la preuve). L'état courant
-- d'une finalité = la dernière ligne par (user_id, purpose).
--
-- SUPPRESSION DE COMPTE. Les lignes SURVIVENT sous le tombstone profiles (0035) : la preuve du
-- consentement doit rester disponible après la suppression (même régime que le ledger). Aucune
-- colonne n'est du texte libre ni identifiante, donc rien à vider dans le scrub — si une colonne
-- "contenu" s'ajoute un jour, se poser la question du scrub (règle 0038).

create table if not exists consent_events (
  id          uuid primary key default gen_random_uuid(),
  -- Pas de ON DELETE CASCADE : la ligne doit survivre à la suppression du compte, ancrée sur le
  -- tombstone profiles (0035).
  user_id     uuid not null references profiles (id),
  purpose     text not null check (purpose in ('terms', 'privacy', 'ads')),
  status      text not null check (status in ('granted', 'denied')),
  -- Où le choix a été exprimé : l'écran de consentement post-signup, la ligne du profil, ou
  -- 'backfill' = choix trouvé en AsyncStorage sur un appareil d'avant 0040 et migré tel quel
  -- (l'écran ne se réaffiche PAS aux comptes existants ; un local présent prouve qu'ils ont passé
  -- l'écran, dont les cases CGU/privacy obligatoires).
  source      text not null check (source in ('gate', 'profile', 'backfill')),
  platform    text,
  lang        text,
  -- Version du document accepté (terms/privacy) : LEGAL_DOC_VERSION dans apps/meche/lib/legal.ts,
  -- à bumper quand web/site/{fr,en}/{terms,privacy}.html change sur le fond. Null pour 'ads'.
  doc_version text,
  created_at  timestamptz not null default now()
);
alter table consent_events enable row level security;
-- L'app lit "la dernière ligne ads de cet utilisateur" à chaque lancement.
create index if not exists consent_events_user_idx on consent_events (user_id, purpose, created_at desc);

-- Un utilisateur écrit et lit SES lignes, rien d'autre. Pas de policy UPDATE/DELETE : un journal
-- de preuve ne se réécrit pas.
create policy consent_events_insert_own on consent_events
  for insert with check (user_id = auth.uid());
create policy consent_events_select_own on consent_events
  for select using (user_id = auth.uid());

-- Seconde barrière (docs/security-model.md : un grant qui ne tient que par une policy absente est
-- le motif des failles de juillet) : le grant update/delete saute aussi.
revoke update, delete, truncate on consent_events from anon, authenticated;
