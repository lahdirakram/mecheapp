import Link from 'next/link';
import { ClickableRow } from '@/components/ClickableRow';
import { fmtAgo, fmtDate, fmtEurCents, fmtInt, shortId } from '@/lib/format';
import { withParams } from '@/lib/qs';
import type { SortKey, UserRow } from '@/queries/users';

const COLS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: 'created_at', label: 'Inscription' },
  { key: 'email', label: 'Email' },
  { key: 'name', label: 'Nom' },
  { key: 'gens', label: 'Essais', num: true },
  { key: 'suggs', label: 'Suggest.', num: true },
  { key: 'balance', label: 'Solde', num: true },
  { key: 'revenue', label: 'CA est.', num: true },
  { key: 'last_seen', label: 'Vu' },
];

function SortHeader({
  col,
  sort,
  dir,
  params,
}: {
  col: (typeof COLS)[number];
  sort: SortKey;
  dir: 'asc' | 'desc';
  params: Record<string, string>;
}) {
  const active = sort === col.key;
  // Un clic sur la colonne active inverse le sens ; sinon on part du plus parlant (desc).
  const next = active && dir === 'desc' ? 'asc' : 'desc';
  const href = withParams(params, { sort: col.key, dir: next, page: undefined });
  return (
    <th className={col.num ? 'num' : undefined}>
      <Link href={href} scroll={false}>
        {col.label}
        {active && <span className="arrow">{dir === 'desc' ? '↓' : '↑'}</span>}
      </Link>
    </th>
  );
}

export function UsersTable({
  rows,
  sort,
  dir,
  params,
}: {
  rows: UserRow[];
  sort: SortKey;
  dir: 'asc' | 'desc';
  params: Record<string, string>;
}) {
  if (rows.length === 0) {
    return <div className="empty">Aucun utilisateur ne correspond.</div>;
  }
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            {COLS.map((c) => (
              <SortHeader key={c.key} col={c} sort={sort} dir={dir} params={params} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <ClickableRow key={u.id} href={`/users/${u.id}`}>
              <td>
                {fmtDate(u.created_at)}
                <div className="mono">{shortId(u.id)}</div>
              </td>
              <td>{u.email ?? <span className="dim">— (compte auth absent)</span>}</td>
              <td>
                <span className="strong">{u.display_name || <span className="dim">sans nom</span>}</span>
                {u.handle && <div className="mono">@{u.handle}</div>}
                {u.role === 'pro' && (
                  <>
                    {' '}
                    <span className="badge badge--pro">pro</span>
                  </>
                )}
                {u.is_excluded && (
                  <>
                    {' '}
                    <span className="badge badge--excluded" title="Compte interne : hors de tous les chiffres">
                      interne
                    </span>
                  </>
                )}
                {u.is_unconfirmed && (
                  <>
                    {' '}
                    <span className="badge badge--pending" title="Inscription non terminée : email jamais confirmé">
                      non confirmé
                    </span>
                  </>
                )}
              </td>
              <td className="num">{u.gens > 0 ? fmtInt(u.gens) : <span className="dim">0</span>}</td>
              <td className="num">{u.suggs > 0 ? fmtInt(u.suggs) : <span className="dim">0</span>}</td>
              <td className="num">{fmtInt(u.balance)}</td>
              <td className="num">
                {u.revenue_cents > 0 ? (
                  <span className="strong">{fmtEurCents(u.revenue_cents)}</span>
                ) : (
                  <span className="dim">—</span>
                )}
              </td>
              <td className="dim">{fmtAgo(u.last_sign_in_at)}</td>
            </ClickableRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}
