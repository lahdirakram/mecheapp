-- Purge automatique des marqueurs de réinscription, pour tenir la promesse des 12 mois
-- annoncée dans la politique de confidentialité (0023).
--
-- pg_cron est déjà dans shared_preload_libraries sur les projets Supabase (vérifié en prod :
-- Postgres 17.6, pg_cron 1.6.4 disponible), donc il n'y a qu'à créer l'extension.
--
-- BALAYAGE QUOTIDIEN, pas mensuel : la politique annonce 12 mois. Un passage mensuel laisserait
-- vivre un marqueur jusqu'à 12 mois + 30 jours, ce qui dépasserait l'engagement publié. Le coût est
-- négligeable — un DELETE sur une table minuscule.
--
-- Le bloc est conditionnel pour que la migration reste applicable partout : si pg_cron n'est pas
-- disponible (image locale plus ancienne, `supabase db reset` sur un poste), on ne fait pas échouer
-- la migration, la purge reste juste à appeler à la main.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron indisponible : purge de private.signup_marks a planifier manuellement';
    return;
  end if;

  create extension if not exists pg_cron;

  -- cron.schedule met à jour le job s'il existe déjà sous ce nom, donc rejouer la migration est sûr.
  perform cron.schedule(
    'purge-signup-marks',
    '17 4 * * *',                                 -- 04h17 UTC, hors des pics
    $job$ select private.purge_signup_marks(12); $job$
  );
end $$;
