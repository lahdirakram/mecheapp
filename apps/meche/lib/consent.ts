import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { LEGAL_DOC_VERSION } from './legal';

// Ad-measurement consent, the single switch behind Google Consent Mode, the Meta SDK and the
// TikTok SDK (see lib/marketing.ts). Since 0040 the source of truth is the consent_events ledger
// in DB (the legal PROOF, and what makes a reinstall or a second device remember the answer);
// AsyncStorage is only a cache so the SDKs can start before the network answers. Three states
// matter, not two — `null` (never asked) is what makes the prompt show, so don't collapse it
// into 'denied'.
export type AdConsent = 'granted' | 'denied';
export type ConsentPurpose = 'terms' | 'privacy' | 'ads';
export type ConsentSource = 'gate' | 'profile' | 'backfill';

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

/** Local cache + SDK switch only. The DB proof is written separately via recordConsent. */
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
 * Append the expressed choices to the consent_events ledger (0040). One row per purpose, never an
 * update: withdrawing = a new 'denied' row, the full history is the proof. Best-effort by design:
 * if the insert fails, shouldPromptConsent finds no row next launch and shows the screen again,
 * so the proof self-heals through a fresh answer — do NOT add a local retry queue on top.
 */
export function recordConsent(
  userId: string,
  source: ConsentSource,
  // null pour un backfill : la langue au moment du choix d'origine est inconnue, ne pas inventer.
  lang: string | null,
  entries: { purpose: ConsentPurpose; status: AdConsent }[],
): void {
  void supabase
    .from('consent_events')
    .insert(
      entries.map((e) => ({
        user_id: userId,
        purpose: e.purpose,
        status: e.status,
        source,
        platform: Platform.OS,
        lang,
        doc_version: e.purpose === 'ads' ? null : LEGAL_DOC_VERSION,
      })),
    )
    .then(() => {});
}

/**
 * True when neither the DB ledger nor the device has an 'ads' answer — the DB decides first, so
 * an answered user is never re-prompted after a reinstall or on a second phone. A found answer is
 * synced into the local cache (starts/stops the ad SDKs via the listeners). A LOCAL answer with no
 * DB row is a pre-0040 device: the choice is backfilled into the ledger as-is (source 'backfill',
 * CGU/privacy included — the gate could not be passed without ticking them) and the screen does
 * NOT come back for existing users. Offline / DB error falls back to the local cache: never nag
 * someone on a flaky network, and never turn SDKs on without a stored choice (fail-closed).
 *
 * WHEN to ask is ConsentGate's decision (currently: as soon as a session exists, so the screen
 * lands right after signup and anonymous browsers are never nagged). Two variants were tried and
 * rejected on 2026-08-01: cold first-launch popup (felt hostile, everyone refuses) and "after
 * first value" delay (silently dropped the first unlock purchase from every ad platform). Do NOT
 * merge this into the signup CGU acceptance either: GDPR requires SPECIFIC consent, a choice
 * bundled with legal texts is invalid (art. 7, Planet49) and is what CNIL fines. A dedicated
 * checkbox alongside the CGU is the legal shape.
 */
export async function shouldPromptConsent(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('consent_events')
      .select('status')
      .eq('user_id', userId)
      .eq('purpose', 'ads')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const last = data?.[0]?.status as AdConsent | undefined;
    if (last === 'granted' || last === 'denied') {
      if ((await getAdConsent()) !== last) await setAdConsent(last);
      return false;
    }
    const local = await getAdConsent();
    if (local) {
      // Best-effort like every write here: if this insert fails, the next launch lands in this
      // same branch (local present, DB empty) and retries — still without showing the screen.
      recordConsent(userId, 'backfill', null, [
        { purpose: 'terms', status: 'granted' },
        { purpose: 'privacy', status: 'granted' },
        { purpose: 'ads', status: local },
      ]);
      return false;
    }
    return true;
  } catch {
    return (await getAdConsent()) === null;
  }
}
