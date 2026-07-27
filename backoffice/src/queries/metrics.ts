import 'server-only';
import { queryOne } from '@/lib/db';
import { priceCentsSql } from '@/lib/pricing';
import { ATTEMPT_OK, baseParams, inPeriod, SCOPE_CTE, type Scope } from './filters';

export type Metrics = {
  /** Comptes internes (EXCLUDED_EMAILS) retirés de tout ce qui suit. */
  excluded_count: number;

  /** Comptes du périmètre, toutes périodes : c'est le dénominateur des taux. */
  users_total: number;
  users_b2c: number;
  users_pro: number;
  /** Comptes créés dans la période sélectionnée. */
  users_new: number;
  /** Comptes du périmètre sans aucun essai réussi. */
  users_inactive: number;
  users_tried: number;
  users_sugg: number;

  /** Essais retenus par le filtre de statut (réussis par défaut). */
  gens_shown: number;
  /** Répartition réelle, toujours calculée sans le filtre de statut, pour rester informative. */
  gens_done: number;
  gens_failed: number;
  gens_pending: number;

  sugg_total: number;

  credits_bought: number;
  credits_used: number;
  credits_free: number;
  /** Solde en circulation : un état, donc toujours calculé sur toute l'histoire. */
  credits_left: number;
  orders: number;
  payers: number;
  revenue_cents: number;

  subs_active: number;
};

/**
 * Tous les KPI en un seul aller-retour.
 *
 * Ce que la période filtre : les ÉVÉNEMENTS (essais, suggestions, transactions) et la carte
 * « inscrits ». Ce qu'elle ne filtre pas : le nombre de comptes du périmètre, pour que l'ARPU et
 * les taux de conversion gardent un dénominateur stable et honnête, et `credits_left` qui est un
 * solde courant.
 *
 * Notes de comptage :
 * - « crédits consommés » est déjà NET : un essai qui échoue voit sa ligne de réservation SUPPRIMÉE
 *   (generate/index.ts:329,343), pas compensée par un +1.
 * - « crédits offerts » = tout delta positif dont la raison n'est pas 'purchase' : 'free_trial'
 *   (1 à l'inscription, 0001_init.sql:238) et toute future récompense pub / promo.
 */
const SQL = `
with
${SCOPE_CTE},
x as (
  select (count(*))::int as excluded_count from profiles where id in (select id from excl)
),
u as (
  select
    (count(*))::int                                                              as users_total,
    (count(*) filter (where role::text = 'b2c'))::int                            as users_b2c,
    (count(*) filter (where role::text = 'pro'))::int                            as users_pro,
    (count(*) filter (where ${inPeriod('created_at')}))::int                      as users_new,
    (count(*) filter (where id not in (select user_id from activated)))::int      as users_inactive
  from scope
),
g as (
  select
    (count(*) filter (where ${ATTEMPT_OK}))::int          as gens_shown,
    (count(*) filter (where status = 'done'))::int        as gens_done,
    (count(*) filter (where status = 'failed'))::int      as gens_failed,
    (count(*) filter (where status = 'pending'))::int     as gens_pending,
    (count(distinct user_id) filter (where ${ATTEMPT_OK}))::int as users_tried
  from generations
  where user_id in (select id from scope) and ${inPeriod('created_at')}
),
s as (
  select
    (count(*))::int                as sugg_total,
    (count(distinct user_id))::int as users_sugg
  from suggest_calls
  where user_id in (select id from scope) and ${inPeriod('created_at')}
),
c as (
  select
    (coalesce(sum(delta) filter (where reason = 'purchase'), 0))::int                     as credits_bought,
    (coalesce(-sum(delta) filter (where delta < 0), 0))::int                              as credits_used,
    (coalesce(sum(delta) filter (where delta > 0 and reason <> 'purchase'), 0))::int       as credits_free,
    (count(*) filter (where reason = 'purchase'))::int                                    as orders,
    (count(distinct user_id) filter (where reason = 'purchase'))::int                     as payers,
    (coalesce(sum(${priceCentsSql()}) filter (where reason = 'purchase'), 0))::int         as revenue_cents
  from credit_transactions
  where user_id in (select id from scope) and ${inPeriod('created_at')}
),
cl as (
  select (coalesce(sum(delta), 0))::int as credits_left
  from credit_transactions
  where user_id in (select id from scope)
),
sub as (
  select (count(*) filter (where status = 'active'))::int as subs_active
  from subscriptions
  where owner_id in (select id from scope)
)
select * from x, u, g, s, c, cl, sub
`;

export async function getMetrics(scope: Scope): Promise<Metrics> {
  const row = await queryOne<Metrics>(SQL, baseParams(scope));
  if (!row) throw new Error('metrics: aucune ligne renvoyée');
  return row;
}
