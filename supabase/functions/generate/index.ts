// POST /functions/v1/generate
// Body: { selfieBase64, mimeType, brief, name }
// Auth: user JWT. Checks the credit balance + free-tier caps, reserves 1 credit, then records a
// PENDING generation and its wardrobe look and RETURNS IMMEDIATELY. The AI try-on (Gemini, or mock
// fallback) runs in the background (EdgeRuntime.waitUntil): on success it stores the result and
// flips the rows to 'done'; on failure it refunds the credit and removes the empty look. So a
// try-on survives the user leaving the loader — it appears in "Mes mèches" when ready.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64, encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { cors } from '../_shared/cors.ts';
import { buildPrompt, buildRefinePrompt, generateWithGemini, mockResult, normalizeRefinement, type Brief } from '../_shared/tryon.ts';
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
  const GEMINI_TEXT_MODEL = Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-2.5-flash';

  // Hoisted so the outer catch can refund the reservation if a synchronous setup step fails.
  let admin: Admin | null = null;
  let resvId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { selfieBase64, mimeType = 'image/jpeg', brief = {}, name, refineFrom } = (await req.json()) as {
      selfieBase64?: string;
      mimeType?: string;
      brief?: Brief;
      name?: string;
      /** When set, refine a previous (done) generation: keep its selfie as the "before" and EDIT its
       *  previous result image with the new brief — all reloaded server-side (no client selfie). */
      refineFrom?: string;
    };

    admin = createClient(SUPABASE_URL, SERVICE);

    // `selfie`/`mt` = the image STORED as this generation's selfie_path (the "before"). `modelB64`/
    // `modelMime` = the SINGLE image actually sent to the model. They differ on a refine: the before
    // stays the original selfie, but the model edits the PREVIOUS RESULT (single-image edit is what the
    // model follows best — sending two images made it copy the previous look and ignore the tweak).
    let selfie: string;
    let mt: string;
    let modelB64: string;
    let modelMime: string;
    let genBrief: Brief = brief;
    let prompt: string;

    if (refineFrom) {
      // Refine pass — the source images live in storage; reload them instead of trusting the client.
      const { data: prev } = await admin
        .from('generations')
        .select('selfie_path, result_path, brief, user_id, status')
        .eq('id', refineFrom)
        .maybeSingle();
      if (!prev || prev.user_id !== user.id) return json({ error: 'not_found' }, 404);
      if (prev.status !== 'done' || !prev.selfie_path || !prev.result_path) return json({ error: 'not_refinable' }, 400);
      const refinement = (brief.prompt ?? '').trim();
      if (!refinement) return json({ error: 'empty_refinement' }, 400);

      const [sBlob, rBlob] = await Promise.all([
        admin.storage.from('selfies').download(prev.selfie_path as string),
        admin.storage.from('generated').download(prev.result_path as string),
      ]);
      if (sBlob.error || rBlob.error || !sBlob.data || !rBlob.data) throw new Error('refine_source_missing');
      // before = the ORIGINAL selfie (unchanged across refines); the model edits the PREVIOUS RESULT.
      selfie = encodeBase64(new Uint8Array(await sBlob.data.arrayBuffer()));
      mt = (prev.selfie_path as string).endsWith('.png') ? 'image/png' : 'image/jpeg';
      modelB64 = encodeBase64(new Uint8Array(await rBlob.data.arrayBuffer()));
      modelMime = (prev.result_path as string).endsWith('.png') ? 'image/png' : 'image/jpeg';
      const prevBrief = (prev.brief ?? {}) as Brief;
      // Normalize the (often French, often negated) tweak into a clear English imperative so the image
      // model honors it ("moins de couleur" → "less saturated", not "add color"). Best-effort: fall
      // back to the raw text. One cheap text call, bounded to this single refine.
      let change = refinement;
      if (GEMINI_API_KEY) {
        try {
          change = await normalizeRefinement({ apiKey: GEMINI_API_KEY, model: GEMINI_TEXT_MODEL, instruction: refinement });
        } catch {
          /* keep the raw instruction */
        }
      }
      // Keep a readable record of what the USER asked (their own words), carrying the look name forward.
      genBrief = { ...prevBrief, prompt: refinement, lookName: name?.trim() || prevBrief.lookName };
      prompt = buildRefinePrompt(prevBrief, change);
    } else {
      // Fresh try-on — validate + normalize the client image (size cap, MIME allowlist, valid base64).
      try {
        const img = parseImageInput(selfieBase64, mimeType);
        selfie = img.base64;
        mt = img.mimeType;
      } catch (e) {
        return json({ error: 'invalid_image', detail: String(e instanceof Error ? e.message : e) }, 400);
      }
      modelB64 = selfie;
      modelMime = mt;
      prompt = buildPrompt(brief);
    }

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
      // Hard ceiling on uncompensated AI spend (free/ad looks). Expressed as a DAILY EURO BUDGET ÷ the
      // estimated per-look cost — the gate still counts `generations` rows (the only real-time signal;
      // Google bills async, and a "live euro spend" would just be count × unit price anyway). Upside:
      // when the price moves, change one var (GEN_COST_PER_LOOK_EUR) and the €/day budget holds.
      // Default: €20/day ÷ €0.04 = 500 looks. GEN_DAILY_CAP still wins as an explicit count override.
      const COST_PER_LOOK = Number(Deno.env.get('GEN_COST_PER_LOOK_EUR') ?? '0.04');
      const DAILY_BUDGET = Number(Deno.env.get('GEN_DAILY_BUDGET_EUR') ?? '20');
      const DAILY_CAP = Number(Deno.env.get('GEN_DAILY_CAP') ?? Math.floor(DAILY_BUDGET / COST_PER_LOOK));
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
    const { data: rid, error: resvErr } = await admin.rpc('reserve_generation_credit', { p_user: user.id });
    if (resvErr) throw resvErr;
    if (!rid) return json({ error: 'no_credits' }, 402);
    resvId = rid as string;

    const selfiePath = `${user.id}/${genId}-in.jpg`;
    // Store the selfie now so the before/after is available even while the result is still pending.
    const { error: upErr } = await admin.storage.from('selfies').upload(selfiePath, decodeBase64(selfie), { contentType: mt, upsert: true });
    if (upErr) throw upErr;

    // Pending generation + its wardrobe look. image_url / result_path stay null until the AI
    // finishes; the wardrobe shows a "generating" placeholder meanwhile (driven by status).
    const { error: genErr } = await admin.from('generations').insert({ id: genId, user_id: user.id, selfie_path: selfiePath, brief: genBrief, status: 'pending' });
    if (genErr) throw genErr;
    const lookName = (name && name.trim()) || (genBrief.lookName || genBrief.prompt || '').slice(0, 40) || 'Ma mèche';
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
          let result;
          if (GEMINI_API_KEY) {
            // Gemini's image model intermittently replies with text only ("no image in response"),
            // or briefly rate-limits. Retry AT MOST ONCE on those recoverable cases — every call is a
            // paid image generation, so the retry is strictly capped to bound cost. Anything else
            // surfaces immediately. (`prompt`/`modelB64` were resolved synchronously above.)
            const call = () => generateWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, selfieB64: modelB64, mimeType: modelMime, prompt });
            try {
              result = await call();
            } catch (e) {
              const m = String(e instanceof Error ? e.message : e);
              if (!/no image|RESOURCE_EXHAUSTED|429|50\d/.test(m)) throw e;
              await new Promise((r) => setTimeout(r, 400));
              result = await call();
            }
          } else {
            result = mockResult(modelB64, modelMime);
          }
          const outExt = result.mimeType.includes('png') ? 'png' : 'jpg';
          const resultPath = `${user.id}/${genId}-out.${outExt}`;
          const { error: outErr } = await admin.storage.from('generated').upload(resultPath, decodeBase64(result.base64), { contentType: result.mimeType, upsert: true });
          if (outErr) throw outErr; // failed upload → fall to catch (mark failed + refund), no orphan "done"
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
    // A synchronous step failed after the credit was reserved → refund it. The background path has
    // its own refund and is only scheduled once setup fully succeeds, so there's no double refund.
    if (resvId && admin) {
      try {
        await admin.from('credit_transactions').delete().eq('id', resvId);
      } catch {
        /* best-effort refund */
      }
    }
    const msg = String(e instanceof Error ? e.message : e);
    return json({ error: 'generation_failed', detail: msg }, 500);
  }
});
