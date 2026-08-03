import { supabase } from './supabase';
import { tr } from './i18n';

export type Pack = {
  id: string;
  credits: number;
  /** Display string straight from the table, e.g. "2,99 €". Not a number: the table owns the copy. */
  price: string;
  /** Per-credit display string, e.g. "0,15 €". */
  unit: string;
  badge: string | null;
  /** Paddle price id. NULL until the pack is wired up in that environment's Paddle catalogue. */
  paddle_price_id: string | null;
};

/**
 * The paywall's offers, read from `credit_packs` — the SAME rows the app's recharge screen uses.
 *
 * Web prices deliberately match the store prices. Paddle's negotiated rate is a flat 10% with no
 * fixed fee, so the small tiers stay profitable (0,99 € -> 0,89 € net against 0,20 € of AI), and
 * matching removes any cross-channel arbitrage story.
 *
 * That equality is what keeps this simple: no `channel` column, no web-only rows, and therefore no
 * "OTA before migration" dance, because installed clients keep seeing exactly the packs they always
 * saw. The only schema change Paddle needs is a nullable `paddle_price_id` on these rows.
 *
 * Reading the table rather than hardcoding also means a price change is one SQL update, applied to
 * both surfaces at once. A hardcoded copy here would silently drift.
 */
export async function fetchPacks(): Promise<Pack[]> {
  const { data, error } = await supabase
    .from('credit_packs')
    .select('id, credits, price, unit, badge, paddle_price_id')
    .order('credits');
  if (error || !data) {
    console.warn('[packs] unavailable', error?.message);
    return [];
  }
  return data as Pack[];
}

/** The table stores a machine badge; the copy lives here. */
export function badgeLabel(badge: string | null): string | null {
  if (badge === 'popular') return tr().packs.popular;
  if (badge === 'best') return tr().packs.best;
  return null;
}

/** Which pack starts selected: the flagged one, else the middle of the ladder. */
export function defaultPackId(packs: Pack[]): string | undefined {
  return (packs.find((p) => p.badge === 'popular') ?? packs[Math.floor(packs.length / 2)] ?? packs[0])?.id;
}
