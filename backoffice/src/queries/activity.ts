import 'server-only';
import { query } from '@/lib/db';
import { priceCentsSql } from '@/lib/pricing';
import { ATTEMPT_OK, baseParams, inPeriod, SCOPE_CTE, type Scope } from './filters';

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

/** Contenu d'une suggestion conservé en base (0038). Null = avant 0038, échec, ou compte scrubé. */
export type SuggestionContent = {
  name?: string;
  description?: string;
  reasons?: string[];
  prompt?: string;
  lang?: string;
  model?: string;
} | null;

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
  suggestion: SuggestionContent;
  /** Coût mesuré (registre ai_calls, 0036), micro-USD, toutes tentatives. Null = pas couvert. */
  cost_micro_usd: number | null;
  total_count: number;
};

/**
 * Coût mesuré d'une génération : somme de SES lignes ai_calls (try_on + normalisation de refine,
 * retries compris). Jointure exacte par generation_id.
 */
const GEN_COST_LATERAL = `
      left join lateral (
        select (sum(cost_micro_usd))::float8 as cost_micro_usd
        from ai_calls where generation_id = g.id
      ) ac on true`;

/**
 * Coût mesuré d'une suggestion : jointure exacte par ai_calls.suggest_call_id (0037 : le RPC de
 * rate-limit renvoie l'id de la ligne qu'il insère, la fonction edge le journalise). Aucune ligne
 * 'suggest' n'a été écrite en prod entre 0036 et 0037, donc pas de repli pour un entre-deux.
 */
const SUGG_COST_LATERAL = `
      left join lateral (
        select (a.cost_micro_usd)::float8 as cost_micro_usd
        from ai_calls a
        where a.suggest_call_id = s.id
        limit 1
      ) ac on true`;

/**
 * Timeline d'activité : générations + suggestions, fusionnées et triées par date.
 *
 * `suggest_calls` est né simple compteur de rate-limit (0009) ; depuis 0038 il porte aussi le
 * contenu proposé (`suggestion` jsonb), vidé par le scrub à la suppression du compte. Les
 * colonnes propres aux générations restent nulles côté suggestion (les branches d'un UNION
 * doivent avoir des types alignés), et inversement.
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
        l.loved,
        null::jsonb         as suggestion,
        ac.cost_micro_usd
      from generations g
      left join lateral (
        select name, loved from looks where generation_id = g.id order by created_at limit 1
      ) l on true
${GEN_COST_LATERAL}
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
        null::boolean,
        s.suggestion,
        ac.cost_micro_usd
      from suggest_calls s
${SUGG_COST_LATERAL}
      where s.user_id = $1
    )
    select *, (count(*) over ())::int as total_count
    from act
    order by created_at desc
    limit $2 offset $3
  `;
  return query<Activity>(sql, [userId, size, (page - 1) * size]);
}

export type GlobalActivity = Activity & {
  user_id: string;
  user_name: string;
  user_handle: string | null;
  user_email: string | null;
};

/** Valeurs revalidées côté serveur : la clé vient de l'URL (onglet Activité du dashboard). */
export type ActivityKind = 'all' | 'generation' | 'suggestion';

/**
 * Activité TOUS comptes confondus, pour l'onglet « Activité » du dashboard. Même forme que
 * `listActivity`, mais bornée par le périmètre de la barre de filtres (internes exclus, rôle,
 * comptes activés, période, statut des essais) : le tableau doit raconter la même histoire que
 * les cartes au-dessus.
 *
 * Le filtre de statut ne s'applique qu'aux générations : une suggestion n'a pas de statut, elle
 * suit seulement la période, comme la carte « Suggestions » des métriques.
 */
export async function listGlobalActivity(
  scope: Scope,
  p: { kind: ActivityKind; page: number; size: number },
): Promise<GlobalActivity[]> {
  const sql = `
    with
    ${SCOPE_CTE},
    act as (
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
        l.loved,
        null::jsonb         as suggestion,
        ac.cost_micro_usd,
        g.user_id
      from generations g
      join scope sc on sc.id = g.user_id
      left join lateral (
        select name, loved from looks where generation_id = g.id order by created_at limit 1
      ) l on true
${GEN_COST_LATERAL}
      where ${ATTEMPT_OK} and ${inPeriod('g.created_at')}

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
        null::boolean,
        s.suggestion,
        ac.cost_micro_usd,
        s.user_id
      from suggest_calls s
      join scope sc on sc.id = s.user_id
${SUGG_COST_LATERAL}
      where ${inPeriod('s.created_at')}
    )
    select
      a.*,
      pr.display_name         as user_name,
      pr.handle               as user_handle,
      u.email                 as user_email,
      (count(*) over ())::int as total_count
    from act a
    join profiles pr on pr.id = a.user_id
    left join auth.users u on u.id = pr.id
    where ($6 = 'all' or a.kind = $6)
    order by a.created_at desc
    limit $7 offset $8
  `;
  return query<GlobalActivity>(sql, [
    ...baseParams(scope),
    p.kind,
    p.size,
    (p.page - 1) * p.size,
  ]);
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
  /** Montant exact du webhook (iap_events, 0039) dans la devise réellement payée ; null = pas couvert. */
  exact_amount: number | null;
  exact_currency: string | null;
  created_at: string;
};

/**
 * Ledger de crédits, affiché à part de la timeline. `amount_cents` reste l'estimation catalogue
 * (achats d'avant 0039) ; dès qu'une ligne iap_events existe, `exact_amount`/`exact_currency`
 * portent ce que la personne a réellement payé. Le pont est external_id = event_id, en retirant
 * le préfixe des lignes refund (`refund:<event_id>` / `refund-reversed:<event_id>`).
 */
export function listLedger(userId: string, limit = 100) {
  return query<LedgerRow>(
    `select ct.id, ct.delta, ct.reason, ct.pack_id, ct.external_id, ct.note,
            (case when ct.reason = 'purchase' then ${priceCentsSql('ct.pack_id')} else 0 end)::int as amount_cents,
            (ie.price_local)::float8 as exact_amount,
            ie.currency as exact_currency,
            ct.created_at
     from credit_transactions ct
     left join iap_events ie
       on ie.event_id = regexp_replace(ct.external_id, '^refund(-reversed)?:', '')
     where ct.user_id = $1
     order by ct.created_at desc
     limit $2`,
    [userId, limit],
  );
}
