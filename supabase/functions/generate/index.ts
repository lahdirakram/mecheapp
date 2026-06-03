// POST /functions/v1/generate
// Body: { selfieBase64, mimeType, brief }
// Auth: user JWT. Checks the credit balance, runs the AI try-on (Gemini, or mock fallback),
// stores selfie + result in Storage, records the generation, decrements 1 credit.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { cors } from '../_shared/cors.ts';
import { buildPrompt, generateWithGemini, mockResult, type Brief } from '../_shared/tryon.ts';

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

    const { selfieBase64, mimeType = 'image/jpeg', brief = {} } = (await req.json()) as {
      selfieBase64?: string;
      mimeType?: string;
      brief?: Brief;
    };
    if (!selfieBase64) return json({ error: 'missing_selfie' }, 400);

    // Strip a `data:<mime>;base64,` prefix if present (expo-camera returns it on web).
    let selfie = selfieBase64;
    let mt = mimeType;
    const pfx = selfie.match(/^data:(.+?);base64,/);
    if (pfx) {
      mt = pfx[1];
      selfie = selfie.slice(pfx[0].length);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // credit gate
    const { data: txs } = await admin.from('credit_transactions').select('delta').eq('user_id', user.id);
    const balance = (txs ?? []).reduce((s, r) => s + (r.delta as number), 0);
    if (balance <= 0) return json({ error: 'no_credits' }, 402);

    // generate
    const prompt = buildPrompt(brief);
    const result = GEMINI_API_KEY
      ? await generateWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL, selfieB64: selfie, mimeType: mt, prompt })
      : mockResult(selfie, mt);

    // store
    const genId = crypto.randomUUID();
    const selfiePath = `${user.id}/${genId}-in.jpg`;
    const outExt = result.mimeType.includes('png') ? 'png' : 'jpg';
    const resultPath = `${user.id}/${genId}-out.${outExt}`;
    await admin.storage.from('selfies').upload(selfiePath, decodeBase64(selfie), { contentType: mt, upsert: true });
    await admin.storage.from('generated').upload(resultPath, decodeBase64(result.base64), { contentType: result.mimeType, upsert: true });

    // record + decrement
    const match = Math.round(88 + Math.random() * 9);
    await admin.from('generations').insert({ id: genId, user_id: user.id, selfie_path: selfiePath, brief, result_path: resultPath, match });
    await admin.from('credit_transactions').insert({ user_id: user.id, delta: -1, reason: 'generation' });

    // Return only the Storage path (not the multi-MB base64) — the client builds a public URL
    // and loads the image directly. Keeps the function's CPU/response small (avoids the local
    // edge runtime's early-termination on big payloads).
    return json({
      id: genId,
      resultPath,
      mimeType: result.mimeType,
      match,
      creditsLeft: balance - 1,
      provider: GEMINI_API_KEY ? 'gemini' : 'mock',
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    // Provider quota / rate limit (e.g. Gemini image gen on a non-billed project) → 503, not 500.
    const quota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    return json({ error: quota ? 'ai_quota' : 'generation_failed', detail: msg }, quota ? 503 : 500);
  }
});
