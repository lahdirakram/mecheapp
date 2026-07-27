import Link from 'next/link';
import { fmtInt } from '@/lib/format';
import { withParams } from '@/lib/qs';

export function Pager({
  params,
  pageKey = 'page',
  page,
  size,
  total,
  label,
}: {
  params: Record<string, string>;
  /** La fiche user a deux paginations : `page` pour rien, `ap` pour l'activité. */
  pageKey?: string;
  page: number;
  size: number;
  total: number;
  label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  // Clampé : les boutons de bord sont désactivés, mais autant ne pas produire de `?page=0`.
  const href = (p: number) => {
    const target = Math.min(pages, Math.max(1, p));
    return withParams(params, { [pageKey]: target === 1 ? undefined : target });
  };

  return (
    <div className="pager">
      <span>
        {from}–{to} sur {fmtInt(total)} {label}
      </span>
      <span className="pager__spacer" />
      <span>
        page {page} / {pages}
      </span>
      <Link className="btn" href={href(page - 1)} aria-disabled={page <= 1}>
        ← Préc.
      </Link>
      <Link className="btn" href={href(page + 1)} aria-disabled={page >= pages}>
        Suiv. →
      </Link>
    </div>
  );
}
