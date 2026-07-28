import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from './provider';

// Thin typed wrappers over Supabase tables + RLS. Screens consume these; rows come back in
// DB (snake_case) shape. Reference reads (feed/stylists/packs) work for anon and authed users.

export function useProfile(userId: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCredits(userId: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['credits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sb.rpc('my_credit_balance');
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

export function useFeed() {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data, error } = await sb.from('feed_items').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreditPacks() {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['packs'],
    queryFn: async () => {
      const { data, error } = await sb.from('credit_packs').select('*').order('credits');
      if (error) throw error;
      return data;
    },
  });
}

export function useStylists() {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['stylists'],
    queryFn: async () => {
      const { data, error } = await sb.from('stylists').select('*').order('rating', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Saved looks for "Mes mèches". Each generated look embeds its generation's status so the grid can
// show a "generating" placeholder for background try-ons; while any look is still pending we poll so
// it flips to the finished image on its own (the generation runs server-side, decoupled from the
// loader screen).
export function useWardrobe(userId: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['looks', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sb.from('looks').select('*, generation:generations(status)').eq('user_id', userId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      const rows = query.state.data as { generation?: { status?: string } | null }[] | undefined;
      return rows?.some((l) => l.generation?.status === 'pending') ? 4000 : false;
    },
  });
}

// Re-open a past generation's before/after: the selfie is private (signed URL), the result public.
export function useGeneration(id: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['generation', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from('generations').select('*').eq('id', id!).single();
      if (error) throw error;
      // Both buckets are private → sign on read.
      let selfieUrl: string | null = null;
      if (data.selfie_path) {
        const { data: signed } = await sb.storage.from('selfies').createSignedUrl(data.selfie_path as string, 3600);
        selfieUrl = signed?.signedUrl ?? null;
      }
      let resultUrl: string | null = null;
      if (data.result_path) {
        const { data: signed } = await sb.storage.from('generated').createSignedUrl(data.result_path as string, 3600);
        resultUrl = signed?.signedUrl ?? null;
      }
      // Expose raw storage paths too: the app prefers a durable local copy (downloaded once) and only
      // falls back to these signed URLs when the local cache misses and a re-download fails.
      return {
        selfieUrl,
        resultUrl,
        selfiePath: (data.selfie_path as string | null) ?? null,
        resultPath: (data.result_path as string | null) ?? null,
        match: (data.match as number | null) ?? null,
      };
    },
  });
}

// Batch-sign private storage paths for display (thumbnails). External http(s) URLs (e.g. curated
// feed photos) pass through untouched. Returns a path→signedURL map.
export function useSignedUrls(bucket: string, paths: (string | null | undefined)[]) {
  const sb = useSupabase();
  const list = [...new Set(paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p)))].sort();
  return useQuery({
    queryKey: ['signed', bucket, list.join('|')],
    enabled: list.length > 0,
    // Signed URLs are valid 3600s. WITHOUT this, the query re-runs on every mount/focus/poll and mints
    // FRESH URLs (the ?token rotates) → the image `uri` changes constantly. On Android expo-image then
    // re-blanks the picture on each uri change even with a stable cacheKey, so thumbnails flickered out
    // "every other time". Keep the same URLs for ~50min (well inside the 1h validity) so the uri is
    // stable; the on-disk cache (keyed by the stable path) means an expired token never needs a refetch.
    staleTime: 50 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const { data, error } = await sb.storage.from(bucket).createSignedUrls(list, 3600);
      if (error) throw error;
      (data ?? []).forEach((s) => {
        if (s.signedUrl && s.path) map[s.path] = s.signedUrl;
      });
      return map;
    },
  });
}

export function useSaveLook() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (look: {
      userId: string;
      name: string;
      hair?: string;
      mood?: string;
      tag?: string;
      imageUrl?: string;
      generationId?: string;
      loved?: boolean;
    }) => {
      const { data, error } = await sb
        .from('looks')
        .insert({
          user_id: look.userId,
          name: look.name,
          hair: look.hair ?? 'medium',
          mood: look.mood ?? 'warm',
          tag: look.tag ?? null,
          image_url: look.imageUrl ?? null,
          generation_id: look.generationId ?? null,
          loved: look.loved ?? false,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['looks'] }),
  });
}

export function useUnsaveLook() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    // Remove a feed-saved look (generation_id null) matched by its image.
    mutationFn: async ({ userId, imageUrl }: { userId: string; imageUrl: string }) => {
      const { error } = await sb.from('looks').delete().eq('user_id', userId).eq('image_url', imageUrl).is('generation_id', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['looks'] }),
  });
}

// Delete a saved look. For a generated essai the private files (selfie + result) are removed from
// storage too, so no photo lingers — but the `generations` ROW IS KEPT, with its paths nulled.
//
// Why keep the row: it is the RECEIPT for the credit that was spent. The debit in
// `credit_transactions` is permanent, so deleting the generation used to leave an unexplainable
// gap — no way to tell a credit legitimately spent from one lost to a bug. It also reset the
// counters that `generate` reads back: lifetime count for PRO_FREE_TRIALS, and the per-user
// hourly cap. Deleting looks therefore handed out extra free pro try-ons and reset the rate limit.
// The row carries no image once the paths are nulled — only status, brief and timestamps.
export function useDeleteLook() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lookId, generationId }: { lookId?: string; generationId?: string }) => {
      if (lookId) {
        const { error } = await sb.from('looks').delete().eq('id', lookId);
        if (error) throw error;
      }
      if (generationId) {
        const { data: g } = await sb.from('generations').select('selfie_path, result_path').eq('id', generationId).maybeSingle();
        const selfiePath = (g as { selfie_path?: string | null } | null)?.selfie_path;
        const resultPath = (g as { result_path?: string | null } | null)?.result_path;
        await Promise.all([
          selfiePath ? sb.storage.from('selfies').remove([selfiePath]) : Promise.resolve(),
          resultPath ? sb.storage.from('generated').remove([resultPath]) : Promise.resolve(),
        ]);
        // Via RPC: 0021 revoked the client's write access to `generations` outright, because the
        // server reads that table back with service_role (quota counters + the refine download).
        // Paths nulled only once the files are actually gone, so a failed removal can't leave a
        // row pointing at nothing.
        await sb.rpc('forget_generation_media', { p_gen: generationId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['looks'] }),
  });
}

export function useToggleLove() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, loved }: { id: string; loved: boolean }) => {
      const { error } = await sb.from('looks').update({ loved }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['looks'] }),
  });
}

// ─── Pro ────────────────────────────────────────────────────────────────────

// The signed-in pro's salon, with its stylist(s) and services. V1 is 1 owner = 1 salon; null →
// the onboarding screen. Oldest-first + limit(1) (NOT maybeSingle) so a stray duplicate row can
// never error the query and strand the user on onboarding.
export function useMySalon(userId: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['mysalon', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('salons')
        .select('*, stylists(*), services(*)')
        .eq('owner_id', userId!)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

// Onboarding: create the salon + its (single, V1) stylist in one go. The full row is written
// straight into the ['mysalon'] cache so the tabs gate sees it IMMEDIATELY — invalidate-then-
// navigate raced the refetch and bounced the user back to onboarding.
export function useCreateSalon() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ownerId: string; name: string; city?: string; stylistName: string }) => {
      const { data: salon, error } = await sb
        .from('salons')
        .insert({ owner_id: input.ownerId, name: input.name, city: input.city ?? null, area: input.city ?? null })
        .select('*')
        .single();
      if (error) throw error;
      const { data: stylist, error: stylistErr } = await sb
        .from('stylists')
        .insert({ salon_id: salon.id, profile_id: input.ownerId, name: input.stylistName })
        .select('*')
        .single();
      if (stylistErr) throw stylistErr;
      return { ...salon, stylists: [stylist], services: [] };
    },
    onSuccess: (salon, input) => {
      qc.setQueryData(['mysalon', input.ownerId], salon);
    },
  });
}

export function useUpdateSalon() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; name?: string; city?: string; phone?: string; bio?: string; hours_text?: string; cover_path?: string }) => {
      const { error } = await sb.from('salons').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mysalon'] }),
  });
}

// Replace the salon's service list (V1 editing is "the whole list at once" — a handful of rows).
export function useSaveServices() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ salonId, services }: { salonId: string; services: { name: string; price_est?: string; duration_min?: number }[] }) => {
      const { error: delErr } = await sb.from('services').delete().eq('salon_id', salonId);
      if (delErr) throw delErr;
      if (services.length) {
        const { error } = await sb.from('services').insert(services.map((s) => ({ ...s, salon_id: salonId })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mysalon'] }),
  });
}

export interface ProStatus {
  lifetime: number;
  month: number;
  sub_active: boolean;
  sub_status: string | null;
  period_end: string | null;
}

// Quota display for the Studio screen (enforcement is server-side in /generate).
export function useProStatus(userId: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['prostatus', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sb.rpc('my_pro_status');
      if (error) throw error;
      return data as ProStatus;
    },
  });
}

export function useAddPortfolioItem() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { stylistId: string; name: string; imagePath: string }) => {
      const { error } = await sb.from('portfolio_items').insert({ stylist_id: item.stylistId, name: item.name, image_path: item.imagePath });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

export function useDeletePortfolioItem() {
  const sb = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, imagePath }: { id: string; imagePath?: string | null }) => {
      const { error } = await sb.from('portfolio_items').delete().eq('id', id);
      if (error) throw error;
      if (imagePath) await sb.storage.from('portfolio').remove([imagePath]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

export function useRequests() {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const { data, error } = await sb.from('requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBookings() {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await sb.from('bookings').select('*').order('starts_at');
      if (error) throw error;
      return data;
    },
  });
}

export function usePortfolio(stylistId: string | undefined) {
  const sb = useSupabase();
  return useQuery({
    queryKey: ['portfolio', stylistId],
    enabled: !!stylistId,
    queryFn: async () => {
      const { data, error } = await sb.from('portfolio_items').select('*').eq('stylist_id', stylistId!);
      if (error) throw error;
      return data;
    },
  });
}
