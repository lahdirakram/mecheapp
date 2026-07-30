import 'server-only';
import { query } from '@/lib/db';
import { priceCentsSql } from '@/lib/pricing';

/** Miroir de `Brief` dans supabase/functions/_shared/tryon.ts, plus les champs écrits par l'app. */
export type Brief = {
  lookId?: string;
  lookName?: string;
  prompt?: string;
  length?: number;
  color?: string;
  fringe?: number;
  mood?: string;
};

export type Activity = {
  kind: 'generation' | 'suggestion';
  id: string;
  created_at: string;
  status: string | null;
  match: number | null;
  brief: Brief | null;
  source: string | null;
  selfie_path: string | null;
  result_path: string | null;
  error: string | null;
  look_name: string | null;
  loved: boolean | null;
  total_count: number;
};

/**
 * Timeline d'activité : générations + suggestions, fusionnées et triées par date.
 *
 * Une suggestion n'a QUE sa date : `suggest_calls` (0009_store_hardening.sql:47-53) est un simple
 * compteur pour le rate-limit, et suggest/index.ts:73-74 renvoie le contenu au client sans jamais
 * le persister. D'où les colonnes nulles castées explicitement (les branches d'un UNION doivent
 * avoir des types alignés).
 *
 * Le nom lisible d'une génération vient de `looks` (joint par generation_id) : `brief` ne contient
 * que lookId / prompt / sliders, pas de libellé.
 */
export async function listActivity(userId: string, page: number, size: number) {
  const sql = `
    with act as (
      select
        'generation'::text  as kind,
        g.id,
        g.created_at,
        g.status,
        g.match,
        g.brief,
        g.source::text      as source,
        g.selfie_path,
        g.result_path,
        g.error,
        l.name              as look_name,
        l.loved
      from generations g
      left join lateral (
        select name, loved from looks where generation_id = g.id order by created_at limit 1
      ) l on true
      where g.user_id = $1

      union all

      select
        'suggestion'::text,
        s.id,
        s.created_at,
        null::text,
        null::int,
        null::jsonb,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::boolean
      from suggest_calls s
      where s.user_id = $1
    )
    select *, (count(*) over ())::int as total_count
    from act
    order by created_at desc
    limit $2 offset $3
  `;
  return query<Activity>(sql, [userId, size, (page - 1) * size]);
}

export type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  pack_id: string | null;
  external_id: string | null;
  /** Motif d'un crédit accordé à la main (0029) ; null partout ailleurs. */
  note: string | null;
  amount_cents: number;
  created_at: string;
};

/**
 * Ledger de crédits, affiché à part de la timeline. `amount_cents` n'a de sens que pour
 * reason = 'purchase' (voir la note d'estimation dans lib/pricing.ts).
 */
export function listLedger(userId: string, limit = 100) {
  return query<LedgerRow>(
    `select id, delta, reason, pack_id, external_id, note,
            (case when reason = 'purchase' then ${priceCentsSql()} else 0 end)::int as amount_cents,
            created_at
     from credit_transactions
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit],
  );
}
