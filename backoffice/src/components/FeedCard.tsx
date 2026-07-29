import { fmtDate } from '@/lib/format';
import type { FeedRow, FeedStatus } from '@/queries/feed';
import { curateAction } from '@/app/feed/actions';

/** Une action = un bouton submit. `status` est la valeur postée, revalidée côté serveur. */
const ACTIONS: Record<FeedStatus, { to: FeedStatus; label: string; cls: string }[]> = {
  draft: [
    { to: 'published', label: 'Publier', cls: 'btn btn--ok' },
    { to: 'archived', label: 'Refuser', cls: 'btn btn--no' },
  ],
  published: [
    { to: 'archived', label: 'Dépublier', cls: 'btn btn--no' },
    { to: 'draft', label: 'À revoir', cls: 'btn' },
  ],
  archived: [
    { to: 'published', label: 'Publier', cls: 'btn btn--ok' },
    { to: 'draft', label: 'À revoir', cls: 'btn' },
  ],
};

/**
 * Ce qui décide d'un tri à l'œil : qui est sur la photo. Le cadrage et la lumière sont des phrases
 * entières dans gen_meta, elles noieraient la carte — elles restent lisibles dans le prompt.
 */
const AXES_ORDER = ['gender', 'age', 'heritage', 'visibleTex'] as const;

export function FeedCard({ item, back }: { item: FeedRow; back: string }) {
  const axes = item.gen_meta?.axes ?? {};
  const line = AXES_ORDER.map((k) => axes[k]).filter(Boolean).join(' · ');
  const title = item.name?.fr ?? item.name?.en ?? '(sans nom)';

  return (
    <article className="fcard">
      {item.image_url ? (
        // Ouvre l'original dans un onglet : le tri se fait à l'œil, il faut pouvoir zoomer.
        <a href={item.image_url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fcard__img" src={item.image_url} alt={title} loading="lazy" />
        </a>
      ) : (
        <div className="fcard__none">
          pas d&apos;image
          <span className="mono">{item.kind}</span>
        </div>
      )}

      <div className="fcard__body">
        <div className="fcard__title">{title}</div>
        <div className="fcard__meta">
          {item.catalog_slug ? (
            <span className="mono">{item.catalog_slug}</span>
          ) : (
            <span className="mono dim">hors catalogue · {item.kind}</span>
          )}
          {' · '}
          {fmtDate(item.created_at)}
        </div>
        {line && <div className="fcard__axes">{line}</div>}
        <div className="fcard__meta">
          {[item.hair, item.mood, item.tag?.fr].filter(Boolean).join(' · ')}
        </div>
        {item.gen_meta?.prompt && (
          <details className="fcard__prompt">
            <summary>prompt</summary>
            <p>{item.gen_meta.prompt}</p>
          </details>
        )}
      </div>

      <form action={curateAction} className="fcard__acts">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="back" value={back} />
        {ACTIONS[item.status].map((a) => (
          <button key={a.to} className={a.cls} type="submit" name="status" value={a.to}>
            {a.label}
          </button>
        ))}
      </form>
    </article>
  );
}
