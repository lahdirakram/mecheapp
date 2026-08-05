import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { grantAction } from '@/app/users/[id]/actions';
import { ActivityList } from '@/components/ActivityList';
import { Fatal } from '@/components/Fatal';
import { Pager } from '@/components/Pager';
import { toVM } from '@/lib/activity-vm';
import { fmtDateTime, fmtEurCents, fmtInt, fmtMoney } from '@/lib/format';
import { flatten, readInt } from '@/lib/qs';
import { listActivity, listLedger, type Activity, type LedgerRow } from '@/queries/activity';
import {
  getDevices,
  getSubscription,
  getUser,
  type Device,
  type Subscription,
  type UserDetail,
} from '@/queries/users';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACT_PAGE_SIZE = 25;

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const sp = flatten(await searchParams);
  const actPage = readInt(sp.ap, 1, 1, 100_000);
  // Retour de `grantAction`, préfixé 'err:' quand ça a échoué. Il vient de nous mais transite par
  // l'URL, donc il n'est jamais rendu autrement que comme du texte.
  const flash = sp.flash ? String(sp.flash).slice(0, 300) : '';
  const flashErr = flash.startsWith('err:') ? flash.slice(4) : null;

  // Annotés explicitement : des `let` nus seraient des `any` implicites et plus aucun nom de
  // champ ne serait vérifié.
  let user: UserDetail | null;
  let activity: Activity[];
  let ledger: LedgerRow[];
  let devices: Device[];
  let sub: Subscription | null;
  try {
    [user, activity, ledger, devices, sub] = await Promise.all([
      getUser(id),
      listActivity(id, actPage, ACT_PAGE_SIZE),
      listLedger(id),
      getDevices(id),
      getSubscription(id),
    ]);
  } catch (error) {
    return <Fatal error={error} />;
  }
  if (!user) notFound();

  const actTotal = activity[0]?.total_count ?? 0;

  return (
    <>
      <Link className="back" href="/">
        ← Utilisateurs
      </Link>

      <div className="head">
        <div>
          <h1>
            {user.display_name || (user.deleted_at ? 'Compte supprimé' : 'Sans nom')}
            {user.role === 'pro' && <> <span className="badge badge--pro">pro</span></>}
            {user.is_excluded && <> <span className="badge badge--excluded">interne</span></>}
            {user.deleted_at && <> <span className="badge badge--deleted">supprimé</span></>}
          </h1>
          <p className="sub">
            {user.email ?? (user.deleted_at ? 'historique anonymisé' : 'email inconnu')}
            {user.handle ? ` · @${user.handle}` : ''} · inscrit le {fmtDateTime(user.created_at)}
            {user.deleted_at && ` · supprimé le ${fmtDateTime(user.deleted_at)}`}
            {user.is_excluded && ' · compte exclu des chiffres du dashboard'}
          </p>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">Compte</div>
            </div>
            <div className="panel__body">
              <dl className="kv">
                <dt>UUID</dt>
                <dd className="mono">{user.id}</dd>
                <dt>Email</dt>
                <dd>
                  {user.email ?? <span className="dim">—</span>}
                  {user.email && !user.email_confirmed_at && (
                    <> <span className="badge badge--pending">non confirmé</span></>
                  )}
                </dd>
                {user.phone && (
                  <>
                    <dt>Téléphone</dt>
                    <dd>{user.phone}</dd>
                  </>
                )}
                <dt>Connexion</dt>
                <dd>{user.provider ?? <span className="dim">—</span>}</dd>
                <dt>Langue</dt>
                <dd>{user.lang}</dd>
                <dt>Rôle</dt>
                <dd>{user.role}</dd>
                <dt>Membre depuis</dt>
                <dd>{user.member_since}</dd>
                <dt>Dernière connexion</dt>
                <dd>{fmtDateTime(user.last_sign_in_at)}</dd>
                <dt>Appareils</dt>
                <dd>
                  {devices.length === 0 ? (
                    <span className="dim">aucun push enregistré</span>
                  ) : (
                    devices.map((d, i) => (
                      <div key={i}>
                        {d.platform ?? 'inconnu'} <span className="dim">· {fmtDateTime(d.created_at)}</span>
                      </div>
                    ))
                  )}
                </dd>
              </dl>
            </div>
            <div className="stat-row">
              <div className="stat">
                <div className="stat__label">Solde</div>
                <div className="stat__value">{fmtInt(user.balance)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Achetés</div>
                <div className="stat__value">{fmtInt(user.credits_bought)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Offerts</div>
                <div className="stat__value">{fmtInt(user.credits_free)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Accordés</div>
                <div className="stat__value">{fmtInt(user.credits_granted)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Consommés</div>
                <div className="stat__value">{fmtInt(user.credits_used)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">CA est.</div>
                <div className="stat__value">{fmtEurCents(user.revenue_cents)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Essais</div>
                <div className="stat__value">{fmtInt(user.gens_total)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Réussis</div>
                <div className="stat__value">{fmtInt(user.gens_done)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Échecs</div>
                <div className="stat__value">{fmtInt(user.gens_failed)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Suggest.</div>
                <div className="stat__value">{fmtInt(user.suggs)}</div>
              </div>
              <div className="stat">
                <div className="stat__label">Looks</div>
                <div className="stat__value">{fmtInt(user.looks)}</div>
              </div>
            </div>
          </div>

          {sub && (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel__head">
                <div className="panel__title">Abonnement Pro</div>
              </div>
              <div className="panel__body">
                <dl className="kv">
                  <dt>Plan</dt>
                  <dd>{sub.plan}</dd>
                  <dt>Statut</dt>
                  <dd>{sub.status}</dd>
                  <dt>Fin de période</dt>
                  <dd>{fmtDateTime(sub.current_period_end)}</dd>
                  <dt>Produit</dt>
                  <dd className="mono">{sub.rc_product_id ?? '—'}</dd>
                  <dt>Env. RevenueCat</dt>
                  <dd>{sub.environment ?? '—'}</dd>
                </dl>
              </div>
            </div>
          )}

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel__head">
              <div className="panel__title">Accorder des crédits</div>
              <span className="section-note">de vrais crédits, comme un achat</span>
            </div>
            <div className="panel__body">
              {user.role === 'pro' ? (
                <p className="note">
                  Compte pro : son quota vient de l&apos;abonnement, pas du solde de crédits. Un
                  crédit accordé ici ne servirait à rien.
                </p>
              ) : (
                <>
                  {/* Un submit classique, pas de JS : `ref` est frappé au rendu, donc un double
                      envoi retombe sur la même ligne au lieu de créditer deux fois. */}
                  <form action={grantAction} className="grant">
                    <input type="hidden" name="user_id" value={user.id} />
                    <input type="hidden" name="ref" value={randomUUID()} />
                    <label className="grant__field">
                      <span className="fgroup__label">Crédits</span>
                      <input
                        className="grant__num"
                        type="number"
                        name="delta"
                        step="1"
                        min={-1000}
                        max={1000}
                        defaultValue={5}
                        required
                      />
                    </label>
                    <label className="grant__field grant__field--grow">
                      <span className="fgroup__label">Motif</span>
                      <input
                        className="grant__note"
                        type="text"
                        name="note"
                        maxLength={200}
                        placeholder="geste commercial, presse, test…"
                      />
                    </label>
                    <button className="btn btn--ok" type="submit">
                      Accorder
                    </button>
                  </form>
                  <p className="note">
                    Un négatif reprend des crédits, sans jamais faire passer le solde sous zéro. Ces
                    crédits comptent comme achetés côté app : l&apos;essai sort net même quand le
                    premier essai verrouillé est actif. Ils n&apos;entrent pas dans le CA. Le motif
                    est visible par l&apos;utilisateur s&apos;il lit son ledger.
                  </p>
                </>
              )}
              {flash && (
                <p className={flashErr ? 'flash flash--err' : 'flash'} style={{ marginTop: 12 }}>
                  {flashErr ?? flash}
                </p>
              )}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel__head">
              <div className="panel__title">Crédits</div>
              <span className="section-note">{ledger.length} dernières lignes</span>
            </div>
            {ledger.length === 0 ? (
              <div className="empty">Aucun mouvement.</div>
            ) : (
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Raison</th>
                      <th className="num">Delta</th>
                      <th className="num">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id}>
                        <td className="dim">{fmtDateTime(l.created_at)}</td>
                        <td>
                          {l.reason}
                          {l.pack_id && <div className="mono">{l.pack_id}</div>}
                          {l.note && <div className="dim">{l.note}</div>}
                        </td>
                        <td className="num strong">
                          {l.delta > 0 ? `+${l.delta}` : l.delta}
                        </td>
                        <td className="num">
                          {l.exact_amount != null ? (
                            // Montant exact du webhook, dans la devise payée ; négatif = remboursement.
                            `${l.delta < 0 ? '-' : ''}${fmtMoney(Math.abs(l.exact_amount), l.exact_currency ?? 'EUR')}`
                          ) : l.amount_cents > 0 ? (
                            fmtEurCents(l.amount_cents)
                          ) : (
                            <span className="dim">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div className="panel__title">Activité</div>
            <span className="section-note">
              cliquer un essai pour voir l&apos;avant / après
            </span>
          </div>
          <ActivityList items={activity.map(toVM)} />
          <Pager
            params={sp}
            pageKey="ap"
            page={actPage}
            size={ACT_PAGE_SIZE}
            total={actTotal}
            label="activités"
          />
        </div>
      </div>
    </>
  );
}
