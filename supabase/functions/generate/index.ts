// POST /functions/v1/generate
// Body: { selfieBase64, mimeType, brief, name }
// Auth: user JWT. Checks the credit balance + free-tier caps, stores the selfie, records a PENDING
// generation and its wardrobe look, and RETURNS IMMEDIATELY. The AI try-on (Gemini, or mock
// fallback) runs in the background (EdgeRuntime.waitUntil), which is where the credit is reserved:
// immediately before the Gemini call, the only step that costs money. On success it stores the
// result and flips the rows to 'done'; on failure it refunds the credit and marks the look failed
// (the look is KEPT, so the user sees a failed card and can retry). So a try-on survives the user
// leaving the loader — it appears in "Mes mèches" when ready.
//
// The ordering above is load-bearing, see 0030: nothing between the reservation and the paid call
// may be slow or memory-hungry, because a hard worker kill in that window spends a credit that no
// catch can refund.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64, encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { cors } from '../_shared/cors.ts';
import { buildPrompt, buildRefinePrompt, generateWithGemini, mockResult, normalizeRefinement, type Brief } from '../_shared/tryon.ts';
import { logAiCall, type GeminiUsage } from '../_shared/aicost.ts';
import { parseImageInput } from '../_shared/validate.ts';
import { encodeJpeg, makeTeaser, FULL_QUALITY, SELFIE_EDGE, SELFIE_QUALITY, THUMB_EDGE, THUMB_QUALITY } from '../_shared/images.ts';

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

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { selfieBase64, mimeType = 'image/jpeg', brief = {}, name, refineFrom, clientName, supportsLocked } = (await req.json()) as {
      selfieBase64?: string;
      mimeType?: string;
      brief?: Brief;
      name?: string;
      /** When set, refine a previous (done) generation: keep its selfie as the "before" and EDIT its
       *  previous result image with the new brief — all reloaded server-side (no client selfie). */
      refineFrom?: string;
      /** Pro app: optional client first name, stored on the look for the per-client history. */
      clientName?: string;
      /** Client can render a locked (teaser) result. Old JS omits it and keeps clear delivery until
       *  LOCKED_FIRST_TRY=force (a forged request omitting it is only worth one clear first try). */
      supportsLocked?: boolean;
    };

    // Untrusted free-text: the UI caps these (idea prompt 240, refine 120), but a direct API call can't
    // be trusted. REJECT an abusive payload rather than truncate it — a clamp would silently corrupt a
    // long-but-legit prompt and degrade the result. Ceiling sits far above any real prompt: production
    // data shows suggestion prompts reach ~574 chars (p99 ~474), so 1000 clears them with margin while
    // still refusing genuine multi-KB abuse (no Gemini call, no cost).
    const MAX_PROMPT = 1000;
    if (typeof brief.prompt === 'string' && brief.prompt.length > MAX_PROMPT) {
      return json({ error: 'prompt_too_long' }, 400);
    }
    // `name` is a short display label (derived from the prompt/suggestion), safe to cap defensively.
    const safeName = typeof name === 'string' ? name.slice(0, 80) : name;

    const admin: Admin = createClient(SUPABASE_URL, SERVICE);

    // ── Pro path (Mèche Pro app) ────────────────────────────────────────────────────────────────
    // Pros don't use the B2C credit ledger: 3 lifetime free try-ons to discover the Studio, then an
    // active subscription (granted by the RevenueCat webhook into `subscriptions`) with a hard
    // monthly quota. Enforced HERE, never client-side, so the paid Gemini call stays capped.
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isPro = prof?.role === 'pro';
    let proQuotaLeft = 0;
    // Hoisted out of the `if` below: the cost guards further down need to know whether this pro is
    // actually PAYING. A pro on the free trial is uncompensated spend like any free-tier user.
    let subActive = false;
    if (isPro) {
      const PRO_FREE_TRIALS = Number(Deno.env.get('PRO_FREE_TRIALS') ?? '3');
      const PRO_MONTHLY_QUOTA = Number(Deno.env.get('PRO_MONTHLY_QUOTA') ?? '100');
      const { data: sub } = await admin.from('subscriptions').select('current_period_end').eq('owner_id', user.id).maybeSingle();
      subActive = !!sub?.current_period_end && new Date(sub.current_period_end as string).getTime() > Date.now();
      if (subActive) {
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const { count: monthCount } = await admin
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString());
        if ((monthCount ?? 0) >= PRO_MONTHLY_QUOTA) return json({ error: 'pro_quota_exceeded' }, 402);
        proQuotaLeft = PRO_MONTHLY_QUOTA - (monthCount ?? 0) - 1;
      } else {
        const { count: lifetime } = await admin
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if ((lifetime ?? 0) >= PRO_FREE_TRIALS) return json({ error: 'pro_subscription_required' }, 402);
        proQuotaLeft = PRO_FREE_TRIALS - (lifetime ?? 0) - 1;
      }
    }

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

    // Créé ici (et non à l'enqueue) pour que l'appel de normalisation d'un refine, journalisé dans
    // ai_calls (0036), puisse déjà pointer sur l'essai qu'il sert.
    const genId = crypto.randomUUID();

    if (refineFrom) {
      // Refine pass — the source images live in storage; reload them instead of trusting the client.
      const { data: prev } = await admin
        .from('generations')
        .select('selfie_path, result_path, brief, user_id, status, locked')
        .eq('id', refineFrom)
        .maybeSingle();
      if (!prev || prev.user_id !== user.id) return json({ error: 'not_found' }, 404);
      if (prev.status !== 'done' || !prev.selfie_path || !prev.result_path) return json({ error: 'not_refinable' }, 400);
      // A locked result's result_path is the low-res teaser; refining it would edit 160px garbage.
      if (prev.locked) return json({ error: 'not_refinable' }, 400);
      // Owning the ROW is not owning the PATH. The two downloads below use the ADMIN client, which
      // bypasses storage RLS, so a path pointing outside the caller's own folder would hand back
      // somebody else's photo. 0021 removed the client's write access to `generations`, but this
      // stays as defence in depth: it holds for any future writer of these columns too.
      const ownsPath = (p: string) => p.startsWith(`${user.id}/`);
      if (!ownsPath(prev.selfie_path as string) || !ownsPath(prev.result_path as string)) {
        return json({ error: 'not_found' }, 404);
      }
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
        let nUsage: GeminiUsage | undefined;
        try {
          change = await normalizeRefinement({ apiKey: GEMINI_API_KEY, model: GEMINI_TEXT_MODEL, instruction: refinement, onUsage: (u) => (nUsage = u) });
          await logAiCall(admin, { kind: 'refine_normalize', model: GEMINI_TEXT_MODEL, user_id: user.id, generation_id: genId, ok: true, usage: nUsage });
        } catch (e) {
          /* keep the raw instruction */
          await logAiCall(admin, { kind: 'refine_normalize', model: GEMINI_TEXT_MODEL, user_id: user.id, generation_id: genId, ok: false, error: String(e instanceof Error ? e.message : e), usage: nUsage });
        }
      }
      // Keep a readable record of what the USER asked (their own words), carrying the look name forward.
      genBrief = { ...prevBrief, prompt: refinement, lookName: safeName?.trim() || prevBrief.lookName };
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
    // Pro users skip the whole ledger (their quota was enforced above).
    let balance = 0;
    const { data: txs } = isPro
      ? { data: [] }
      : await admin
          .from('credit_transactions')
          .select('delta, reason, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
    const txList = (txs ?? []) as { delta: number; reason: string }[];

    // Walk the history keeping two running balances. Generations are charged to the FREE pool first
    // so purchased credits stay in reserve as long as possible. Replaying in order (rather than
    // summing) means a later ad-reward can't retroactively reclassify an older paid look.
    // `admin_grant` (0029) counts as PAID: a credit granted from the backoffice is meant to be a real
    // one, so it must lift the lock below exactly like a purchase. `refund` (0039) is paid-side too:
    // it's the webhook clawing back a refunded pack (negative delta), or re-granting on
    // REFUND_REVERSED (positive) — either way it moves purchased credits. Keep this in lockstep with
    // the same replay in packages/api-client/src/queries.ts (useCreditSummary), which drives what the
    // client shows — the two disagreeing means promising credits the server won't honour.
    let free = 0; // free_trial + ad rewards + promos
    let paid = 0; // purchased packs + admin grants + refund clawbacks
    for (const tx of txList) {
      if (tx.reason === 'purchase' || tx.reason === 'admin_grant' || tx.reason === 'refund') paid += tx.delta;
      else if (tx.reason === 'generation') {
        if (free > 0) free -= 1;
        else paid -= 1;
      } else if (tx.delta > 0) free += tx.delta;
    }
    balance = free + paid;
    if (!isPro && balance <= 0) return json({ error: 'no_credits' }, 402);

    // A user who still holds ANY purchased credit is exempt from the free-tier caps below — a
    // paying customer is never blocked, even on their first look. The caps apply only once all
    // purchased credits are spent and the look is drawn from a free/ad credit.
    //
    // A pro is exempt ONLY while subscribed. The trial used to be exempt too, on the assumption
    // that "bounded at 3 lifetime" was cap enough — but that bound is a COUNT OF `generations`
    // ROWS, and the client could delete its own rows (fixed in 0021). Any fresh account can also
    // call claim_pro_role() (0020). So `isPro` alone opened an unlimited, unrated, unbudgeted path
    // to the paid model. A free trial is uncompensated spend and belongs under the same ceiling as
    // every other free look.
    const isPaidLook = (isPro && subActive) || paid > 0;

    // Locked first try: a look drawn from the FREE pool while the user holds no purchased credits is
    // delivered as a low-res teaser; the clear image waits in the vault bucket until `unlock` charges
    // 1 credit for it (see 0026). Anyone holding a purchased credit always gets clear delivery.
    // Modes: unset/'0' = off (kill switch), '1' = respect the client capability flag (OTA
    // transition), 'force' = lock every eligible generation (closes the forged-request hole).
    // The switch normally lives in app_config (0027) so the CLIENT reads the same value and swaps
    // its presentation in lockstep; the env var, when set, overrides it (emergency lever).
    let lockedMode = Deno.env.get('LOCKED_FIRST_TRY') ?? '';
    if (!lockedMode && !isPro) {
      const { data: cfg } = await admin.from('app_config').select('value').eq('key', 'locked_first_try').maybeSingle();
      lockedMode = (cfg?.value as string | undefined) ?? '';
    }
    const lockResult =
      !isPro && paid <= 0 && lockedMode !== '' && lockedMode !== '0' && (lockedMode === 'force' || supportsLocked === true);

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

    // ── Enqueue (all synchronous, so the client gets a definitive answer fast) ────────────────
    // Deliberately NO credit reservation here. Everything from this point down to the Gemini call
    // is free — encoding, uploading, two inserts — so holding a credit across it buys nothing and
    // opens a window in which the credit can be lost for good (0030). The encode below is also the
    // step most likely to kill the worker, which makes it a useful free canary: when it dies now,
    // the user keeps their credit and can retry.
    const selfiePath = `${user.id}/${genId}-in.jpg`;
    // Store the selfie now so the before/after is available even while the result is still pending.
    // Phone cameras hand us ~500 KB even at reduced quality, and this copy exists only to be shown
    // as the "before" on a phone screen, so it is stored at display size (~120 KB). NOTE: this is
    // the STORED copy only — `modelB64` keeps the full-resolution bytes, because degrading what
    // Gemini sees would degrade the product itself. Fail-open: keep the original on any error.
    let selfieBytes = decodeBase64(selfie);
    try {
      selfieBytes = await encodeJpeg(selfieBytes, { maxEdge: SELFIE_EDGE, quality: SELFIE_QUALITY });
    } catch (e) {
      console.warn('selfie downscale failed, storing as captured:', String(e instanceof Error ? e.message : e));
    }
    const { error: upErr } = await admin.storage.from('selfies').upload(selfiePath, selfieBytes, { contentType: 'image/jpeg', upsert: true });
    if (upErr) throw upErr;

    // Pending generation + its wardrobe look. image_url / result_path stay null until the AI
    // finishes; the wardrobe shows a "generating" placeholder meanwhile (driven by status).
    const { error: genErr } = await admin.from('generations').insert({ id: genId, user_id: user.id, selfie_path: selfiePath, brief: genBrief, status: 'pending', locked: lockResult });
    if (genErr) throw genErr;
    const lookName = (safeName && safeName.trim()) || (genBrief.lookName || genBrief.prompt || '').slice(0, 40) || 'Ma mèche';
    const safeClient = typeof clientName === 'string' && clientName.trim() ? clientName.trim().slice(0, 40) : null;
    const { data: look, error: lookErr } = await admin
      .from('looks')
      .insert({ user_id: user.id, name: lookName, generation_id: genId, loved: false, client_name: safeClient })
      .select('id')
      .single();
    if (lookErr) throw lookErr;

    // ── Background work: the actual AI call. Runs after the response is sent; the runtime keeps
    // the worker alive until it settles, so it completes even if the client disconnects. ────────
    EdgeRuntime.waitUntil(
      (async () => {
        let resvId: string | null = null;
        try {
          // The credit buys exactly ONE paid Gemini call, so it is reserved HERE, with nothing
          // between it and that call. Atomicity is unchanged (0009 / 0030): the RPC takes the
          // per-user advisory lock BEFORE reading the balance, so N concurrent requests sharing one
          // credit still yield exactly one paid call — the losers get null and return below without
          // ever reaching Gemini. Moving this call site did not weaken that ceiling, because the
          // ceiling lives in the RPC, not in the order its caller does things.
          // Pros have no credits to reserve; their spend is bounded by the quota checks above.
          if (!isPro) {
            const { data: rid, error: resvErr } = await admin.rpc('reserve_generation_credit', { p_user: user.id, p_gen: genId });
            if (resvErr) throw resvErr;
            if (!rid) {
              // Lost the race for the last credit. Nothing charged, nothing generated. KEEP the
              // look as a 'failed' card, same as any other failure, so the user gets feedback and a
              // retry rather than a look that silently never resolves.
              await admin.from('generations').update({ status: 'failed', error: 'no_credits' }).eq('id', genId);
              await notifyUser(admin, user.id, 'failed', lookName, genId, look.id);
              return;
            }
            resvId = rid as string;
          }
          let result;
          if (GEMINI_API_KEY) {
            // Gemini's image model intermittently replies with text only ("no image in response"),
            // or briefly rate-limits. Retry AT MOST ONCE on those recoverable cases — every call is a
            // paid image generation, so the retry is strictly capped to bound cost. Anything else
            // surfaces immediately. (`prompt`/`modelB64` were resolved synchronously above.)
            // Chaque tentative écrit sa ligne ai_calls (0036), succès comme échec : Google facture
            // le retry comme un appel plein, et un refus est facturé en tokens d'entrée — l'usage
            // arrive via onUsage AVANT le throw, donc la ligne d'échec porte quand même son coût.
            const call = async (attempt: number) => {
              let usage: GeminiUsage | undefined;
              try {
                const r = await generateWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, selfieB64: modelB64, mimeType: modelMime, prompt, onUsage: (u) => (usage = u) });
                await logAiCall(admin, { kind: 'try_on', model: GEMINI_MODEL, user_id: user.id, generation_id: genId, attempt, ok: true, usage });
                return r;
              } catch (e) {
                await logAiCall(admin, { kind: 'try_on', model: GEMINI_MODEL, user_id: user.id, generation_id: genId, attempt, ok: false, error: String(e instanceof Error ? e.message : e), usage });
                throw e;
              }
            };
            // Politique de retry, dimensionnée sur le coût RÉEL mesuré par le registre (0036) :
            // une réponse « no image » (IMAGE_OTHER / NO_IMAGE, l'essentiel de nos échecs prod,
            // 27 sur un mois) est facturée en tokens d'ENTRÉE seulement (~400 µ$), pas au prix
            // d'une image (39 000 µ$). Réessayer est donc quasi gratuit tant que ça échoue, et ne
            // coûte le prix plein que si ça réussit — exactement ce qu'on veut payer. D'où :
            // jusqu'à 3 retries à délais croissants (400 ms d'écart tombait souvent sur le même
            // état défaillant). Les erreurs de quota/serveur gardent UN seul retry : là on ne veut
            // pas insister pendant un incident. Un refus (« blocked ») n'est jamais retenté.
            // Pire cas borné : 4 appels sans image ≈ 1 600 µ$ (0,2 centime).
            const NO_IMAGE_DELAYS = [800, 2000, 5000];
            const TRANSIENT_DELAYS = [400];
            let attempt = 0;
            for (;;) {
              try {
                result = await call(++attempt);
                break;
              } catch (e) {
                const m = String(e instanceof Error ? e.message : e);
                const delays = /no image/.test(m) ? NO_IMAGE_DELAYS : /RESOURCE_EXHAUSTED|429|50\d/.test(m) ? TRANSIENT_DELAYS : [];
                const delay = delays[attempt - 1];
                if (delay == null) throw e;
                await new Promise((r) => setTimeout(r, delay));
              }
            }
          } else {
            result = mockResult(modelB64, modelMime);
          }
          // Everything is stored as JPEG, never as the PNG the model returns: same picture, about a
          // tenth of the bytes, and egress is the bill that scales with users. The thumbnail exists
          // so grids never pull the full image into a 180px box.
          const raw = decodeBase64(result.base64);
          const full = await encodeJpeg(raw, { quality: FULL_QUALITY });
          const thumb = await encodeJpeg(raw, { maxEdge: THUMB_EDGE, quality: THUMB_QUALITY });
          const match = Math.round(88 + Math.random() * 9);
          let delivered = false;
          if (lockResult) {
            // Locked delivery: the clear image goes to the client-inaccessible `vault` bucket and only
            // a ~160px teaser reaches `generated`. FAIL-OPEN: if any teaser step breaks, fall through
            // to the clear path below (with locked flipped off) — a revenue experiment must never break
            // the product, and the Gemini cost is already spent. A vault object left behind by a partial
            // failure is inert (unreadable by the client, erased by delete-account).
            try {
              const clearPath = `${user.id}/${genId}-out.jpg`;
              const clearThumbPath = `${user.id}/${genId}-thumb.jpg`;
              const teaserPath = `${user.id}/${genId}-teaser.jpg`;
              // Both clear renditions wait in the vault. Storing the thumbnail there too (rather
              // than making it at unlock time) is what lets `unlock` reveal with two server-side
              // moves and never pull a byte through the function.
              const { error: vaultErr } = await admin.storage.from('vault').upload(clearPath, full, { contentType: 'image/jpeg', upsert: true });
              if (vaultErr) throw vaultErr;
              const { error: vaultThumbErr } = await admin.storage.from('vault').upload(clearThumbPath, thumb, { contentType: 'image/jpeg', upsert: true });
              if (vaultThumbErr) throw vaultThumbErr;
              const teaser = await makeTeaser(raw);
              const { error: teaserErr } = await admin.storage.from('generated').upload(teaserPath, teaser, { contentType: 'image/jpeg', upsert: true });
              if (teaserErr) throw teaserErr;
              // While locked, the teaser is ALSO the grid thumbnail: it is already tiny, and a sharp
              // thumbnail in a client-readable bucket would hand over what the blur is hiding.
              await admin.from('generations').update({ status: 'done', result_path: teaserPath, thumb_path: teaserPath, vault_path: clearPath, match }).eq('id', genId);
              await admin.from('looks').update({ image_url: teaserPath }).eq('id', look.id);
              delivered = true;
            } catch (e) {
              console.warn('teaser pipeline failed, delivering clear:', String(e instanceof Error ? e.message : e));
            }
          }
          if (!delivered) {
            const resultPath = `${user.id}/${genId}-out.jpg`;
            const thumbPath = `${user.id}/${genId}-thumb.jpg`;
            const { error: outErr } = await admin.storage.from('generated').upload(resultPath, full, { contentType: 'image/jpeg', upsert: true });
            if (outErr) throw outErr; // failed upload → fall to catch (mark failed + refund), no orphan "done"
            // The thumbnail is an optimisation, not the product: if it fails, serve the full image in
            // grids (what happened before) rather than failing a generation the user already paid for.
            const { error: thumbErr } = await admin.storage.from('generated').upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: true });
            if (thumbErr) console.warn('thumbnail upload failed, grids fall back to the full image:', thumbErr.message);
            // locked:false covers the teaser fail-open — a locked row must never carry a clear result_path.
            await admin.from('generations').update({ status: 'done', result_path: resultPath, thumb_path: thumbErr ? null : thumbPath, match, locked: false }).eq('id', genId);
            await admin.from('looks').update({ image_url: resultPath }).eq('id', look.id);
          }
          await notifyUser(admin, user.id, 'done', lookName, genId, look.id);
        } catch (e) {
          const msg = String(e instanceof Error ? e.message : e);
          // Mark failed and refund the reserved credit. KEEP the look (status drives a "failed" card
          // in "Mes mèches") so the user gets clear feedback + a retry, instead of it silently
          // vanishing on them. (No reservation to refund on the pro path.)
          await admin.from('generations').update({ status: 'failed', error: msg }).eq('id', genId);
          if (resvId) await admin.from('credit_transactions').delete().eq('id', resvId);
          await notifyUser(admin, user.id, 'failed', lookName, genId, look.id);
        }
      })(),
    );

    // The client navigates away or watches the loader (polling the generation row) — either way the
    // work is now decoupled from this request.
    return json({ id: genId, lookId: look.id, status: 'pending', creditsLeft: isPro ? proQuotaLeft : balance - 1, provider: GEMINI_API_KEY ? 'gemini' : 'mock' });
  } catch (e) {
    // Nothing to refund: the synchronous path no longer reserves anything, so a setup failure here
    // costs the user nothing and they retry with their credit intact. That is the whole point of
    // 0030 — do not reintroduce a reservation above this line.
    const msg = String(e instanceof Error ? e.message : e);
    return json({ error: 'generation_failed', detail: msg }, 500);
  }
});
