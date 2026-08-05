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

  /** Essais ayant réellement atteint l'appel Gemini payant (tout sauf l'échec `no_credits`). */
  gens_billed: number;

  /**
   * Coûts EXACTS depuis le registre ai_calls (0036) : micro-USD sommés depuis l'usageMetadata
   * de chaque appel. Les compteurs *_exact disent combien d'événements sont couverts, pour
   * estimer le reste (l'historique d'avant 0036) au prix unitaire.
   */
  gen_exact_micro_usd: number;
  gens_exact: number;
  gen_retries: number;
  sugg_exact_micro_usd: number;
  sugg_exact: number;
  /** Feed : coût exact porté par gen_meta.cost_micro_usd (survit à copy-feed), estimation sinon. */
  feed_exact_micro_usd: number;
  feed_exact_items: number;
  feed_est_cents: number;

  credits_bought: number;
  credits_used: number;
  credits_free: number;
  /** Accordés à la main depuis une fiche utilisateur (reason 'admin_grant', 0029). */
  credits_granted: number;
  /** Solde en circulation : un état, donc toujours calculé sur toute l'histoire. */
  credits_left: number;
  orders: number;
  payers: number;
  /** Estimation catalogue, RÉDUITE aux achats sans ligne iap_events (l'historique d'avant 0039). */
  revenue_est_cents: number;

  /**
   * L'argent EXACT (registre iap_events, 0039) : ce que le webhook RevenueCat rapporte, en
   * PRODUCTION seulement (le sandbox crédite mais ne rapporte rien). Tout en USD, la devise
   * normalisée de RevenueCat : le dashboard affiche l'USD tel quel, comme les coûts IA.
   */
  rev_exact_usd: number;
  orders_exact: number;
  commission_usd: number;
  tax_usd: number;
  refunds: number;
  refunds_usd: number;
  pro_rev_usd: number;
  pro_payments: number;

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
 * - « crédits offerts » = tout delta positif hors 'purchase' ET hors 'admin_grant' : 'free_trial'
 *   (1 à l'inscription, 0001_init.sql:238) et toute future récompense pub / promo.
 * - « crédits accordés » (admin_grant, 0029) sont comptés à part : ils sont offerts au sens de
 *   l'argent, mais ils comptent comme achetés au sens du produit (ils sortent l'essai du premier
 *   essai verrouillé). Les mélanger aux 'free_trial' cacherait cet écart. Ils n'entrent JAMAIS
 *   dans le CA : c'est tout l'intérêt de leur raison dédiée.
 */
const SQL = `
with
${SCOPE_CTE},
x as (
  select (count(*))::int as excluded_count from profiles where id in (select id from excl)
),
u as (
  -- Un tombstone (compte supprimé, 0035) n'est plus un compte : hors des compteurs de comptes.
  -- Son argent et ses essais restent comptés par c/g/s, qui lisent scope en entier.
  select
    (count(*))::int                                                              as users_total,
    (count(*) filter (where role::text = 'b2c'))::int                            as users_b2c,
    (count(*) filter (where role::text = 'pro'))::int                            as users_pro,
    (count(*) filter (where ${inPeriod('created_at')}))::int                      as users_new,
    (count(*) filter (where id not in (select user_id from activated)))::int      as users_inactive
  from scope
  where deleted_at is null
),
g as (
  select
    (count(*) filter (where ${ATTEMPT_OK}))::int          as gens_shown,
    (count(*) filter (where status = 'done'))::int        as gens_done,
    (count(*) filter (where status = 'failed'))::int      as gens_failed,
    (count(*) filter (where status = 'pending'))::int     as gens_pending,
    (count(distinct user_id) filter (where ${ATTEMPT_OK}))::int as users_tried,
    -- Facturés : tout essai sauf l'échec 'no_credits', seul cas qui s'arrête AVANT l'appel Gemini
    -- (generate/index.ts). Les 'pending' comptent (l'appel est parti), les refus/reaped aussi
    -- (surestimation prudente : un refus est facturé en entrée seulement).
    (count(*) filter (where not (status = 'failed' and error = 'no_credits')))::int as gens_billed
  from generations
  where user_id in (select id from scope) and ${inPeriod('created_at')}
),
-- Le registre exact (0036) : une ligne par appel Gemini sortant, retries et refus compris.
-- Le feed n'y est pas lu (ses lignes restent sur la lane qui a généré, voir le CTE f).
a as (
  select
    (coalesce(sum(cost_micro_usd) filter (where kind in ('try_on', 'refine_normalize')), 0))::float8 as gen_exact_micro_usd,
    (count(distinct generation_id) filter (where kind = 'try_on'))::int                              as gens_exact,
    (count(*) filter (where kind = 'try_on' and attempt > 1))::int                                   as gen_retries,
    (coalesce(sum(cost_micro_usd) filter (where kind = 'suggest'), 0))::float8                       as sugg_exact_micro_usd,
    (count(*) filter (where kind = 'suggest'))::int                                                  as sugg_exact
  from ai_calls
  where kind <> 'feed' and user_id in (select id from scope) and ${inPeriod('created_at')}
),
-- Le feed n'appartient à personne : hors périmètre de comptes, la période s'applique seule.
-- Seuls les items générés (gen_meta non nul) ont coûté ; les items édito à la main sont gratuits.
-- Le coût exact voyage DANS gen_meta (cost_micro_usd, somme des tentatives de l'item) parce que
-- copy-feed.mjs copie les feed_items d'une lane à l'autre mais pas leurs lignes ai_calls.
f as (
  select
    (coalesce(sum((gen_meta->>'cost_micro_usd')::numeric) filter (where gen_meta ? 'cost_micro_usd'), 0))::float8 as feed_exact_micro_usd,
    (count(*) filter (where gen_meta ? 'cost_micro_usd'))::int                                                    as feed_exact_items,
    (coalesce(sum(coalesce((gen_meta->>'cost_eur')::numeric, 0.04)) filter (where not gen_meta ? 'cost_micro_usd'), 0) * 100)::float8 as feed_est_cents
  from feed_items
  where gen_meta is not null and ${inPeriod('created_at')}
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
    (coalesce(sum(delta) filter (where delta > 0 and reason not in ('purchase', 'admin_grant', 'refund')), 0))::int as credits_free,
    (coalesce(sum(delta) filter (where reason = 'admin_grant'), 0))::int                  as credits_granted,
    (count(*) filter (where reason = 'purchase'))::int                                    as orders,
    (count(distinct user_id) filter (where reason = 'purchase'))::int                     as payers,
    -- Estimation catalogue restreinte aux achats SANS ligne iap_events : dès qu'un achat est
    -- couvert par le registre, c'est le montant exact (CTE ie) qui compte, y compris zéro pour
    -- un achat sandbox (qui crédite mais ne rapporte rien).
    (coalesce(sum(${priceCentsSql()}) filter (where reason = 'purchase'
        and not exists (select 1 from iap_events ie2 where ie2.event_id = credit_transactions.external_id)), 0))::int as revenue_est_cents
  from credit_transactions
  where user_id in (select id from scope) and ${inPeriod('created_at')}
),
-- L'argent exact (0039). Un « sale » = achat de pack ou paiement d'abonnement Pro, en PRODUCTION.
-- Tout en USD normalisé RC (event.price / revenue_in_usd.gross) : c'est la devise d'affichage.
ie as (
  select
    (coalesce(sum(price_usd) filter (where sale and kind = 'pack'), 0))::float8                    as rev_exact_usd,
    (count(*) filter (where sale and kind = 'pack'))::int                                          as orders_exact,
    (coalesce(sum(price_usd * coalesce(commission_percentage, 0)) filter (where sale), 0))::float8 as commission_usd,
    (coalesce(sum(price_usd * coalesce(tax_percentage, 0)) filter (where sale), 0))::float8        as tax_usd,
    (count(*) filter (where refund))::int                                                          as refunds,
    (coalesce(sum(abs(coalesce(price_usd, 0))) filter (where refund), 0))::float8                  as refunds_usd,
    (coalesce(sum(price_usd) filter (where sale and kind = 'pro'), 0))::float8                     as pro_rev_usd,
    (count(*) filter (where sale and kind = 'pro'))::int                                           as pro_payments
  from (
    select *,
      case when pack_id is not null then 'pack' when product_id like 'meche_pro%' then 'pro' end as kind,
      environment = 'PRODUCTION'
        and ((type = 'NON_RENEWING_PURCHASE' and pack_id is not null)
          or (type in ('INITIAL_PURCHASE', 'RENEWAL') and product_id like 'meche_pro%')) as sale,
      environment = 'PRODUCTION' and type = 'CANCELLATION' and cancel_reason = 'CUSTOMER_SUPPORT' as refund
    from iap_events
    -- Périmètre : on suit le filtre de comptes quand l'acheteur EXISTE dans profiles ; on garde
    -- toujours l'argent des ids inconnus (comptes emportés par la cascade d'avant 0035, ou id RC
    -- anonyme) : il est réel et n'a aucun profil pour le représenter.
    where (app_user_id is null
           or app_user_id in (select id from scope)
           or app_user_id not in (select id from profiles))
      -- La période se juge à la date d'ACHAT : un backfill (resend RC) arrive aujourd'hui avec
      -- un purchased_at ancien, et doit compter dans son mois réel.
      and ${inPeriod('coalesce(purchased_at, received_at)')}
  ) e
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
select * from x, u, g, a, f, s, c, ie, cl, sub
`;

export async function getMetrics(scope: Scope): Promise<Metrics> {
  const row = await queryOne<Metrics>(SQL, baseParams(scope));
  if (!row) throw new Error('metrics: aucune ligne renvoyée');
  return row;
}
