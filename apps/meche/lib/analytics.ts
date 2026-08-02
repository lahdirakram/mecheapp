import { Platform } from 'react-native';
import { forwardEvent } from './marketing';

// Firebase Analytics (GA4) wrapper, used for ad conversion tracking (Google Ads imports GA4 events
// as conversions; RevenueCat forwards purchases to GA4 via the app instance id). Same lazy-import
// pattern as purchases.ts: the web bundle never pulls the native module, and every call no-ops
// gracefully when analytics isn't available (web, Expo Go).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalyticsHandle = { api: any; instance: any } | null;

let handle: AnalyticsHandle | undefined; // undefined = not tried yet, null = unavailable

async function analytics(): Promise<AnalyticsHandle> {
  if (Platform.OS === 'web') return null;
  if (handle !== undefined) return handle;
  try {
    const api = await import('@react-native-firebase/analytics');
    handle = { api, instance: api.getAnalytics() };
  } catch {
    handle = null;
  }
  return handle;
}

/** Log a GA4 event. Prefer standard names (sign_up, login, purchase) so ad platforms recognize them. */
export async function logEvent(name: string, params?: Record<string, unknown>): Promise<void> {
  // One choke point for the whole funnel: the same events also feed Meta/TikTok (consent-gated,
  // mapped and filtered in marketing.ts), so call sites never enumerate ad platforms.
  forwardEvent(name, params);
  try {
    const a = await analytics();
    if (a) await a.api.logEvent(a.instance, name, params);
  } catch {
    /* non-fatal: tracking must never break the app */
  }
}

/**
 * GA4 app instance id for this install. Handed to RevenueCat so its server-side purchase events
 * land in the same GA4 user, which is what makes purchases importable as ad conversions.
 */
export async function getAppInstanceId(): Promise<string | null> {
  try {
    const a = await analytics();
    return a ? ((await a.api.getAppInstanceId(a.instance)) ?? null) : null;
  } catch {
    return null;
  }
}
