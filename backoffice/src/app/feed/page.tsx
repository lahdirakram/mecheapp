import Link from 'next/link';
import { curateAction } from '@/app/feed/actions';
import { Fatal } from '@/components/Fatal';
import { FeedCard } from '@/components/FeedCard';
import { Pager } from '@/components/Pager';
import { fmtInt } from '@/lib/format';
import { flatten, readInt, withParams } from '@/lib/qs';
import {
  FEED_STATUSES,
  type FeedRow,
  type FeedStatus,
  feedCounts,
  feedStyles,
  isFeedStatus,
  listFeed,
  STATUS_LABEL,
  type StatusCounts,
} from '@/queries/feed';

// Un écran de curation doit montrer l'état courant, jamais une page mise en cache.
export const dynamic = 'force-dynamic';

const TO_LABEL: Record<FeedStatus, string> = {
  draft: 'remis à valider',
  published: 'publié(s)',
  archived: 'refusé(s)',
};

export default async function FeedCuration({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = flatten(await searchParams);
  const status: FeedStatus = isFeedStatus(params.status ?? '')
    ? (params.status as FeedStatus)
    : 'draft';
  const style = (params.style ?? '').trim();
  const page = readInt(params.page, 1, 1, 100_000);
  const size = readInt(params.size, 24, 6, 120);

  let counts: StatusCounts;
  let styles: { slug: string; n: number }[];
  let rows: FeedRow[];
  try {
    [counts, styles, rows] = await Promise.all([
      feedCounts(),
      feedStyles(status),
      listFeed({ status, style, page, size }),
    ]);
  } catch (error) {
    return <Fatal error={error} />;
  }

  const total = rows[0]?.total_count ?? 0;
  // Les filtres voyagent avec l'action pour revenir exactement sur la même vue après un clic.
  const back = `/feed${withParams(params, { ok: undefined, to: undefined })}`;

  const done = Number.parseInt(params.ok ?? '', 10);
  const doneTo = params.to ?? '';

  return (
    <>
      <Link className="back" href="/">
        ← Vue d&apos;ensemble
      </Link>

      <div className="head">
        <div>
          <h1>Feed · curation</h1>
          <p className="sub">
            {`${fmtInt(counts.draft)} à valider · ${fmtInt(counts.published)} en ligne · ${fmtInt(counts.archived)} refusés.`}{' '}
            Seuls les publiés remontent dans l&apos;app.
          </p>
        </div>
        {Number.isFinite(done) && isFeedStatus(doneTo) && (
          <p className="flash">
            {fmtInt(done)} {TO_LABEL[doneTo]}
          </p>
        )}
      </div>

      <div className="filters">
        <div className="fgroup">
          <span className="fgroup__label">Statut</span>
          <div className="seg">
            {FEED_STATUSES.map((s) => (
              <Link
                key={s}
                href={withParams(params, {
                  status: s === 'draft' ? undefined : s,
                  style: undefined,
                  page: undefined,
                  ok: undefined,
                  to: undefined,
                })}
                aria-current={s === status}
              >
                {STATUS_LABEL[s]} ({fmtInt(counts[s])})
              </Link>
            ))}
          </div>
        </div>

        {styles.length > 0 && (
          <div className="fgroup">
            <span className="fgroup__label">Style</span>
            <div className="seg seg--wrap">
              <Link
                href={withParams(params, { style: undefined, page: undefined })}
                aria-current={style === ''}
              >
                Tous
              </Link>
              {styles.map((s) => (
                <Link
                  key={s.slug}
                  href={withParams(params, { style: s.slug, page: undefined })}
                  aria-current={style === s.slug}
                >
                  {s.slug} ({s.n})
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <span className="panel__title">
            {STATUS_LABEL[status]}
            {style && <span className="mono"> · {style}</span>}
          </span>
          {status === 'draft' && rows.length > 0 && (
            // Le lot ne porte QUE les ids affichés : ce qui est publié est ce qui a été regardé.
            <form action={curateAction} className="bulk">
              {rows.map((r) => (
                <input key={r.id} type="hidden" name="id" value={r.id} />
              ))}
              <input type="hidden" name="back" value={back} />
              <span className="section-note">tout ce qui est affiché ci-dessous :</span>
              <button className="btn btn--ok" type="submit" name="status" value="published">
                Publier les {rows.length}
              </button>
              <button className="btn btn--no" type="submit" name="status" value="archived">
                Tout refuser
              </button>
            </form>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="empty">
            {status === 'draft'
              ? 'Rien à valider. Les brouillons arrivent avec scripts/gen-feed.mjs --commit.'
              : 'Aucun item dans ce statut.'}
          </p>
        ) : (
          <div className="panel__body">
            <div className="fgrid">
              {rows.map((item) => (
                <FeedCard key={item.id} item={item} back={back} />
              ))}
            </div>
          </div>
        )}

        <Pager params={params} page={page} size={size} total={total} label="visuels" />
      </div>
    </>
  );
}
