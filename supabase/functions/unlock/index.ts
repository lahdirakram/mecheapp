// POST /functions/v1/unlock
// Body: { generationId, discard? }
// Auth: user JWT. Reveals a locked first-try result (0026): charges 1 credit atomically via the
// unlock_generation RPC (debit BEFORE reveal — the clear path is predictable, so nothing readable
// may exist there until the charge committed), then moves the clear image vault → generated and
// points the row/look at it. With { discard: true } it only erases the vault object (no charge):
// called when the user deletes a still-locked look, because the client has zero access to `vault`
// and the deletion the UI promises must also cover the clear face image.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/cors.ts';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { generationId, discard } = (await req.json()) as { generationId?: string; discard?: boolean };
    if (!generationId || typeof generationId !== 'string') return json({ error: 'not_found' }, 404);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: gen } = await admin
      .from('generations')
      .select('id, user_id, status, locked, result_path, vault_path')
      .eq('id', generationId)
      .maybeSingle();
    if (!gen || gen.user_id !== user.id) return json({ error: 'not_found' }, 404);
    // Owning the row is not owning the path (same defence in depth as generate's refine): the admin
    // client bypasses storage RLS, so never touch a vault path outside the caller's own folder.
    if (gen.vault_path && !(gen.vault_path as string).startsWith(`${user.id}/`)) return json({ error: 'not_found' }, 404);

    if (discard) {
      // Deletion path: erase the clear renditions, keep everything else. No charge, idempotent.
      if (gen.vault_path) {
        await admin.storage.from('vault').remove([gen.vault_path as string, `${user.id}/${generationId}-thumb.jpg`]);
        await admin.from('generations').update({ vault_path: null }).eq('id', generationId);
      }
      return json({ ok: true });
    }

    // Charge + flip atomically in the DB (advisory-locked, idempotent via external_id 'unlock:<gen>').
    const { data: res, error: rpcErr } = await admin.rpc('unlock_generation', { p_user: user.id, p_gen: generationId });
    if (rpcErr) throw rpcErr;
    const outcome = res as { error?: string; tx_id?: string };
    if (outcome.error === 'no_credits') return json({ error: 'no_credits' }, 402);
    if (outcome.error === 'not_ready') return json({ error: 'not_ready' }, 409);
    if (outcome.error === 'not_found') return json({ error: 'not_found' }, 404);
    if (outcome.error === 'already_unlocked') {
      // Idempotent success so client retries (recharge poll + result CTA) are always safe.
      return json({ ok: true, alreadyUnlocked: true, resultPath: gen.result_path });
    }

    // Debit committed — now reveal. The renditions MOVE from vault to `generated` server-side: the
    // bytes never travel through this function, which used to download ~2 MB and upload it straight
    // back. Compensate on failure (delete the debit, re-lock) so nobody pays for a reveal that did
    // not happen.
    const txId = outcome.tx_id as string;
    const teaserPath = gen.result_path as string | null; // superseded once the clear image lands
    try {
      if (!gen.vault_path) throw new Error('vault_missing');
      const clearPath = gen.vault_path as string; // `<uid>/<genId>-out.jpg` — same path, new bucket
      const thumbPath = `${user.id}/${generationId}-thumb.jpg`;

      const { error: moveErr } = await admin.storage.from('vault').move(clearPath, clearPath, { destinationBucket: 'generated' });
      if (moveErr) {
        // A previous attempt may already have moved it: the client retries this call from the
        // result screen. Only treat it as a real failure when the file is confirmed absent.
        const slash = clearPath.lastIndexOf('/');
        const { data: found } = await admin.storage.from('generated').list(clearPath.slice(0, slash), { search: clearPath.slice(slash + 1) });
        if (!found?.length) throw moveErr;
      }
      // The thumbnail is an optimisation: rows created before thumbnails existed have none, and a
      // missing one only means grids fall back to the full image.
      const { error: thumbErr } = await admin.storage.from('vault').move(thumbPath, thumbPath, { destinationBucket: 'generated' });

      await admin.from('generations').update({ result_path: clearPath, thumb_path: thumbErr ? null : thumbPath, vault_path: null }).eq('id', generationId);
      await admin.from('looks').update({ image_url: clearPath }).eq('generation_id', generationId);
      // The blurred teaser is now unreferenced. Best-effort: a leftover is inert, and the reconcile
      // cron never touches paths the row no longer points at.
      if (teaserPath && teaserPath !== clearPath) await admin.storage.from('generated').remove([teaserPath]);
      return json({ ok: true, resultPath: clearPath });
    } catch (e) {
      await admin.from('credit_transactions').delete().eq('id', txId);
      await admin.from('generations').update({ locked: true, unlocked_at: null }).eq('id', generationId);
      return json({ error: 'unlock_failed', detail: String(e instanceof Error ? e.message : e) }, 500);
    }
  } catch (e) {
    return json({ error: 'unlock_failed', detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});
