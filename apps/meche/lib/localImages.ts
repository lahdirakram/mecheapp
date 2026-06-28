// Local-first image cache. Private storage images (selfies, generated results) used to be downloaded
// from Supabase on every display via a signed URL, and only kept in expo-image's evictable disk cache
// — under memory pressure or after an app update that cache is wiped, so the same photo re-downloads
// again and again. That repeated traffic is the egress we want to kill.
//
// Here we persist each image once into the app's private document directory (NOT the photo gallery)
// and render it from a stable `file://` URI forever after. Supabase stays the durable backup: we only
// hit the network (mint a signed URL + download) on a real cache miss — first view, reinstall, or new
// device. Same device, same image → zero egress on every later view.
import { useQueries, useQuery } from '@tanstack/react-query';
import { useSupabase } from '@meche/api-client';
import { Directory, File, Paths } from 'expo-file-system';

const cacheDir = new Directory(Paths.document, 'imgcache');

function ensureDir() {
  if (!cacheDir.exists) cacheDir.create({ intermediates: true });
}

// Stable, collision-free local filename for a (bucket, path) pair. Path keeps the user-id folder +
// generation id, so two users' files never collide and the name is deterministic across sessions.
function fileFor(bucket: string, path: string): File {
  const safe = `${bucket}__${path}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new File(cacheDir, safe);
}

// Resolve one private storage path to a local `file://` URI. Returns the cached file immediately when
// present; otherwise mints a short-lived signed URL (no egress — just an API call) and downloads the
// bytes once into the cache. Throws on miss+download failure (offline etc.) so the caller can fall back.
async function resolveLocal(
  sb: ReturnType<typeof useSupabase>,
  bucket: string,
  path: string
): Promise<string> {
  const f = fileFor(bucket, path);
  if (f.exists && f.size > 0) return f.uri;
  ensureDir();
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error ?? new Error('sign failed');
  const dl = await File.downloadFileAsync(data.signedUrl, f, { idempotent: true });
  return dl.uri;
}

// Batch version for grids (wardrobe, profile). Resolves each path with its OWN query (one per image)
// so cards fill in incrementally as each download lands — not all-at-once after the slowest one. The
// per-path key is shared with `useLocalImage`, so the same image resolved here and on the before/after
// screens hits one cache entry. External http(s) URLs (curated feed photos) are skipped — callers pass
// those straight through.
//
// Returns:
//   - `data`: path -> local `file://` URI map (only resolved entries; a download that failed is absent)
//   - `pending`: the set of paths still downloading, so a card can show a loader (not the "no image"
//     illustration) while its bytes are in flight.
export function useLocalImages(bucket: string, paths: (string | null | undefined)[]) {
  const sb = useSupabase();
  const list = [...new Set(paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p)))].sort();
  const results = useQueries({
    queries: list.map((path) => ({
      queryKey: ['localimg', bucket, path],
      // file:// URIs are permanent — once resolved there's nothing to refetch.
      staleTime: Infinity,
      gcTime: Infinity,
      queryFn: () => resolveLocal(sb, bucket, path),
    })),
  });
  const data: Record<string, string> = {};
  const pending = new Set<string>();
  results.forEach((r, i) => {
    const path = list[i];
    if (r.data) data[path] = r.data;
    else if (r.isPending) pending.add(path);
  });
  return { data, pending };
}

// Pick what URI to render for a single image, given its `useLocalImage` query and a network fallback
// (the signed URL). Order matters so we NEVER download the same image twice:
//   - local file ready          -> the file:// URI (zero egress)
//   - query idle / disabled      -> the fallback (no usable path, or already-resolved with no local)
//   - download failed            -> the fallback (last-resort network fetch)
//   - still downloading          -> null, i.e. a placeholder; we don't hand the signed URL to
//                                   expo-image meanwhile, which would fetch the bytes a second time.
export function localFirstUri(
  query: { data?: string; isError: boolean; fetchStatus: string },
  fallback: string | null | undefined
): string | null {
  if (query.data) return query.data;
  if (query.fetchStatus === 'idle') return fallback ?? null;
  if (query.isError) return fallback ?? null;
  return null;
}

// Single-path version for the before/after screens (result, share). Same local-first contract.
export function useLocalImage(bucket: string, path: string | null | undefined) {
  const sb = useSupabase();
  const usable = !!path && !/^https?:\/\//.test(path);
  return useQuery({
    queryKey: ['localimg', bucket, path ?? ''],
    enabled: usable,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => resolveLocal(sb, bucket, path as string),
  });
}
