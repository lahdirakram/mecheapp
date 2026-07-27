import 'server-only';
import { query, queryOne } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { priceCentsSql } from '@/lib/pricing';
import { ATTEMPT_OK, baseParams, inPeriod, SCOPE_CTE, type Scope } from './filters';

export type UserRow = {
  id: string;
  display_name: string;
  handle: string | null;
  role: 'b2c' | 'pro';
  lang: string;
  created_at: string;
  email: string | null;
  last_sign_in_at: string | null;
  balance: number;
  credits_bought: number;
  revenue_cents: number;
  gens: number;
  suggs: number;
  /** Compte interne (EXCLUDED_EMAILS) : visible ici, mais hors de tous les chiffres. */
  is_excluded: boolean;
  /** Aucun essai réussi, toutes périodes confondues. */
  is_inactive: boolean;
  total_count: number;
};

/**
 * Colonnes triables. ALLOWLIST STRICTE : la clé vient de l'URL, la valeur est interpolée dans le
 * SQL, donc rien d'autre que ces expressions ne peut y entrer.
 */
export const SORTS = {
  created_at: 'created_at',
  email: 'email',
  name: 'display_name',
  gens: 'gens',
  suggs: 'suggs',
  balance: 'balance',
  revenue: 'revenue_cents',
  last_seen: 'last_sign_in_at',
} as const;

export type SortKey = keyof typeof SORTS;
export const isSortKey = (v: string): v is SortKey => v in SORTS;

export type ListParams = {
  q: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  page: number;
  size: number;
};

/**
 * Liste paginée, dans le MÊME périmètre que les métriques (rôle, comptes activés, période, statut
 * des essais) : les cartes du haut et le tableau doivent raconter la même histoire.
 *
 * L'email n'existe que dans `auth.users` (supabase/config.toml:13 n'expose pas le schéma `auth` à
 * l'API Data), d'où la jointure directe — c'est la raison pour laquelle le backoffice parle à
 * Postgres et pas à PostgREST.
 *
 * Le total vient de `count(*) over ()` : la window s'évalue avant le LIMIT, donc elle compte bien
 * toutes les lignes filtrées, pas seulement la page.
 *
 * Les compteurs suivent la période et le filtre de statut, SAUF `balance` : un solde est un état
 * courant, le restreindre à une fenêtre n'aurait aucun sens.
 */
export async function listUsers(scope: Scope, p: ListParams): Promise<UserRow[]> {
  const orderCol = SORTS[p.sort];
  const dir = p.dir === 'asc' ? 'asc' : 'desc';

  const sql = `
    with
    ${SCOPE_CTE}
    select
      pr.id,
      pr.display_name,
      pr.handle,
      pr.role::text                            as role,
      pr.lang,
      pr.created_at,
      u.email,
      u.last_sign_in_at,
      (coalesce(bal.balance, 0))::int          as balance,
      (coalesce(ct.bought, 0))::int            as credits_bought,
      (coalesce(ct.revenue_cents, 0))::int     as revenue_cents,
      (coalesce(gg.gens, 0))::int              as gens,
      (coalesce(sg.suggs, 0))::int             as suggs,
      -- Marqués, pas masqués : ces comptes restent consultables, ils sont juste hors des chiffres.
      coalesce(lower(u.email) = any($1::text[]), false) as is_excluded,
      (pr.id not in (select user_id from activated))     as is_inactive,
      (count(*) over ())::int                  as total_count
    from profiles pr
    join scope sc on sc.id = pr.id
    left join auth.users u on u.id = pr.id
    left join (
      select user_id, sum(delta) as balance from credit_transactions group by user_id
    ) bal on bal.user_id = pr.id
    left join (
      select
        user_id,
        sum(delta) filter (where reason = 'purchase')                  as bought,
        sum(${priceCentsSql()}) filter (where reason = 'purchase')      as revenue_cents
      from credit_transactions
      where ${inPeriod('created_at')}
      group by user_id
    ) ct on ct.user_id = pr.id
    left join (
      select user_id, count(*) as gens from generations
      where ${ATTEMPT_OK} and ${inPeriod('created_at')}
      group by user_id
    ) gg on gg.user_id = pr.id
    left join (
      select user_id, count(*) as suggs from suggest_calls
      where ${inPeriod('created_at')}
      group by user_id
    ) sg on sg.user_id = pr.id
    where (
      $6 = ''
      or pr.display_name ilike '%' || $6 || '%'
      or pr.handle       ilike '%' || $6 || '%'
      or u.email         ilike '%' || $6 || '%'
      or pr.id::text     ilike $6 || '%'
    )
    order by ${orderCol} ${dir} nulls last, pr.created_at desc
    limit $7 offset $8
  `;

  return query<UserRow>(sql, [
    ...baseParams(scope),
    p.q,
    p.size,
    (p.page - 1) * p.size,
  ]);
}

export type UserDetail = {
  id: string;
  display_name: string;
  handle: string | null;
  role: 'b2c' | 'pro';
  lang: string;
  member_since: string;
  created_at: string;
  email: string | null;
  phone: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string | null;
  provider: string | null;
  balance: number;
  credits_bought: number;
  credits_free: number;
  credits_used: number;
  revenue_cents: number;
  orders: number;
  gens_total: number;
  gens_done: number;
  gens_failed: number;
  gens_pending: number;
  suggs: number;
  looks: number;
  is_excluded: boolean;
};

export async function getUser(id: string): Promise<UserDetail | null> {
  const sql = `
    select
      pr.id,
      pr.display_name,
      pr.handle,
      pr.role::text                       as role,
      pr.lang,
      pr.member_since,
      pr.created_at,
      u.email,
      u.phone,
      u.email_confirmed_at,
      u.last_sign_in_at,
      u.created_at                        as auth_created_at,
      u.raw_app_meta_data ->> 'provider'  as provider,
      (select coalesce(sum(delta), 0) from credit_transactions where user_id = pr.id)::int                                        as balance,
      (select coalesce(sum(delta), 0) from credit_transactions where user_id = pr.id and reason = 'purchase')::int                 as credits_bought,
      (select coalesce(sum(delta), 0) from credit_transactions where user_id = pr.id and delta > 0 and reason <> 'purchase')::int  as credits_free,
      (select coalesce(-sum(delta), 0) from credit_transactions where user_id = pr.id and delta < 0)::int                          as credits_used,
      (select coalesce(sum(${priceCentsSql()}), 0) from credit_transactions where user_id = pr.id and reason = 'purchase')::int    as revenue_cents,
      (select count(*) from credit_transactions where user_id = pr.id and reason = 'purchase')::int                                as orders,
      (select count(*) from generations where user_id = pr.id)::int                                                               as gens_total,
      (select count(*) from generations where user_id = pr.id and status = 'done')::int                                            as gens_done,
      (select count(*) from generations where user_id = pr.id and status = 'failed')::int                                          as gens_failed,
      (select count(*) from generations where user_id = pr.id and status = 'pending')::int                                         as gens_pending,
      (select count(*) from suggest_calls where user_id = pr.id)::int                                                             as suggs,
      (select count(*) from looks where user_id = pr.id)::int                                                                     as looks,
      coalesce(lower(u.email) = any($2::text[]), false)                                                                           as is_excluded
    from profiles pr
    left join auth.users u on u.id = pr.id
    where pr.id = $1
  `;
  return queryOne<UserDetail>(sql, [id, getEnv().excludedEmails]);
}

export type Device = { platform: string | null; created_at: string };

export function getDevices(id: string) {
  return query<Device>(
    `select platform, created_at from devices where user_id = $1 order by created_at desc`,
    [id],
  );
}

export type Subscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  rc_product_id: string | null;
  environment: string | null;
  created_at: string;
  updated_at: string | null;
};

/** Pro seulement (0016_pro_v1.sql). La table est clé sur owner_id, pas user_id. */
export function getSubscription(id: string) {
  return queryOne<Subscription>(
    `select plan::text as plan, status, current_period_end, rc_product_id, environment, created_at, updated_at
     from subscriptions where owner_id = $1`,
    [id],
  );
}
