import { Fatal } from '@/components/Fatal';
import { FilterBar } from '@/components/FilterBar';
import { MetricCard } from '@/components/MetricCard';
import { Pager } from '@/components/Pager';
import { SearchBox } from '@/components/SearchBox';
import { UsersTable } from '@/components/UsersTable';
import { fmtEurCents, fmtInt, fmtPct } from '@/lib/format';
import { flatten, readInt } from '@/lib/qs';
import { parseScope, PERIOD_LABEL } from '@/queries/filters';
import { getMetrics, type Metrics } from '@/queries/metrics';
import { isSortKey, listUsers, type SortKey, type UserRow } from '@/queries/users';

// Un dashboard admin doit montrer l'état courant, jamais une page mise en cache.
export const dynamic = 'force-dynamic';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = flatten(await searchParams);
  const scope = parseScope(params);
  const q = (params.q ?? '').trim();
  const sort: SortKey = isSortKey(params.sort ?? '') ? (params.sort as SortKey) : 'created_at';
  const dir = params.dir === 'asc' ? 'asc' : 'desc';
  const page = readInt(params.page, 1, 1, 100_000);
  const size = readInt(params.size, 50, 10, 200);

  // Annoté explicitement : un `let` nu serait un `any` implicite et plus aucun nom de champ
  // ne serait vérifié.
  let m: Metrics;
  let rows: UserRow[];
  try {
    [m, rows] = await Promise.all([
      getMetrics(scope),
      listUsers(scope, { q, sort, dir, page, size }),
    ]);
  } catch (error) {
    return <Fatal error={error} />;
  }

  const total = rows[0]?.total_count ?? 0;
  const periode = PERIOD_LABEL[scope.period];
  const essaisReussisSeuls = scope.attempts === 'done';
  // Dénominateur du taux d'échec : la répartition réelle, indépendante du filtre de statut.
  const gensReels = m.gens_done + m.gens_failed + m.gens_pending;

  return (
    <>
      <div className="head">
        <div>
          <h1>Vue d&apos;ensemble</h1>
          <p className="sub">
            {fmtInt(m.users_total)} comptes · {fmtInt(m.gens_shown)}{' '}
            {essaisReussisSeuls ? 'essais réussis' : 'essais'} · {fmtEurCents(m.revenue_cents)} de CA
            estimé · {periode}
            {scope.accounts === 'active' && ' · comptes activés seulement'}
            {m.excluded_count > 0 && (
              <>
                {' · '}
                <span title="EXCLUDED_EMAILS dans backoffice/.env.local">
                  {fmtInt(m.excluded_count)} compte{m.excluded_count > 1 ? 's' : ''} interne
                  {m.excluded_count > 1 ? 's' : ''} exclu{m.excluded_count > 1 ? 's' : ''}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <FilterBar scope={scope} params={params} />

      <section className="section">
        <div className="section-head">
          <h2>Utilisateurs</h2>
          <span className="section-note">
            le nombre de comptes ne suit pas la période : c&apos;est le dénominateur des taux
          </span>
        </div>
        <div className="metrics">
          <MetricCard
            label="Comptes"
            value={fmtInt(m.users_total)}
            hint={`${fmtInt(m.users_b2c)} B2C · ${fmtInt(m.users_pro)} pro`}
          />
          <MetricCard label="Inscrits" value={fmtInt(m.users_new)} hint={periode} />
          <MetricCard
            label="Ont fait un essai"
            value={fmtInt(m.users_tried)}
            hint={`${fmtPct(m.users_tried, m.users_total)} des comptes · ${periode}`}
          />
          <MetricCard
            label="Comptes non activés"
            value={fmtInt(m.users_inactive)}
            hint={`${fmtPct(m.users_inactive, m.users_total)} sans aucun essai réussi`}
          />
          <MetricCard
            label="Ont demandé une suggestion"
            value={fmtInt(m.users_sugg)}
            hint={`${fmtPct(m.users_sugg, m.users_total)} des comptes`}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Usage</h2>
          <span className="section-note">
            {essaisReussisSeuls
              ? 'les essais échoués sont exclus des chiffres, mais restent visibles dans la répartition'
              : 'tous les statuts sont comptés, échecs inclus'}
          </span>
        </div>
        <div className="metrics">
          <MetricCard
            label={essaisReussisSeuls ? 'Essais réussis' : 'Essais (tous statuts)'}
            value={fmtInt(m.gens_shown)}
            hint={`${fmtInt(m.gens_done)} ok · ${fmtInt(m.gens_failed)} échecs · ${fmtInt(m.gens_pending)} en cours`}
          />
          <MetricCard
            label="Taux d'échec"
            value={fmtPct(m.gens_failed, gensReels)}
            hint={`${fmtInt(m.gens_failed)} sur ${fmtInt(gensReels)} tentatives`}
          />
          <MetricCard
            label="Suggestions"
            value={fmtInt(m.sugg_total)}
            hint="date seule, aucun contenu stocké"
          />
          <MetricCard
            label="Crédits consommés"
            value={fmtInt(m.credits_used)}
            hint="net des remboursements"
          />
          <MetricCard
            label="Essais par compte actif"
            value={
              m.users_tried > 0
                ? (m.gens_shown / m.users_tried).toFixed(1).replace('.', ',')
                : '—'
            }
            hint="moyenne sur ceux qui ont essayé"
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Monétisation</h2>
          <span className="section-note">
            aucun montant n&apos;est stocké par le webhook RevenueCat : CA au prix catalogue EUR,
            brut avant commission store et TVA
          </span>
        </div>
        <div className="metrics">
          <MetricCard
            label="CA"
            value={fmtEurCents(m.revenue_cents)}
            hint={`${fmtInt(m.orders)} achat${m.orders > 1 ? 's' : ''} · ${periode}`}
            accent
            estimate
          />
          <MetricCard
            label="CA moyen / compte"
            value={m.users_total > 0 ? fmtEurCents(m.revenue_cents / m.users_total) : '—'}
            hint="ARPU, tous comptes du périmètre"
            estimate
          />
          <MetricCard
            label="CA moyen / payeur"
            value={m.payers > 0 ? fmtEurCents(m.revenue_cents / m.payers) : '—'}
            hint="ARPPU"
            estimate
          />
          <MetricCard
            label="Payeurs"
            value={fmtInt(m.payers)}
            hint={`${fmtPct(m.payers, m.users_total)} de conversion`}
          />
          <MetricCard
            label="Panier moyen"
            value={m.orders > 0 ? fmtEurCents(m.revenue_cents / m.orders) : '—'}
            estimate
          />
          <MetricCard
            label="Crédits achetés"
            value={fmtInt(m.credits_bought)}
            hint={`${fmtInt(m.credits_free)} offerts en plus`}
          />
          <MetricCard
            label="Crédits en circulation"
            value={fmtInt(m.credits_left)}
            hint="solde courant, hors période"
          />
          <MetricCard
            label="Abonnements Pro actifs"
            value={fmtInt(m.subs_active)}
            hint="hors CA : aucun prix en base"
          />
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">
              Utilisateurs <span className="section-note">même périmètre que les cartes</span>
            </div>
            <SearchBox params={params} initial={q} />
          </div>
          <UsersTable rows={rows} sort={sort} dir={dir} params={params} />
          <Pager params={params} page={page} size={size} total={total} label="utilisateurs" />
        </div>
      </section>
    </>
  );
}
