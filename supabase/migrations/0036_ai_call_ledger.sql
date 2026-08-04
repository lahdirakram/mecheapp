-- 0036 — ai_calls : le registre EXACT des appels Gemini payants.
--
-- POURQUOI : le backoffice estimait le coût IA en comptant des lignes × un prix unitaire, ce qui
-- ignore les retries (facturés par Google comme n'importe quel appel), les refus (facturés en
-- entrée seulement) et la taille réelle des prompts. Chaque appel sortant écrit désormais UNE
-- ligne ici, avec l'usageMetadata brut renvoyé par Gemini et le coût calculé au tarif du moment
-- de l'appel (voir functions/_shared/aicost.ts). Un retry = deux lignes, comme sur la facture.
--
-- Écrivains : les edge functions `generate` (try_on + refine_normalize) et `suggest`, et le
-- script local `gen-feed.mjs` (kind='feed', user_id null). Tous en service_role ; l'insert est
-- best-effort partout (un échec de journalisation ne doit jamais casser une génération).
--
-- Le client n'a RIEN à faire ici : RLS sans policy + revoke, même modèle que les autres tables
-- verrouillées (docs/security-model.md). Pas de FK vers generations/profiles : ce registre est
-- une trace comptable, il survit à tout (0035 n'y touche pas — il ne contient aucune identité,
-- seulement des ids, des compteurs de tokens et des coûts, même statut que credit_transactions).

create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,                -- null pour le feed (script local, aucun utilisateur)
  generation_id uuid,          -- l'essai concerné (try_on / refine_normalize), null sinon
  kind text not null check (kind in ('try_on', 'refine_normalize', 'suggest', 'feed')),
  model text not null,
  attempt smallint not null default 1,  -- 2 = le retry ; les deux lignes sont facturées
  ok boolean not null,         -- l'appel a produit son résultat (image ou texte)
  error text,                  -- message d'échec, borné côté écrivain
  prompt_tokens int,           -- usageMetadata.promptTokenCount
  output_tokens int,           -- candidatesTokenCount + thoughtsTokenCount
  total_tokens int,
  cost_micro_usd bigint,       -- coût exact en micro-dollars, au tarif du jour de l'appel.
                               -- USD parce que Google facture en USD ; la conversion EUR est
                               -- un choix d'affichage (backoffice/src/lib/pricing.ts).
                               -- null quand l'appel a échoué sans usageMetadata (HTTP non-2xx,
                               -- probablement non facturé).
  usage jsonb                  -- l'usageMetadata brut, pour audit et retarification
);

create index ai_calls_created_idx on public.ai_calls (created_at);
create index ai_calls_user_idx on public.ai_calls (user_id, created_at);
create index ai_calls_gen_idx on public.ai_calls (generation_id);

alter table public.ai_calls enable row level security;
-- Aucune policy : seul service_role (qui contourne RLS) lit et écrit. Le revoke est la ceinture
-- en plus des bretelles, contre un futur qui ajouterait une policy trop large sans y penser.
revoke all on public.ai_calls from anon, authenticated;
