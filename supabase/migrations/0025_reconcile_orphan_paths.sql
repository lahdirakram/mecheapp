-- Annule les chemins de `generations` qui ne pointent plus sur aucun fichier.
--
-- POURQUOI CES LIGNES EXISTENT : supprimer un look retire les fichiers du storage PUIS annule les
-- chemins, et ces deux étapes ne sont pas atomiques (côté client historiquement, par RPC depuis
-- 0021). Une requête interrompue entre les deux laisse une ligne dont selfie_path / result_path
-- ne mènent nulle part. Constaté en prod sur 2 lignes, dont une datant du 14/07, donc bien avant
-- 0021 : le mode de défaillance n'est pas nouveau, 0021 l'a seulement rendu systématique pour les
-- clients restés sur l'ancien bundle (ils suppriment les fichiers, puis leur DELETE est refusé).
--
-- On annule le chemin plutôt que de supprimer la ligne : la ligne reste le reçu du crédit dépensé,
-- c'est tout l'objet de 0021. Après passage, l'essai s'affiche comme « photos supprimées » au lieu
-- d'une image cassée.
--
-- Prudence volontaire : on ne touche QUE les lignes dont le fichier est confirmé absent, et jamais
-- une génération `pending` — celle-ci est peut-être en train d'écrire son résultat.
create or replace function private.reconcile_orphan_paths()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.generations g
     set selfie_path = case
           when g.selfie_path is not null and not exists (
             select 1 from storage.objects o where o.bucket_id = 'selfies' and o.name = g.selfie_path
           ) then null else g.selfie_path end,
         result_path = case
           when g.result_path is not null and not exists (
             select 1 from storage.objects o where o.bucket_id = 'generated' and o.name = g.result_path
           ) then null else g.result_path end
   where g.status <> 'pending'
     and (
       (g.selfie_path is not null and not exists (
          select 1 from storage.objects o where o.bucket_id = 'selfies' and o.name = g.selfie_path))
       or
       (g.result_path is not null and not exists (
          select 1 from storage.objects o where o.bucket_id = 'generated' and o.name = g.result_path))
     );
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function private.reconcile_orphan_paths() from public, anon, authenticated;
grant execute on function private.reconcile_orphan_paths() to service_role;

-- Rattrapage immédiat des lignes déjà orphelines.
select private.reconcile_orphan_paths();

-- Puis en continu, à côté de la purge des marqueurs. Quotidien : ces lignes ne sont pas urgentes,
-- mais laissées en place elles font afficher des images cassées dans le backoffice.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'reconcile-orphan-paths',
      '32 4 * * *',
      $job$ select private.reconcile_orphan_paths(); $job$
    );
  else
    raise notice 'pg_cron absent : reconcile_orphan_paths() a appeler manuellement';
  end if;
end $$;
