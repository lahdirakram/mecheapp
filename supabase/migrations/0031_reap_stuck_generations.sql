-- Filet de sécurité pour la seule fenêtre que 0030 ne peut pas fermer.
--
-- 0030 a déplacé la réservation du crédit juste avant l'appel Gemini : tout ce qui précède est
-- gratuit, et toute EXCEPTION après la réservation est rattrapée par le catch de la tâche de fond,
-- qui rembourse. Reste un cas que rien ne peut rattraper côté applicatif : le worker TUÉ (limite
-- mémoire ou CPU) entre le débit et la fin du travail. Aucun catch ne s'exécute, donc le crédit
-- reste débité et la ligne reste en 'pending' pour toujours.
--
-- Ce que 0030 a rendu possible : cet orphelin est désormais IDENTIFIABLE. La ligne `generations`
-- existe déjà (elle est écrite avant la réservation), et le débit porte `external_id =
-- 'gen:<id>'`. Avant, un débit de génération portait NULL et ne pointait sur rien — impossible d'en
-- retrouver un seul par requête.
--
-- ── Pourquoi SUPPRIMER le débit plutôt qu'écrire un +1 compensatoire ────────────────────────────
-- Tentant, parce qu'un ledger append-only garde la trace. Mais `generate` REJOUE le ledger pour
-- séparer les crédits gratuits des crédits achetés, et sa boucle ne compte comme PAYÉ que
-- 'purchase' et 'admin_grant' (0029) ; tout autre `delta > 0` tombe dans le pot GRATUIT. Un +1
-- compensatoire sous une nouvelle raison ('refund'…) transformerait donc silencieusement un crédit
-- ACHETÉ remboursé en crédit gratuit, et ferait retomber l'utilisateur sous les plafonds réservés
-- au gratuit (et sous l'aperçu flouté de 0026). Réutiliser 'admin_grant' classerait bien le crédit,
-- mais mentirait sur l'évènement : personne n'a fait de geste commercial ici, on annule un débit
-- qui n'aurait jamais dû exister. La suppression est aussi ce que font déjà generate et unlock
-- quand ils remboursent : on reste cohérent avec le reste du code.
--
-- Si un jour on veut vraiment la trace, la bonne forme est une raison dédiée AJOUTÉE aux deux
-- rejeux (ici `generate` ET `useCreditSummary` dans packages/api-client/src/queries.ts, qui doivent
-- rester en phase), pas un +1 discret sous une raison existante.
--
-- ── Le seuil : 10 minutes ──────────────────────────────────────────────────────────────────────
-- Mesuré en prod sur les 60 générations réussies (delta entre `generations.created_at` et le
-- `created_at` de l'objet résultat dans storage) : min 7,5 s, p50 10,5 s, p90 13,4 s, p99 15,5 s,
-- max 15,9 s. Le retry unique de generate peut doubler ça (~32 s), et la durée de vie du worker
-- Edge plafonne l'ensemble bien avant la minute. 10 minutes, c'est donc plusieurs fois ce plafond
-- dur : une génération VIVANTE ne peut pas être fauchée. Ne pas descendre ce seuil sous la minute
-- en croyant « rembourser plus vite » — on rembourserait des générations en cours, et l'utilisateur
-- verrait son essai échouer alors qu'il allait aboutir.
create or replace function private.reap_stuck_generations(p_older_than interval default interval '10 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  -- Le `where status = 'pending'` du UPDATE est le garde-fou : seules les lignes réellement
  -- basculées par CE passage sont retournées, donc on ne supprime jamais le débit d'une génération
  -- qu'un worker aurait terminée entre le select et le update.
  with reaped as (
    update public.generations
       set status = 'failed',
           error  = 'reaped: worker died before completion'
     where status = 'pending'
       and created_at < now() - p_older_than
    returning id
  ),
  refunded as (
    delete from public.credit_transactions ct
     using reaped r
     where ct.external_id = 'gen:' || r.id
    returning ct.id
  )
  select count(*) into v_n from reaped;
  return v_n;
end;
$$;
revoke all on function private.reap_stuck_generations(interval) from public, anon, authenticated;
grant execute on function private.reap_stuck_generations(interval) to service_role;

-- Toutes les 5 minutes, et non une fois par nuit comme les deux autres jobs (0024, 0025) : ceux-là
-- font du ménage, celui-ci rend de l'argent. Faire attendre jusqu'à 4h du matin quelqu'un dont
-- l'essai est mort à 18h52 est le comportement qu'on vient de corriger. Attente maximale ici :
-- 10 min de seuil + 5 min de battement.
--
-- NOTE : ce job ne peut pas envoyer de push (c'est du SQL). L'utilisateur voit sa carte « échec »
-- à la prochaine ouverture, avec son crédit rendu, mais n'est pas notifié. Le chemin normal
-- (exception attrapée dans generate) notifie, lui.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron indisponible : private.reap_stuck_generations a planifier manuellement';
    return;
  end if;

  create extension if not exists pg_cron;

  -- cron.schedule met à jour le job s'il existe déjà sous ce nom, donc rejouer la migration est sûr.
  perform cron.schedule(
    'reap-stuck-generations',
    '*/5 * * * *',
    $job$ select private.reap_stuck_generations(); $job$
  );
end $$;
