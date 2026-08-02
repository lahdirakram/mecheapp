import { Platform } from 'react-native';
import { getAdConsent, onAdConsentChange, type AdConsent } from './consent';

// Ad-platform measurement (Meta + TikTok + Google Consent Mode), one file. GA4 product analytics
// stays in analytics.ts; this file only exists to tell ad platforms which campaigns work.
//
// Everything here is gated on the user's explicit consent (lib/consent.ts): neither SDK is
// initialized, and no event leaves the device, before 'granted'. That is what makes shipping the
// SDKs in the binary CNIL-safe — a compiled-in SDK that is never started sends nothing.
//
// Configuration is 100% runtime (Settings.setAppID / initializeSdk), no build-time config plugin:
// the four EXPO_PUBLIC_* ids below can be filled in eas.json AFTER this binary ships and pushed by
// OTA. Empty ids = that platform silently stays off.
//
// Like purchases.ts, native modules are imported lazily so the web bundle never pulls them in and
// every call no-ops when the module is missing (web, Expo Go).

const FB_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID;
const FB_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN;
const TT_APP_ID = process.env.EXPO_PUBLIC_TT_APP_ID;
const TT_ACCESS_TOKEN = process.env.EXPO_PUBLIC_TT_ACCESS_TOKEN;

let metaReady = false;
let tiktokReady = false;
let started = false;
let signupForwarded = false;
// Tracks the in-flight consent application so replayAfterGrant can wait for the SDKs to be up.
let lastApply: Promise<void> = Promise.resolve();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fb(): Promise<{ Settings: any; AppEventsLogger: any } | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Subpath imports, NEVER the package index: the index instantiates the FBAccessToken native
    // module, whose Android constructor demands an already-initialized FacebookSdk and kills the
    // app otherwise (fatal `HostObject::get for prop 'FBAccessToken'`, seen 2026-08-02 via adb).
    // These two submodules only touch FBSettings/FBAppEventsLogger, both safe pre-init.
    const [settings, logger] = await Promise.all([
      import('react-native-fbsdk-next/lib/module/FBSettings'),
      import('react-native-fbsdk-next/lib/module/FBAppEventsLogger'),
    ]);
    return { Settings: settings.default, AppEventsLogger: logger.default };
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tt(): Promise<any | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('react-native-tiktok-business-sdk');
  } catch {
    return null;
  }
}

/** Mirror the consent choice into GA4 (Consent Mode v2). The native defaults (Info.plist +
 *  AndroidManifest, see plugins/withAnalyticsConsentDefaults) deny ad signals until this runs, so
 *  a crash or a never-answered prompt fails closed. Analytics storage stays on: it is our own
 *  audience measurement, the consented part is handing signals to AD platforms. */
async function applyGoogleConsent(c: AdConsent): Promise<void> {
  try {
    const api = await import('@react-native-firebase/analytics');
    const granted = c === 'granted';
    await api.setConsent(api.getAnalytics(), {
      analytics_storage: true,
      ad_storage: granted,
      ad_user_data: granted,
      ad_personalization: granted,
    });
  } catch {
    /* non-fatal: the native defaults keep ad signals denied */
  }
}

async function startMeta(): Promise<void> {
  // Android REQUIRES the fbsdk config plugin's manifest entries (appID + clientToken) to be in
  // the installed binary: on a binary without them this init can kill the app (FBSettingsModule
  // has no try/catch). Every binary built after 2026-08-02 has them (app.config.js); an OTA that
  // reaches an older Android preview binary would crash at acceptance, reinstalling fixes it.
  if (metaReady || !FB_APP_ID || !FB_CLIENT_TOKEN) return;
  const m = await fb();
  if (!m) return;
  try {
    // Runtime configuration (the SDK's documented "delayed init" GDPR flow): no FacebookAppID in
    // Info.plist needed, initializeSDK() runs the full ApplicationDelegate init.
    m.Settings.setAppID(FB_APP_ID);
    m.Settings.setClientToken(FB_CLIENT_TOKEN);
    m.Settings.initializeSDK();
    await m.Settings.setAutoLogAppEventsEnabled(true);
    await m.Settings.setAdvertiserIDCollectionEnabled(true);
    // iOS: report tracking allowed. We never show ATT (no IDFA is read, withoutAdIdSupport-style
    // setup), Meta then measures via AEM + SKAdNetwork. Best effort, deprecated on newer SDKs.
    if (Platform.OS === 'ios') await m.Settings.setAdvertiserTrackingEnabled(true).catch(() => {});
    metaReady = true;
  } catch {
    /* Meta simply stays off */
  }
}

async function startTikTok(): Promise<void> {
  if (tiktokReady || !TT_APP_ID || !TT_ACCESS_TOKEN) return;
  const m = await tt();
  if (!m) return;
  try {
    // appId = the store identity REGISTERED in TikTok Events Manager, hardcoded on purpose: a
    // staging build's own package (com.meche.app.staging) is unknown to TikTok and its events are
    // silently dropped (seen 2026-08-02, the app connection stayed "Pending verification").
    const storeAppId = Platform.OS === 'ios' ? '6777728552' : 'com.meche.app';
    await m.initializeSdk(storeAppId, TT_APP_ID, TT_ACCESS_TOKEN, false, {
      // RevenueCat owns purchases; our explicit PURCHASE event below carries the real store price.
      // The SDK's automatic payment observer would double count them.
      disablePaymentTracking: true,
    });
    tiktokReady = true;
  } catch {
    /* TikTok simply stays off */
  }
}

async function applyConsent(c: AdConsent): Promise<void> {
  await applyGoogleConsent(c);
  if (c === 'granted') {
    await Promise.all([startMeta(), startTikTok()]);
    void pushAdIdentifiersToRevenueCat();
  }
  // 'denied' after 'granted' in the same session: the SDKs have no clean teardown, but Google
  // consent flips immediately and neither SDK is started again at the next launch.
}

/**
 * Called once from the app root. Applies the stored choice (so a returning consented user's SDKs
 * start on every launch) and follows later changes from the prompt or the profile row.
 */
export function startMarketing(): void {
  if (started || Platform.OS === 'web') return;
  started = true;
  void getAdConsent().then((c) => {
    if (c) lastApply = applyConsent(c);
  });
  onAdConsentChange((c) => {
    lastApply = applyConsent(c);
  });
}

/**
 * Covers any sign-up that happened while the ad SDKs were still off (an existing install seeing
 * the consent screen for the first time after an update, or a grant made later from the profile
 * row). Called on accept: waits for the SDKs to come up, then replays identify + Registration for
 * a recent account. Capped at 7 days: an old account accepting late is not an acquisition signal.
 */
export function replayAfterGrant(user: { id: string; email?: string | null; createdAt?: string | null } | null): void {
  if (!user || Platform.OS === 'web') return;
  void (async () => {
    try {
      await lastApply;
      if (!metaReady && !tiktokReady) return;
      identifyMarketing(user.id, user.email);
      const created = user.createdAt ? Date.parse(user.createdAt) : NaN;
      const recent = Number.isFinite(created) && Date.now() - created < 7 * 24 * 3600_000;
      if (recent && !signupForwarded) forwardEvent('sign_up', { method: 'consent_replay' });
    } catch {
      /* replay is best effort */
    }
  })();
}

/**
 * Hand Meta's anonymous id + device identifiers to RevenueCat, which forwards purchase events to
 * Meta server-side (its Meta Ads integration matches on $fbAnonId, no ATT needed). Runs from two
 * triggers because consent and login race: whichever of "consent granted" and "RC configured"
 * happens second does the push. Safe to call anytime, no-ops until both are true.
 */
export async function pushAdIdentifiersToRevenueCat(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if ((await getAdConsent()) !== 'granted') return;
    const Purchases = (await import('react-native-purchases')).default;
    if (!(await Purchases.isConfigured())) return;
    await Purchases.collectDeviceIdentifiers();
    // metaReady, not just FB_APP_ID: touching the fbsdk JS at all is only safe once startMeta has
    // initialized the native SDK (this exact call site crashed Android on 2026-08-02 because the
    // Meta kill-switch had skipped the init but the import still happened here).
    if (metaReady) {
      const m = await fb();
      const anonId = m ? await m.AppEventsLogger.getAnonymousID() : null;
      if (anonId) await Purchases.setFBAnonymousID(anonId);
    }
  } catch {
    /* attribution enrichment only, never fatal */
  }
}

/**
 * Fan-out of the GA4 funnel events (called from analytics.ts's logEvent, one choke point so call
 * sites never enumerate platforms). Only the few events ad platforms optimize on are mapped;
 * everything else stays GA4-only.
 */
export function forwardEvent(name: string, params?: Record<string, unknown>): void {
  if (!metaReady && !tiktokReady) return;
  void (async () => {
    try {
      const method = typeof params?.method === 'string' ? params.method : undefined;
      if (name === 'sign_up') {
        signupForwarded = true;
        if (metaReady) {
          const m = await fb();
          m?.AppEventsLogger.logEvent(m.AppEventsLogger.AppEvents.CompletedRegistration, {
            [m.AppEventsLogger.AppEventParams.RegistrationMethod]: method ?? 'unknown',
          });
        }
        if (tiktokReady) {
          const m = await tt();
          await m?.trackEvent(m.TikTokEventName.REGISTRATION);
        }
      } else if (name === 'paywall_viewed') {
        if (metaReady) {
          const m = await fb();
          m?.AppEventsLogger.logEvent(m.AppEventsLogger.AppEvents.InitiatedCheckout);
        }
        if (tiktokReady) {
          const m = await tt();
          await m?.trackContentEvent(m.TikTokContentEventName.CHECK_OUT);
        }
      } else if (name === 'result_unlocked') {
        if (metaReady) {
          const m = await fb();
          m?.AppEventsLogger.logEvent(m.AppEventsLogger.AppEvents.SpentCredits);
        }
        if (tiktokReady) {
          const m = await tt();
          await m?.trackEvent(m.TikTokEventName.SPEND_CREDITS);
        }
      } else if (name === 'try_on_completed') {
        if (metaReady) {
          const m = await fb();
          m?.AppEventsLogger.logEvent('TryOnCompleted');
        }
        if (tiktokReady) {
          const m = await tt();
          await m?.trackCustomEvent('TryOnCompleted');
        }
      }
    } catch {
      /* never let ad tracking break the app */
    }
  })();
}

/** Better event-to-user matching: TikTok hashes these on-device before sending. Call on login. */
export function identifyMarketing(userId: string, email?: string | null): void {
  if (!tiktokReady) return;
  void (async () => {
    try {
      const m = await tt();
      await m?.identify(userId, userId, '', email ?? '');
    } catch {
      /* matching enrichment only */
    }
  })();
}

/**
 * A paid pack, with the real store price. TikTok ONLY: Meta and GA4 both receive purchases
 * server-side from RevenueCat (webhook/integrations), a client event there would double count.
 */
export function logMarketingPurchase(p: { productId: string; value: number; currency: string }): void {
  if (!tiktokReady) return;
  void (async () => {
    try {
      const m = await tt();
      await m?.trackContentEvent(m.TikTokContentEventName.PURCHASE, {
        [m.TikTokContentEventParameter.CONTENT_ID]: p.productId,
        [m.TikTokContentEventParameter.CONTENT_TYPE]: 'product',
        [m.TikTokContentEventParameter.VALUE]: p.value,
        [m.TikTokContentEventParameter.CURRENCY]: p.currency,
      });
    } catch {
      /* never let ad tracking break a purchase */
    }
  })();
}
