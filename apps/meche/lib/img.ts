// A Supabase signed URL rotates its `?token=...` on every session, which changes the URL and busts
// expo-image's cache → the same image re-downloads each time (repeated egress). The path before the
// query is stable, so use it as a cacheKey: each private image then downloads once per device and
// stays on disk. Non-storage URLs (data:, external feed photos) keep their default caching.
export function cacheKeyFor(uri?: string | null): string | undefined {
  if (!uri || !uri.includes('/storage/v1/')) return undefined;
  return uri.split('?')[0];
}
