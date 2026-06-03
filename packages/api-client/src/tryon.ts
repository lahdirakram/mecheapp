import type { TryOnBrief } from '@meche/core';

/**
 * Provider-agnostic AI try-on contract. The default implementation is Gemini image-edit
 * (identity-preserving), living in supabase/functions/generate. Swap to fal.ai / Replicate /
 * a commercial hairstyle API without touching app code by adding another implementation.
 */
export interface TryOnInput {
  /** Source selfie as base64 (no data: prefix) or a Storage signed URL. */
  selfie: string;
  brief: TryOnBrief;
}

export interface TryOnResult {
  /** Generated image as base64 (no data: prefix). */
  image: string;
  mimeType: string;
  /** Optional model-reported match/confidence 0–100. */
  match?: number;
}

export interface TryOnProvider {
  readonly id: 'gemini' | 'fal' | 'replicate' | 'mock';
  generate(input: TryOnInput): Promise<TryOnResult>;
}
