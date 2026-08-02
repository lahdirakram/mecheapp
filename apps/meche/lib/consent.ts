import AsyncStorage from '@react-native-async-storage/async-storage';

// Ad-measurement consent, the single switch behind Google Consent Mode, the Meta SDK and the
// TikTok SDK (see lib/marketing.ts). Per-device like the push preference: consent is about THIS
// phone's identifiers, not the account. Three states matter, not two — `null` (never asked) is
// what makes the first-launch prompt show exactly once, so don't collapse it into 'denied'.
export type AdConsent = 'granted' | 'denied';

const KEY = 'meche.adConsent';

let cached: AdConsent | null | undefined; // undefined = not read from disk yet
const listeners = new Set<(c: AdConsent) => void>();

export async function getAdConsent(): Promise<AdConsent | null> {
  if (cached !== undefined) return cached;
  try {
    const v = await AsyncStorage.getItem(KEY);
    cached = v === 'granted' || v === 'denied' ? v : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function setAdConsent(c: AdConsent): Promise<void> {
  cached = c;
  try {
    await AsyncStorage.setItem(KEY, c);
  } catch {
    /* the in-memory value still drives this session */
  }
  listeners.forEach((fn) => fn(c));
}

/** Fires on every explicit choice (first prompt AND later changes from the profile). */
export function onAdConsentChange(fn: (c: AdConsent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * True when no choice is stored yet. WHEN to ask is ConsentGate's decision (currently: as soon as
 * a session exists, so the screen lands right after signup and anonymous browsers are never
 * nagged). Two variants were tried and rejected on 2026-08-01: cold first-launch popup (felt
 * hostile, everyone refuses) and "after first value" delay (silently dropped the first unlock
 * purchase from every ad platform). Do NOT merge this into the signup CGU acceptance either:
 * GDPR requires SPECIFIC consent, a choice bundled with legal texts is invalid (art. 7,
 * Planet49) and is what CNIL fines. A dedicated checkbox alongside the CGU is the legal shape.
 */
export async function shouldPromptConsent(): Promise<boolean> {
  return (await getAdConsent()) === null;
}
