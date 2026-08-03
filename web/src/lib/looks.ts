import { supabase } from './supabase';
import { getLang, tr } from './i18n';

export type Look = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** True when it came from the community feed rather than the editorial catalogue. */
  fromFeed: boolean;
};

type FeedRow = {
  id: string;
  name: Record<string, string> | null;
  image_url: string | null;
  kind: string | null;
};

/**
 * The picker's inspiration strip.
 *
 * Filters on `status = 'published'` explicitly. `feed_items` is world-readable, and 0014 added the
 * draft/published gate on the `feed_for_user` RPC only, so a plain select would happily hand back
 * unreviewed AI drafts. Curation happens in the backoffice and must be respected here too.
 */
export async function fetchLooks(limit = 8): Promise<Look[]> {
  const { data, error } = await supabase
    .from('feed_items')
    .select('id, name, image_url, kind')
    .eq('status', 'published')
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[looks] feed unavailable', error.message);
    return [];
  }

  // `name` is an i18n object on feed rows; prefer the active language, then the other, then a label.
  const lang = getLang();
  return (data as FeedRow[]).map((row) => ({
    id: row.id,
    name: row.name?.[lang] ?? row.name?.fr ?? row.name?.en ?? tr().looks.fallbackName,
    imageUrl: publicFeedUrl(row.image_url),
    fromFeed: row.kind === 'user' || row.kind === 'community',
  }));
}

/** `feed` is a public bucket, so no signing. Rows may hold a bare path or an absolute URL. */
function publicFeedUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return supabase.storage.from('feed').getPublicUrl(value).data.publicUrl;
}
