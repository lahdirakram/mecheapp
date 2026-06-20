// POST /functions/v1/delete-account
// Auth: user JWT. Permanently deletes the caller's account — required by the App Store for any app
// with account creation. Removes the user's private images (storage isn't cascaded), then deletes
// the auth user, which cascades EVERY DB row (profiles → credits, generations, looks, devices, ...)
// via the ON DELETE CASCADE chain in 0001_init.sql.
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

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Storage first — deleting the auth user does NOT remove their files. Both buckets store objects
    // under a folder named after the uid (e.g. `<uid>/<genId>-out.png`). Paginate so a heavy user
    // doesn't leave files behind past the first page.
    for (const bucket of ['selfies', 'generated']) {
      const PAGE = 100;
      // Always list from offset 0: each page is deleted before the next list, so the just-deleted
      // files are gone and offset 0 returns the remaining ones. (Incrementing offset would skip a
      // page each round.) Safety cap to avoid an infinite loop if a delete silently fails.
      for (let guard = 0; guard < 10000; guard++) {
        const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: PAGE });
        if (!files || files.length === 0) break;
        await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
        if (files.length < PAGE) break;
      }
    }

    // Then the auth user → cascades all DB rows referencing it.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return json({ error: 'delete_failed', detail: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: 'delete_failed', detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});
