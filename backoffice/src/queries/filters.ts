import 'server-only';
import { getEnv } from '@/lib/env';

/**
 * Périmètre de lecture, piloté par la barre de filtres du dashboard. Les mêmes valeurs alimentent
 * les métriques ET le tableau : lire deux périmètres différents sur un même écran est le meilleur
 * moyen de tirer une fausse conclusion.
 */
export type Scope = {
  role: 'all' | 'b2c' | 'pro';
  /** `active` = a au moins un essai RÉUSSI. Un compte sans résultat n'a jamais rien vécu du produit. */
  accounts: 'all' | 'active';
  period: 'all' | '7d' | '30d' | '90d' | 'today' | 'yesterday' | 'month';
  /** Statut des essais retenus. `done` par défaut : un échec n'est pas un essai livré. */
  attempts: 'done' | 'all';
};

export const PERIOD_LABEL: Record<Scope['period'], string> = {
  all: 'depuis le début',
  '7d': 'sur 7 jours',
  '30d': 'sur 30 jours',
  '90d': 'sur 90 jours',
  today: "aujourd'hui",
  yesterday: 'hier',
  month: 'ce mois-ci',
};

export const DEFAULT_SCOPE: Scope = {
  role: 'all',
  // Volontairement `all` : réduire le dénominateur gonfle mécaniquement les taux de conversion
  // et d'ARPU. Le filtre « actifs » est à un clic quand on veut regarder la cohorte activée.
  accounts: 'all',
  period: 'all',
  attempts: 'done',
};

const isIn = <T extends string>(vals: readonly T[], v: string | undefined, def: T): T =>
  (vals as readonly string[]).includes(v ?? '') ? (v as T) : def;

export function parseScope(p: Record<string, string>): Scope {
  return {
    role: isIn(['all', 'b2c', 'pro'] as const, p.role, DEFAULT_SCOPE.role),
    accounts: isIn(['all', 'active'] as const, p.accounts, DEFAULT_SCOPE.accounts),
    period: isIn(
      ['all', '7d', '30d', '90d', 'today', 'yesterday', 'month'] as const,
      p.period,
      DEFAULT_SCOPE.period
    ),
    attempts: isIn(['done', 'all'] as const, p.attempts, DEFAULT_SCOPE.attempts),
  };
}

/**
 * CTE commune à toutes les requêtes. `scope` est l'ensemble des comptes retenus : internes exclus,
 * rôle filtré, et comptes non activés retirés si demandé.
 */
export const SCOPE_CTE = `
  excl as (
    select u.id from auth.users u where lower(u.email) = any($1::text[])
  ),
  activated as (
    select distinct user_id from generations where status = 'done'
  ),
  -- Les comptes supprimés (deleted_at non nul, 0035) RESTENT dans scope : leur revenu et leurs
  -- essais doivent compter dans les métriques, c'est la raison d'être des tombstones. Seuls les
  -- compteurs de COMPTES (bloc u de metrics.ts) les écartent, via cette colonne.
  scope as (
    select p.id, p.role, p.created_at, p.deleted_at
    from profiles p
    where p.id not in (select id from excl)
      and ($2 = 'all' or p.role::text = $2)
      and ($3 = 'all' or p.id in (select user_id from activated))
  )`;

/**
 * Minuit et 1er du mois en Europe/Paris, exprimés en timestamptz. Les bornes calendaires
 * (aujourd'hui, hier, ce mois-ci) suivent l'horloge de l'admin, pas l'UTC du serveur : à 1h du
 * matin heure française, « aujourd'hui » ne doit pas être vide.
 */
const DAY0 = `(date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')`;
const MONTH0 = `(date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')`;

/**
 * Prédicat de période. `$4` est la clé de période telle quelle (texte), chaque cas est énuméré :
 * pas de `$4::int` conditionnel, le pliage de constantes de Postgres peut évaluer un cast d'une
 * branche non prise et faire échouer la requête. Les fenêtres glissantes restent ancrées sur
 * `now()` ; les trois périodes calendaires sont bornées sur l'heure de Paris.
 */
export const inPeriod = (col: string) => `(case $4
  when 'all' then true
  when 'today' then ${col} >= ${DAY0}
  when 'yesterday' then (${col} >= ${DAY0} - interval '1 day' and ${col} < ${DAY0})
  when 'month' then ${col} >= ${MONTH0}
  when '7d' then ${col} > now() - interval '7 days'
  when '30d' then ${col} > now() - interval '30 days'
  when '90d' then ${col} > now() - interval '90 days'
  else true
end)`;

/** Prédicat de statut d'essai, à appliquer sur `generations`. */
export const ATTEMPT_OK = `($5 = 'all' or status = 'done')`;

/** Les 5 premiers paramètres de TOUTE requête, dans cet ordre imposé. */
export function baseParams(s: Scope): unknown[] {
  return [getEnv().excludedEmails, s.role, s.accounts, s.period, s.attempts];
}
