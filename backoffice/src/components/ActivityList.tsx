'use client';

import { useState } from 'react';
import { BeforeAfter } from '@/components/BeforeAfter';

/**
 * Vue-modèle préparée côté serveur (dates déjà formatées) : le composant client n'a plus qu'à
 * gérer le dépliage, et on évite tout écart de rendu serveur/client sur les formats de date.
 */
export type ActivityVM = {
  kind: 'generation' | 'suggestion';
  id: string;
  when: string;
  title: string;
  meta: string;
  status: string | null;
  selfiePath: string | null;
  resultPath: string | null;
  error: string | null;
  brief: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  done: 'ok',
  failed: 'échec',
  pending: 'en cours',
};

export function ActivityList({ items }: { items: ActivityVM[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0) {
    return <div className="empty">Aucune activité.</div>;
  }

  return (
    <div>
      {items.map((it) => {
        // Une suggestion n'a rien à déplier : seule sa date est en base.
        const expandable = it.kind === 'generation';
        const isOpen = open === it.id;
        return (
          <div className="act" key={`${it.kind}-${it.id}`}>
            <button
              type="button"
              className={`act__head${expandable ? ' act__head--clickable' : ''}`}
              onClick={() => expandable && setOpen(isOpen ? null : it.id)}
              aria-expanded={expandable ? isOpen : undefined}
              disabled={!expandable}
            >
              <span className="act__chev">{expandable ? (isOpen ? '▾' : '▸') : ''}</span>
              {it.kind === 'generation' ? (
                <span className={`badge badge--${it.status ?? 'done'}`}>
                  {STATUS_LABEL[it.status ?? ''] ?? it.status ?? 'essai'}
                </span>
              ) : (
                <span className="badge badge--suggestion">suggestion</span>
              )}
              <span className="act__title">
                <span className="act__name">{it.title}</span>
                {it.meta && <span className="act__meta">{it.meta}</span>}
              </span>
              <span className="act__date">{it.when}</span>
            </button>
            {isOpen && (
              <BeforeAfter
                selfiePath={it.selfiePath}
                resultPath={it.resultPath}
                brief={it.brief}
                error={it.error}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
