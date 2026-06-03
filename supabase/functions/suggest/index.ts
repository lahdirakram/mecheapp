// POST /functions/v1/suggest
// Body: { selfieBase64, mimeType, lang, exclude? }
// Auth: user JWT. Asks the LLM to read the selfie and propose ONE haircut as TEXT. This is free —
// only the actual image generation (/generate) costs a credit. Returns { name, description,
// reasons, prompt }. The client shows the text; on accept it calls /generate with `prompt`.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cors } from '../_shared/cors.ts';
import { mockSuggestion, suggestWithGemini } from '../_shared/tryon.ts';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
  const GEMINI_TEXT_MODEL = Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-2.5-flash';

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: 'unauthorized' }, 401);

    const { selfieBase64, mimeType = 'image/jpeg', lang = 'fr', exclude = [] } = (await req.json()) as {
      selfieBase64?: string;
      mimeType?: string;
      lang?: 'fr' | 'en';
      exclude?: string[];
    };

    // No key, or no selfie → canned suggestion so the flow always works.
    if (!GEMINI_API_KEY || !selfieBase64) {
      return json({ ...mockSuggestion(lang, exclude), provider: 'mock' });
    }

    // Strip a `data:<mime>;base64,` prefix (expo-camera returns it on web).
    let selfie = selfieBase64;
    let mt = mimeType;
    const pfx = selfie.match(/^data:(.+?);base64,/);
    if (pfx) {
      mt = pfx[1];
      selfie = selfie.slice(pfx[0].length);
    }

    const suggestion = await suggestWithGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_TEXT_MODEL, selfieB64: selfie, mimeType: mt, lang, exclude });
    return json({ ...suggestion, provider: 'gemini' });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return json({ error: 'ai_quota' }, 503);
    return json({ error: 'suggest_failed', detail: msg }, 500);
  }
});
