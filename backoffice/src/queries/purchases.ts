import 'server-only';
import { query } from '@/lib/db';
import { priceCentsSql } from '@/lib/pricing';
import { ATTEMPT_OK, baseParams, inPeriod, SCOPE_CTE, type Scope } from './filters';

export type PurchaseRow = {
  id: string;
  created_at: string;
  delta: number;
  reason: 'purchase' | 'refund';
  pack_id: string | null;
  external_id: string | null;
  /** Estimation catalogue (EUR), le seul montant possible pour les achats d'avant 0039. */
  est_cents: number;
  /** Montants exacts du webhook (iap_events, 0039). Null = achat d'avant le registre. */
  price_usd: number | null;
  price_local: number | null;
  currency: string | null;
  store: string | null;
  environment: string | null;
  user_id: string;
  user_name: string;
  user_handle: string | null;
  user_email: string | null;
  user_created_at: string;
  user_deleted_at: string | null;
  /** Profil de l'acheteur au moment de la lecture : états courants, pas bornés à la période. */
  user_balance: number;
  user_gens: number;
  user_orders: number;
  total_count: number;
};

/**
 * Le journal des achats, du plus récent au plus ancien : une ligne par mouvement d'argent du
 * ledger (`reason` 'purchase' ou 'refund' — un remboursement et son annulation sont des lignes
 * 'refund' de signe opposé), avec l'acheteur et son profil à côté du montant.
 *
 * Le montant vient d'iap_events quand la ligne est couverte (pont external_id = event_id, préfixe
 * refund retiré comme dans listLedger) : c'est ce que la personne a réellement payé, devise
 * comprise, avec l'environnement (un achat SANDBOX crédite mais ne rapporte rien). Les achats
 * d'avant le registre retombent sur l'estimation catalogue, marquée comme telle.
 *
 * Les stats de l'acheteur sont des états COURANTS (solde, essais, nombre d'achats sur toute
 * l'histoire) : elles décrivent qui achète, pas la période filtrée. Seule la liste des lignes
 * suit la période et le périmètre de comptes de la barre de filtres.
 */
export async function listPurchases(
  scope: Scope,
  p: { page: number; size: number },
): Promise<PurchaseRow[]> {
  const sql = `
    with
    ${SCOPE_CTE}
    select
      ct.id,
      ct.created_at,
      ct.delta,
      ct.reason,
      ct.pack_id,
      ct.external_id,
      (${priceCentsSql('ct.pack_id')})::int as est_cents,
      (ie.price_usd)::float8   as price_usd,
      (ie.price_local)::float8 as price_local,
      ie.currency,
      ie.store,
      ie.environment,
      pr.id            as user_id,
      pr.display_name  as user_name,
      pr.handle        as user_handle,
      u.email          as user_email,
      pr.created_at    as user_created_at,
      pr.deleted_at    as user_deleted_at,
      (coalesce(st.balance, 0))::int as user_balance,
      (coalesce(st.orders, 0))::int  as user_orders,
      (coalesce(gg.gens, 0))::int    as user_gens,
      (count(*) over ())::int        as total_count
    from credit_transactions ct
    join scope sc on sc.id = ct.user_id
    join profiles pr on pr.id = ct.user_id
    left join auth.users u on u.id = pr.id
    left join iap_events ie
      on ie.event_id = regexp_replace(ct.external_id, '^refund(-reversed)?:', '')
    left join lateral (
      select sum(delta) as balance, count(*) filter (where reason = 'purchase') as orders
      from credit_transactions where user_id = ct.user_id
    ) st on true
    left join lateral (
      select count(*) as gens from generations where user_id = ct.user_id and ${ATTEMPT_OK}
    ) gg on true
    where ct.reason in ('purchase', 'refund') and ${inPeriod('ct.created_at')}
    order by ct.created_at desc
    limit $6 offset $7
  `;
  return query<PurchaseRow>(sql, [...baseParams(scope), p.size, (p.page - 1) * p.size]);
}
