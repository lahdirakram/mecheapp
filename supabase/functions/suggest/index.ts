// POST /functions/v1/suggest
// Body: { selfieBase64, mimeType, lang, exclude? }
// Auth: user JWT. Asks the LLM to read the selfie and propose ONE haircut as TEXT. This is free —
// only the actual image generation (/generate) costs a credit. Returns { name, description,
// reasons, prompt }. The client shows the text; on accept it calls /generate with `prompt`.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/cors.ts';
import { mockSuggestion, suggestWithGemini } from '../_shared/tryon.ts';
import { parseImageInput } from '../_shared/validate.ts';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
  const GEMINI_TEXT_MODEL = Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-2.5-flash';

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { selfieBase64, mimeType = 'image/jpeg', lang = 'fr', exclude = [] } = (await req.json()) as {
      selfieBase64?: string;
      mimeType?: string;
      lang?: 'fr' | 'en';
      exclude?: string[];
    };
    // The client controls `exclude`, and it's injected into the prompt — cap the count + per-item
    // length so it can't be abused as a free-text / prompt-injection channel.
    const safeExclude = (Array.isArray(exclude) ? exclude : []).slice(-6).map((s) => String(s).slice(0, 40));

    // No key, or no selfie → canned suggestion so the flow always works.
    if (!GEMINI_API_KEY || !selfieBase64) {
      return json({ ...mockSuggestion(lang, safeExclude), provider: 'mock' });
    }

    // Validate the image (size cap, MIME allowlist, valid base64) before sending it to the model.
    let selfie: string;
    let mt: string;
    try {
      const img = parseImageInput(selfieBase64, mimeType);
      selfie = img.base64;
      mt = img.mimeType;
    } catch (e) {
      return json({ error: 'invalid_image', detail: String(e instanceof Error ? e.message : e) }, 400);
    }

    // Rate-limit this free, paid-model-backed endpoint per user — concurrency-safe (advisory-locked
    // count+insert in a single RPC, so parallel requests can't bypass the cap).
    const admin = createClient(SUPABASE_URL, SERVICE);
    const SUGGEST_HOURLY_CAP = Number(Deno.env.get('SUGGEST_HOURLY_CAP') ?? '20'); // per user
    const SUGGEST_DAILY_CAP = Number(Deno.env.get('SUGGEST_DAILY_CAP') ?? '20000'); // global backstop, all users
    const { data: allowed, error: rlErr } = await admin.rpc('reserve_suggest_call', { p_user: user.id, p_max: SUGGEST_HOURLY_CAP, p_daily_max: SUGGEST_DAILY_CAP });
    if (rlErr) throw rlErr;
    if (!allowed) return json({ error: 'rate_limited' }, 429);

    const suggestion = await suggestWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_TEXT_MODEL, selfieB64: selfie, mimeType: mt, lang, exclude: safeExclude });
    return json({ ...suggestion, provider: 'gemini' });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return json({ error: 'ai_quota' }, 503);
    return json({ error: 'suggest_failed', detail: msg }, 500);
  }
});
