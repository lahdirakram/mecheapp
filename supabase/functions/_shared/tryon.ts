// Provider-agnostic AI try-on for the Edge runtime. GeminiProvider is the default; MockProvider
// (echoes the selfie) keeps the whole pipeline working before a key is set.

export interface Brief {
  prompt?: string;
  lookName?: string;
  length?: number; // 0–1
  color?: string; // readable name, e.g. "Caramel"
  fringe?: number; // 0–1
}
export interface TryOnResult {
  base64: string;
  mimeType: string;
}

export function buildPrompt(brief: Brief): string {
  const len = brief.length == null ? '' : brief.length < 0.34 ? 'noticeably shorter' : brief.length < 0.67 ? 'medium length' : 'longer';
  const fr = brief.fringe == null ? '' : brief.fringe < 0.34 ? 'no fringe' : brief.fringe < 0.67 ? 'a light fringe' : 'curtain bangs';
  const desc = [brief.prompt || brief.lookName || 'a flattering modern haircut', len, brief.color ? `hair color ${brief.color}` : '', fr].filter(Boolean).join(', ');
  return (
    `Photorealistic editorial portrait. Restyle ONLY the hair of the person in the provided selfie to: ${desc}. ` +
    `Keep the exact same face, identity, skin tone, expression, framing and lighting. ` +
    `Natural salon-quality result. No text, no watermark.`
  );
}

// Refine prompt: TWO images are sent — image 1 is the original selfie (the identity to preserve),
// image 2 is the previously generated look the user is iterating on. We keep image 2's hairstyle as
// the starting point and apply the user's adjustment on top, while keeping image 1's face.
export function buildRefinePrompt(_prevBrief: Brief, change: string): string {
  // SINGLE-image edit of the previous result. `change` is expected to be a clear English imperative
  // (see normalizeRefinement) — lead with it so it dominates, then minimal guard-rails.
  const c = change.trim().replace(/[.?!]+$/, '');
  return (
    `Edit this photo of a person. ${c}. ` +
    `This change applies to the HAIR only — keep the exact same face, identity, skin tone, expression, ` +
    `head pose, framing, lighting and background. Make the change clearly visible; do not return the ` +
    `photo unchanged. Photorealistic, salon-quality. No text, no watermark.`
  );
}

// Turn a short, possibly non-English hair tweak ("moins de couleur", "plus court", "sans frange")
// into ONE unambiguous English imperative for the image editor. Negations/reductions are the whole
// point — a raw foreign phrase dropped into the English edit prompt made the model do the opposite
// (it added color for "moins de couleur"). Best-effort: callers fall back to the raw text on failure.
export async function normalizeRefinement(opts: { apiKey: string; model: string; instruction: string }): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;
  const instruction =
    `Rewrite this short hairstyle-change request as ONE clear, unambiguous English imperative for an ` +
    `image editor that edits ONLY hair. Preserve the EXACT intent — especially reductions, removals and ` +
    `negations (e.g. "moins de couleur" -> "Make the hair color less saturated and more natural"; ` +
    `"sans frange" -> "Remove the fringe"; "plus court" -> "Make the hair noticeably shorter"). ` +
    `Add nothing the user did not ask for. Output ONLY the imperative sentence. Request: "${opts.instruction}"`;
  const body = { contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { temperature: 0.2 } };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const text: string = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  return text.trim() || opts.instruction;
}

export async function generateWithGemini(opts: {
  apiKey: string;
  model: string;
  selfieB64: string;
  mimeType: string;
  prompt: string;
  /** Optional second reference image (e.g. the previous result during a refine pass). */
  refImageB64?: string;
  refMimeType?: string;
}): Promise<TryOnResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;
  // Image 1 = selfie (identity), then the optional reference image, then the instruction text.
  const reqParts: Array<Record<string, unknown>> = [{ inline_data: { mime_type: opts.mimeType, data: opts.selfieB64 } }];
  if (opts.refImageB64) reqParts.push({ inline_data: { mime_type: opts.refMimeType ?? 'image/png', data: opts.refImageB64 } });
  reqParts.push({ text: opts.prompt });
  const body = {
    contents: [{ role: 'user', parts: reqParts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  // deno-lint-ignore no-explicit-any
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData || p.inline_data);
  const data = img?.inlineData?.data ?? img?.inline_data?.data;
  if (!data) throw new Error('gemini: no image in response');
  const outMime = img?.inlineData?.mimeType ?? img?.inline_data?.mime_type ?? 'image/png';
  return { base64: data, mimeType: outMime };
}

/** Fallback: echo the selfie back as the "result" so the flow runs without a key. */
export function mockResult(selfieB64: string, mimeType: string): TryOnResult {
  return { base64: selfieB64, mimeType };
}

// ─── Textual suggestion ("L'IA te propose") ──────────────────────────────────
// An LLM looks at the selfie and proposes ONE flattering cut as text. The user reads it and,
// if they like it, we run the (paid) image generation from `prompt`.
export interface Suggestion {
  name: string; // short evocative name, e.g. "Carré flou caramel"
  description: string; // 1–2 sentences: why it suits them
  reasons: string[]; // 3–4 short tags
  prompt: string; // detailed English hair description fed to the image generator
}

export async function suggestWithGemini(opts: {
  apiKey: string;
  model: string;
  selfieB64: string;
  mimeType: string;
  lang: 'fr' | 'en';
  exclude?: string[];
}): Promise<Suggestion> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.apiKey}`;
  const langName = opts.lang === 'fr' ? 'French' : 'English';
  const avoid = opts.exclude?.length ? ` Do NOT propose any of these again: ${opts.exclude.join('; ')}. Offer a clearly different style.` : '';
  const instruction =
    `You are an expert hairstylist. Study this person's photo — face shape, current hair (length, texture, color), and overall vibe. ` +
    `Propose exactly ONE flattering, on-trend haircut and color that would genuinely suit them.${avoid} ` +
    `Write "name", "description" and "reasons" in ${langName}. "name" is a short evocative salon name (max 4 words). ` +
    `"description" is 1–2 warm sentences explaining why it suits this person specifically. ` +
    `"reasons" is 3–4 very short tags (2–3 words each). ` +
    `"prompt" must be in ENGLISH: a detailed description of ONLY the target hair (cut, length, texture, color, fringe) for an image generator, with no mention of the face.`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ inline_data: { mime_type: opts.mimeType, data: opts.selfieB64 } }, { text: instruction }],
      },
    ],
    generationConfig: {
      temperature: 1.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: { type: 'STRING' },
          reasons: { type: 'ARRAY', items: { type: 'STRING' } },
          prompt: { type: 'STRING' },
        },
        required: ['name', 'description', 'reasons', 'prompt'],
      },
    },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const text: string = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('gemini: empty suggestion');
  const parsed = JSON.parse(text) as Suggestion;
  // Nothing is truncated here — a full, detailed suggestion is what we want, and /generate accepts up
  // to 1000 chars (rejecting only genuine abuse), so the prompt always passes through intact.
  return {
    name: parsed.name?.trim() || (opts.lang === 'fr' ? 'Ta coupe sur-mesure' : 'Your tailored cut'),
    description: parsed.description?.trim() || '',
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 4) : [],
    prompt: parsed.prompt?.trim() || parsed.name || 'a flattering modern haircut',
  };
}

/** Fallback suggestions (no key) — rotates so "Une autre" still feels alive. */
export function mockSuggestion(lang: 'fr' | 'en', exclude: string[] = []): Suggestion {
  const all: Suggestion[] = [
    {
      name: lang === 'fr' ? 'Carré flou caramel' : 'Soft caramel bob',
      description: lang === 'fr' ? 'Un carré effilé qui adoucit les traits et capte la lumière.' : 'A wispy bob that softens the features and catches the light.',
      reasons: lang === 'fr' ? ['Visage ovale', 'Effet volume', 'Entretien facile'] : ['Oval face', 'Adds volume', 'Low upkeep'],
      prompt: 'a soft, textured chin-length bob with caramel balayage and wispy ends',
    },
    {
      name: lang === 'fr' ? 'Wolf cut audacieux' : 'Bold wolf cut',
      description: lang === 'fr' ? 'Des couches désstructurées pour un style moderne et plein de caractère.' : 'Choppy layers for a modern, full-of-character look.',
      reasons: lang === 'fr' ? ['Style streetwear', 'Mouvement', 'Tendance 2026'] : ['Streetwear vibe', 'Movement', '2026 trend'],
      prompt: 'a shaggy textured wolf cut with curtain bangs and natural brown tones',
    },
    {
      name: lang === 'fr' ? 'Pixie texturé miel' : 'Honey textured pixie',
      description: lang === 'fr' ? 'Une coupe courte lumineuse qui met le regard en valeur.' : 'A bright short cut that puts the focus on your eyes.',
      reasons: lang === 'fr' ? ['Met le regard', 'Léger', 'Frais'] : ['Highlights eyes', 'Light', 'Fresh'],
      prompt: 'a tousled short pixie cut with piecey texture and warm honey highlights',
    },
  ];
  return all.find((s) => !exclude.includes(s.name)) ?? all[0];
}
