// POST /functions/v1/generate
// Body: { selfieBase64, mimeType, brief, name }
// Auth: user JWT. Checks the credit balance + free-tier caps, reserves 1 credit, then records a
// PENDING generation and its wardrobe look and RETURNS IMMEDIATELY. The AI try-on (Gemini, or mock
// fallback) runs in the background (EdgeRuntime.waitUntil): on success it stores the result and
// flips the rows to 'done'; on failure it refunds the credit and removes the empty look. So a
// try-on survives the user leaving the loader — it appears in "Mes mèches" when ready.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { cors } from '../_shared/cors.ts';
import { buildPrompt, generateWithGemini, mockResult, type Brief } from '../_shared/tryon.ts';
import { parseImageInput } from '../_shared/validate.ts';

// Supabase Edge Runtime: keeps the worker alive to finish `promise` after the response is sent.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

// deno-lint-ignore no-explicit-any
type Admin = any;

// Fire an Expo push to all of the user's registered devices. Best-effort and never throws — a push
// failure must not affect the generation outcome. Copy follows the user's profile language.
async function notifyUser(admin: Admin, userId: string, kind: 'done' | 'failed', lookName: string, genId: string, lookId: string) {
  try {
    const { data: devices } = await admin.from('devices').select('expo_push_token').eq('user_id', userId);
    const tokens = (devices ?? []).map((d: { expo_push_token: string }) => d.expo_push_token).filter(Boolean);
    if (!tokens.length) return;

    const { data: prof } = await admin.from('profiles').select('lang').eq('id', userId).maybeSingle();
    const fr = (prof?.lang ?? 'fr') !== 'en';
    const title = kind === 'done' ? (fr ? 'Ta mèche est prête ✨' : 'Your look is ready ✨') : fr ? 'Génération impossible' : 'Generation failed';
    const body =
      kind === 'done'
        ? fr
          ? `${lookName} t'attend dans Mes mèches.`
          : `${lookName} is waiting in My looks.`
        : fr
          ? 'Ton crédit a été conservé. Réessaie quand tu veux.'
          : 'Your credit was kept. Try again anytime.';

    const messages = tokens.map((to: string) => ({ to, title, body, sound: 'default', priority: 'high', data: { type: 'generation', status: kind, generationId: genId, lookId } }));
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    /* push is best-effort */
  }
}

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
  const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-image';

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { selfieBase64, mimeType = 'image/jpeg', brief = {}, name } = (await req.json()) as {
      selfieBase64?: string;
      mimeType?: string;
      brief?: Brief;
      name?: string;
    };
    // Validate + normalize the image (size cap, MIME allowlist, valid base64) before any decode/upload.
    let selfie: string;
    let mt: string;
    try {
      const img = parseImageInput(selfieBase64, mimeType);
      selfie = img.base64;
      mt = img.mimeType;
    } catch (e) {
      return json({ error: 'invalid_image', detail: String(e instanceof Error ? e.message : e) }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Credit ledger, oldest first — we replay it to split the balance into free vs purchased pools.
    const { data: txs } = await admin
      .from('credit_transactions')
      .select('delta, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    const txList = (txs ?? []) as { delta: number; reason: string }[];

    // Walk the history keeping two running balances. Generations are charged to the FREE pool first
    // so purchased credits stay in reserve as long as possible. Replaying in order (rather than
    // summing) means a later ad-reward can't retroactively reclassify an older paid look.
    let free = 0; // free_trial + ad rewards + promos
    let paid = 0; // purchased packs
    for (const tx of txList) {
      if (tx.reason === 'purchase') paid += tx.delta;
      else if (tx.reason === 'generation') {
        if (free > 0) free -= 1;
        else paid -= 1;
      } else if (tx.delta > 0) free += tx.delta;
    }
    const balance = free + paid;
    if (balance <= 0) return json({ error: 'no_credits' }, 402);

    // A user who still holds ANY purchased credit is exempt from the free-tier caps below — a
    // paying customer is never blocked, even on their first look. The caps apply only once all
    // purchased credits are spent and the look is drawn from a free/ad credit.
    const isPaidLook = paid > 0;

    // Cost safety guards — only for UNCOMPENSATED looks (free-trial + ad-reward credits), applied
    // BEFORE we reserve the credit / kick off the paid Gemini call so a blocked request costs
    // nothing. Paid looks skip ALL of this: every call is covered by money the user spent.
    if (!isPaidLook) {
      // GEN_DAILY_CAP is the hard ceiling on uncompensated AI spend: ~€0.02/look, so 1000 looks ≈
      // €20/day max. Tune live with `supabase secrets set GEN_DAILY_CAP=N` (picked up next call).
      const DAILY_CAP = Number(Deno.env.get('GEN_DAILY_CAP') ?? '1000');
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await admin
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());
      if ((todayCount ?? 0) >= DAILY_CAP) return json({ error: 'daily_cap' }, 503);

      // Per-user hourly rate limit — stops a single free/farmed account from draining the cap.
      const USER_HOURLY_CAP = Number(Deno.env.get('GEN_USER_HOURLY_CAP') ?? '8');
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const { count: userHour } = await admin
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', hourAgo);
      if ((userHour ?? 0) >= USER_HOURLY_CAP) return json({ error: 'rate_limited' }, 429);
    }

    // ── Reserve + enqueue (all synchronous, so the client gets a definitive answer fast) ──────
    const genId = crypto.randomUUID();

    // Reserve 1 credit ATOMICALLY before any paid work: an advisory-locked check+decrement inside
    // the DB so concurrent /generate calls can't over-spend or fire multiple paid AI calls on the
    // same credit. Returns the reservation id, or null when no credit is left. Refunded on failure.
    const { data: resvId, error: resvErr } = await admin.rpc('reserve_generation_credit', { p_user: user.id });
    if (resvErr) throw resvErr;
    if (!resvId) return json({ error: 'no_credits' }, 402);

    const selfiePath = `${user.id}/${genId}-in.jpg`;
    // Store the selfie now so the before/after is available even while the result is still pending.
    await admin.storage.from('selfies').upload(selfiePath, decodeBase64(selfie), { contentType: mt, upsert: true });

    // Pending generation + its wardrobe look. image_url / result_path stay null until the AI
    // finishes; the wardrobe shows a "generating" placeholder meanwhile (driven by status).
    await admin.from('generations').insert({ id: genId, user_id: user.id, selfie_path: selfiePath, brief, status: 'pending' });
    const lookName = (name && name.trim()) || (brief.lookName || brief.prompt || '').slice(0, 40) || 'Ma mèche';
    const { data: look, error: lookErr } = await admin
      .from('looks')
      .insert({ user_id: user.id, name: lookName, generation_id: genId, loved: false })
      .select('id')
      .single();
    if (lookErr) throw lookErr;

    // ── Background work: the actual AI call. Runs after the response is sent; the runtime keeps
    // the worker alive until it settles, so it completes even if the client disconnects. ────────
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const prompt = buildPrompt(brief);
          let result;
          if (GEMINI_API_KEY) {
            // Gemini's image model intermittently replies with text only ("no image in response"),
            // or briefly rate-limits. Retry AT MOST ONCE on those recoverable cases — every call is a
            // paid image generation, so the retry is strictly capped to bound cost. Anything else
            // surfaces immediately.
            try {
              result = await generateWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, selfieB64: selfie, mimeType: mt, prompt });
            } catch (e) {
              const m = String(e instanceof Error ? e.message : e);
              if (!/no image|RESOURCE_EXHAUSTED|429|50\d/.test(m)) throw e;
              await new Promise((r) => setTimeout(r, 400));
              result = await generateWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, selfieB64: selfie, mimeType: mt, prompt });
            }
          } else {
            result = mockResult(selfie, mt);
          }
          const outExt = result.mimeType.includes('png') ? 'png' : 'jpg';
          const resultPath = `${user.id}/${genId}-out.${outExt}`;
          await admin.storage.from('generated').upload(resultPath, decodeBase64(result.base64), { contentType: result.mimeType, upsert: true });
          const match = Math.round(88 + Math.random() * 9);
          await admin.from('generations').update({ status: 'done', result_path: resultPath, match }).eq('id', genId);
          await admin.from('looks').update({ image_url: resultPath }).eq('id', look.id);
          await notifyUser(admin, user.id, 'done', lookName, genId, look.id);
        } catch (e) {
          const msg = String(e instanceof Error ? e.message : e);
          // Mark failed and refund the reserved credit. KEEP the look (status drives a "failed" card
          // in "Mes mèches") so the user gets clear feedback + a retry, instead of it silently
          // vanishing on them.
          await admin.from('generations').update({ status: 'failed', error: msg }).eq('id', genId);
          await admin.from('credit_transactions').delete().eq('id', resvId);
          await notifyUser(admin, user.id, 'failed', lookName, genId, look.id);
        }
      })(),
    );

    // The client navigates away or watches the loader (polling the generation row) — either way the
    // work is now decoupled from this request.
    return json({ id: genId, lookId: look.id, status: 'pending', creditsLeft: balance - 1, provider: GEMINI_API_KEY ? 'gemini' : 'mock' });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    return json({ error: 'generation_failed', detail: msg }, 500);
  }
});
