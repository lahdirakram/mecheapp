import 'server-only';
import { query } from '@/lib/db';

/**
 * Curation du feed d'inspiration.
 *
 * `gen-feed.mjs` insère ses portraits en `status = 'draft'` (0014_feed_catalog.sql) et
 * `feed_for_user` ne renvoie que les `published` : rien de généré n'atteint l'app tant qu'un
 * humain n'a pas validé. Ces requêtes sont l'écran de relecture ; l'écriture est dans
 * `lib/writes.ts`, seul endroit du backoffice qui écrit.
 */

export const FEED_STATUSES = ['draft', 'published', 'archived'] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

export function isFeedStatus(v: string): v is FeedStatus {
  return (FEED_STATUSES as readonly string[]).includes(v);
}

export const STATUS_LABEL: Record<FeedStatus, string> = {
  draft: 'À valider',
  published: 'Publiés',
  archived: 'Refusés',
};

/** Les axes échantillonnés par le générateur (gen_meta.axes dans scripts/gen-feed.mjs). */
type Axes = {
  gender?: string;
  age?: string | number;
  heritage?: string;
  visibleTex?: string;
  shot?: string;
  lighting?: string;
};

export type GenMeta = {
  source?: string;
  model?: string;
  aspectRatio?: string;
  combo?: string;
  prompt?: string;
  axes?: Axes;
  cost_eur?: number;
} | null;

type I18n = { fr?: string; en?: string } | null;

export type FeedRow = {
  id: string;
  kind: string;
  status: FeedStatus;
  name: I18n;
  descr: I18n;
  tag: I18n;
  hair: string | null;
  mood: string | null;
  loves: string | null;
  image_url: string | null;
  gen_meta: GenMeta;
  catalog_slug: string | null;
  created_at: string;
  total_count: number;
};

export type StatusCounts = Record<FeedStatus, number>;

/** Combien d'items par statut, tous styles confondus : c'est le compteur des onglets. */
export async function feedCounts(): Promise<StatusCounts> {
  const rows = await query<{ status: string; n: number }>(
    `select status, count(*)::int as n from feed_items group by status`,
  );
  const out: StatusCounts = { draft: 0, published: 0, archived: 0 };
  for (const r of rows) if (isFeedStatus(r.status)) out[r.status] = r.n;
  return out;
}

/** Styles présents dans le statut courant, pour relire une famille de coupes d'un coup. */
export async function feedStyles(
  status: FeedStatus,
): Promise<{ slug: string; n: number }[]> {
  return query<{ slug: string; n: number }>(
    `select c.slug, count(*)::int as n
       from feed_items f
       join haircut_catalog c on c.id = f.catalog_id
      where f.status = $1
      group by c.slug
      order by c.slug`,
    [status],
  );
}

export async function listFeed(opts: {
  status: FeedStatus;
  style: string;
  page: number;
  size: number;
}): Promise<FeedRow[]> {
  return query<FeedRow>(
    `select f.id,
            f.kind::text as kind,
            f.status,
            f.name, f.descr, f.tag,
            f.hair::text as hair,
            f.mood, f.loves, f.image_url, f.gen_meta,
            c.slug as catalog_slug,
            f.created_at,
            count(*) over ()::int as total_count
       from feed_items f
       left join haircut_catalog c on c.id = f.catalog_id
      where f.status = $1
        and ($2 = '' or c.slug = $2)
      order by f.created_at desc, f.id
      limit $3 offset $4`,
    [opts.status, opts.style, opts.size, (opts.page - 1) * opts.size],
  );
}
