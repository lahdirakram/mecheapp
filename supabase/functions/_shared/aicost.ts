// Coût exact d'un appel Gemini + journalisation dans public.ai_calls (0036).
//
// Le coût est calculé DEPUIS l'usageMetadata renvoyé par l'API, au tarif en vigueur au moment de
// l'appel, et figé en base. Recalculer l'historique avec un tarif d'aujourd'hui réécrirait des
// factures passées ; c'est pour ça que la table stocke cost_micro_usd ET l'usage brut (audit).
//
// Tarifs : https://ai.google.dev/gemini-api/docs/pricing (palier payant, vérifiés le 2026-08-04).
// En USD parce que Google facture en USD — la conversion EUR est un choix d'affichage du
// backoffice, pas une donnée. Si un tarif change, mettre à jour ICI et dans scripts/gen-feed.mjs
// (copie assumée : le script Node ne peut pas importer un module Deno).

export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  /** Tokens de "réflexion" (2.5 flash) : facturés au tarif de SORTIE. */
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
  promptTokensDetails?: { modality?: string; tokenCount?: number }[];
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
};

// micro-USD par token = USD par million de tokens (1 M de tokens × 1 µ$ = 1 $).
type Rates = { input: number; outputText: number; outputImage: number };
const RATE_TABLE: { match: RegExp; rates: Rates }[] = [
  // gemini-2.5-flash-image : sortie image 30 $/M tokens (1290 tokens par image ≤ 1024px ≈ 0,039 $).
  { match: /flash-image/, rates: { input: 0.3, outputText: 2.5, outputImage: 30 } },
  // gemini-2.5-flash (texte, avec image en entrée) : 0,30 $/M entrée, 2,50 $/M sortie.
  { match: /flash/, rates: { input: 0.3, outputText: 2.5, outputImage: 30 } },
];
// Modèle inconnu : on prend le tarif flash plutôt que 0 — surévaluer un peu vaut mieux que faire
// disparaître un coût du tableau de bord.
const DEFAULT_RATES: Rates = { input: 0.3, outputText: 2.5, outputImage: 30 };

export function costMicroUsd(model: string, u: GeminiUsage): number {
  const rates = RATE_TABLE.find((r) => r.match.test(model))?.rates ?? DEFAULT_RATES;
  const input = u.promptTokenCount ?? 0;
  const imageOut = (u.candidatesTokensDetails ?? [])
    .filter((d) => d.modality === 'IMAGE')
    .reduce((s, d) => s + (d.tokenCount ?? 0), 0);
  const textOut = Math.max(0, (u.candidatesTokenCount ?? 0) - imageOut) + (u.thoughtsTokenCount ?? 0);
  return Math.round(input * rates.input + textOut * rates.outputText + imageOut * rates.outputImage);
}

export type AiCallLog = {
  kind: 'try_on' | 'refine_normalize' | 'suggest';
  model: string;
  user_id?: string | null;
  generation_id?: string | null;
  /** La ligne suggest_calls servie par cet appel (renvoyée par reserve_suggest_call_v2, 0037). */
  suggest_call_id?: string | null;
  /** 2 = le retry. Google facture les deux appels, donc les deux lignes existent. */
  attempt?: number;
  ok: boolean;
  error?: string | null;
  usage?: GeminiUsage | null;
};

/**
 * Une ligne par appel sortant, best-effort : la journalisation ne doit JAMAIS casser une
 * génération déjà payée, donc tout échec d'insert est avalé (avec un warn pour les logs).
 * `usage` peut manquer (HTTP non-2xx : pas de JSON, probablement pas facturé) — la ligne est
 * quand même écrite pour que les tentatives restent comptables.
 */
// deno-lint-ignore no-explicit-any
export async function logAiCall(admin: any, row: AiCallLog): Promise<void> {
  try {
    const u = row.usage ?? null;
    const { error } = await admin.from('ai_calls').insert({
      kind: row.kind,
      model: row.model,
      user_id: row.user_id ?? null,
      generation_id: row.generation_id ?? null,
      suggest_call_id: row.suggest_call_id ?? null,
      attempt: row.attempt ?? 1,
      ok: row.ok,
      error: row.error ? String(row.error).slice(0, 500) : null,
      prompt_tokens: u?.promptTokenCount ?? null,
      output_tokens: u ? (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) : null,
      total_tokens: u?.totalTokenCount ?? null,
      cost_micro_usd: u ? costMicroUsd(row.model, u) : null,
      usage: u,
    });
    if (error) console.warn('ai_calls insert failed:', error.message ?? error);
  } catch (e) {
    console.warn('ai_calls insert failed:', String(e instanceof Error ? e.message : e));
  }
}
