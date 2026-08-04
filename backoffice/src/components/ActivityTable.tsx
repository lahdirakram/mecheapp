'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { ActivityVM } from '@/components/ActivityList';
import { BeforeAfter } from '@/components/BeforeAfter';

/** Ligne du tableau global : la vue-modèle commune, plus l'auteur (absent de la fiche user). */
export type ActivityRowVM = ActivityVM & {
  user: { id: string; name: string; email: string | null };
};

const STATUS_LABEL: Record<string, string> = {
  done: 'ok',
  failed: 'échec',
  pending: 'en cours',
};

/**
 * Tableau d'activité du dashboard. Même principe que la timeline de la fiche user : une génération
 * se déplie pour montrer l'avant/après, une suggestion n'a rien à déplier (seule sa date est en
 * base). Le clic sur la ligne déplie ; le lien vers la fiche user arrête la propagation pour ne
 * pas déplier en même temps.
 */
export function ActivityTable({ rows }: { rows: ActivityRowVM[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (rows.length === 0) {
    return <div className="empty">Aucune activité sur ce périmètre.</div>;
  }

  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            <th aria-hidden style={{ width: 18 }} />
            <th>Date</th>
            <th>Type</th>
            <th>Utilisateur</th>
            <th>Essai</th>
            <th>Coût</th>
            <th>Détail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            // Une génération se déplie sur l'avant/après ; une suggestion, sur son contenu (0038).
            // Une vieille suggestion sans contenu n'a rien à montrer.
            const expandable = r.kind === 'generation' || r.brief != null;
            const key = `${r.kind}-${r.id}`;
            const isOpen = open === key;
            return (
              <Fragment key={key}>
                <tr
                  className={expandable ? 'row' : undefined}
                  tabIndex={expandable ? 0 : undefined}
                  aria-expanded={expandable ? isOpen : undefined}
                  onClick={() => expandable && setOpen(isOpen ? null : key)}
                  onKeyDown={(e) => {
                    if (expandable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setOpen(isOpen ? null : key);
                    }
                  }}
                >
                  <td className="dim">{expandable ? (isOpen ? '▾' : '▸') : ''}</td>
                  <td className="dim nowrap">{r.when}</td>
                  <td>
                    {r.kind === 'generation' ? (
                      <span className={`badge badge--${r.status ?? 'done'}`}>
                        {STATUS_LABEL[r.status ?? ''] ?? r.status ?? 'essai'}
                      </span>
                    ) : (
                      <span className="badge badge--suggestion">suggestion</span>
                    )}
                  </td>
                  <td>
                    <Link
                      className="act-user"
                      href={`/users/${r.user.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Voir la fiche"
                    >
                      <span className="strong">
                        {r.user.name || <span className="dim">sans nom</span>}
                      </span>
                      {r.user.email && <div className="mono">{r.user.email}</div>}
                    </Link>
                  </td>
                  <td>{r.kind === 'generation' ? r.title : <span className="dim">{r.title}</span>}</td>
                  <td className="dim nowrap">{r.cost ?? '—'}</td>
                  <td className="dim">{r.meta || '—'}</td>
                </tr>
                {isOpen && (
                  <tr className="act-detail">
                    <td colSpan={7}>
                      {r.kind === 'generation' ? (
                        <BeforeAfter
                          selfiePath={r.selfiePath}
                          resultPath={r.resultPath}
                          brief={r.brief}
                          error={r.error}
                          photosDeleted={r.photosDeleted}
                        />
                      ) : (
                        r.brief && <pre className="ba__brief">{r.brief}</pre>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
