import { ClickableRow } from '@/components/ClickableRow';
import { fmtDate, fmtDateTime, fmtEurCents, fmtInt, fmtMoney, fmtUsdMicro } from '@/lib/format';
import type { PurchaseRow } from '@/queries/purchases';

const PACK_LABEL: Record<string, string> = {
  taste: 'Taste · 5 crédits',
  star: 'Star · 20 crédits',
  pro: 'Pro · 50 crédits',
};

/** Le montant d'une ligne : exact (iap_events) dès que le webhook l'a journalisée, estimé sinon. */
function Amount({ r }: { r: PurchaseRow }) {
  // Achat couvert par le registre 0039 : le prix réellement payé, dans la vraie devise.
  if (r.price_local != null && r.currency) {
    const sandbox = r.environment !== 'PRODUCTION';
    return (
      <>
        <span className={sandbox ? 'dim' : 'strong'}>{fmtMoney(r.price_local, r.currency)}</span>
        {r.currency !== 'USD' && r.price_usd != null && (
          <div className="dim" title="Prix normalisé USD par RevenueCat, la devise du CA">
            ≈ {fmtUsdMicro(r.price_usd * 1e6)}
          </div>
        )}
      </>
    );
  }
  // Ligne refund sans montant journalisé : le mouvement de crédits est la seule trace.
  if (r.reason === 'refund') return <span className="dim">—</span>;
  return (
    <span title="Achat d'avant le registre 0039 : prix catalogue EUR, pas le montant réellement payé">
      {fmtEurCents(r.est_cents)} <span className="dim">est.</span>
    </span>
  );
}

/**
 * Journal des achats du dashboard, du plus récent au plus ancien. Une ligne = un mouvement
 * d'argent du ledger ('purchase' ou 'refund'), avec l'acheteur et son profil courant à côté du
 * montant. Le clic sur la ligne ouvre la fiche de l'acheteur (son ledger détaillé y est).
 */
export function PurchasesTable({ rows }: { rows: PurchaseRow[] }) {
  if (rows.length === 0) {
    return <div className="empty">Aucun achat sur ce périmètre.</div>;
  }
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Profil acheteur</th>
            <th>Pack</th>
            <th className="num">Crédits</th>
            <th className="num">Montant</th>
            <th>Store</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            // Une ligne 'refund' à delta positif est un remboursement ANNULÉ (REFUND_REVERSED) :
            // les crédits reviennent.
            const refundReversed = r.reason === 'refund' && r.delta > 0;
            return (
              <ClickableRow key={r.id} href={`/users/${r.user_id}`}>
                <td className="dim nowrap">{fmtDateTime(r.created_at)}</td>
                <td>
                  <span className="strong">
                    {r.user_name || <span className="dim">sans nom</span>}
                  </span>
                  {r.user_email && <div className="mono">{r.user_email}</div>}
                  {r.user_deleted_at && (
                    <>
                      {' '}
                      <span
                        className="badge badge--deleted"
                        title="Compte supprimé : historique anonymisé conservé (0035)"
                      >
                        supprimé
                      </span>
                    </>
                  )}
                </td>
                <td className="dim nowrap">
                  inscrit le {fmtDate(r.user_created_at)}
                  <div>
                    {fmtInt(r.user_gens)} essai{r.user_gens > 1 ? 's' : ''} · solde{' '}
                    {fmtInt(r.user_balance)} ·{' '}
                    {r.user_orders > 1 ? `${fmtInt(r.user_orders)} achats` : '1er achat'}
                  </div>
                </td>
                <td>
                  {r.reason === 'refund' ? (
                    <span className="badge badge--failed">
                      {refundReversed ? 'remb. annulé' : 'remboursement'}
                    </span>
                  ) : (
                    <span className="strong">
                      {PACK_LABEL[r.pack_id ?? ''] ?? r.pack_id ?? '—'}
                    </span>
                  )}
                  {r.environment != null && r.environment !== 'PRODUCTION' && (
                    <>
                      {' '}
                      <span
                        className="badge badge--pending"
                        title="Achat sandbox : crédite les crédits mais ne rapporte rien"
                      >
                        sandbox
                      </span>
                    </>
                  )}
                </td>
                <td className="num">
                  <span className={r.delta < 0 ? 'dim' : undefined}>
                    {r.delta > 0 ? `+${fmtInt(r.delta)}` : fmtInt(r.delta)}
                  </span>
                </td>
                <td className="num">
                  <Amount r={r} />
                </td>
                <td className="dim nowrap">
                  {r.store === 'APP_STORE'
                    ? 'App Store'
                    : r.store === 'PLAY_STORE'
                      ? 'Play Store'
                      : (r.store ?? '—')}
                </td>
              </ClickableRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
