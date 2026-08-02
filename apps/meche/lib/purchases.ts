import { Platform } from 'react-native';
import { getAppInstanceId } from './analytics';
import { pushAdIdentifiersToRevenueCat } from './marketing';

// RevenueCat (in-app purchases) wrapper. The native module is imported lazily so the web bundle
// never pulls it in, and every call no-ops gracefully when purchases aren't available (web, Expo
// Go, or missing API key). The actual credit grant happens server-side via the /iap-webhook
// edge function once the store validates the receipt — the client only opens the store sheet.
const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY;

let configured = false;

const apiKey = () => (Platform.OS === 'ios' ? IOS_KEY : Platform.OS === 'android' ? ANDROID_KEY : undefined);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rc(): Promise<any> {
  return (await import('react-native-purchases')).default;
}

/** True only when a real store purchase can run (native platform + a configured API key). */
export function purchasesAvailable(): boolean {
  return Platform.OS !== 'web' && Boolean(apiKey());
}

/**
 * Bind RevenueCat to the signed-in user so the webhook can map the purchase back to them. Call on
 * login and whenever the user changes. configure() runs once; later users switch via logIn().
 */
export async function syncPurchaseUser(appUserId: string): Promise<void> {
  if (!purchasesAvailable()) return;
  try {
    const Purchases = await rc();
    if (!configured) {
      Purchases.configure({ apiKey: apiKey()!, appUserID: appUserId });
      configured = true;
      // Hand GA4's app instance id to RevenueCat so its server-side purchase events reach the same
      // GA4 user (Firebase integration), making purchases importable as ad conversions.
      void getAppInstanceId().then((id) => {
        if (id) void Purchases.setFirebaseAppInstanceID(id);
      });
      // Apple Ads (Search Ads) install attribution: RevenueCat fetches the AdServices token and
      // exposes campaign data on its dashboard/webhooks. iOS-only, free, no ATT prompt needed.
      if (Platform.OS === 'ios') {
        void Purchases.enableAdServicesAttributionTokenCollection();
      }
      // Meta attribution ($fbAnonId + device identifiers) so RevenueCat's Meta integration can
      // match server-side purchase events. Consent-gated inside; no-ops until the user accepted.
      void pushAdIdentifiersToRevenueCat();
    } else {
      await Purchases.logIn(appUserId);
    }
  } catch {
    /* non-fatal: purchases simply stay unavailable */
  }
}

/** Detach the current user (on sign-out) so a later buyer isn't credited to the previous account. */
export async function clearPurchaseUser(): Promise<void> {
  if (!purchasesAvailable() || !configured) return;
  try {
    const Purchases = await rc();
    await Purchases.logOut();
  } catch {
    /* non-fatal */
  }
}

/**
 * Every package across EVERY offering, not just `offerings.current`.
 *
 * `current` is a STATUS that exactly one offering carries. Here it is `default` (these credit packs)
 * that carries it, while the Pro subscription lives in a *different* offering whose literal
 * identifier happens to also be `current`. Reading `offerings.current` therefore works for B2C only
 * by luck of which offering holds the status today: flip that status in the dashboard, or move a
 * credit pack to another offering, and every purchase here dies with `product_not_found` (exactly
 * how the Pro app broke in prod on 30/07). Searching every offering is what lets one RevenueCat
 * project serve both apps without depending on a dashboard setting.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allPackages(offerings: any): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: any[] = Object.values(offerings?.all ?? {});
  if (offerings?.current && !groups.includes(offerings.current)) groups.push(offerings.current);
  return groups.flatMap((g) => g?.availablePackages ?? []);
}

export type StorePrice = { priceString: string; price: number; currencyCode: string };

/**
 * Live prices from the current offering, keyed by store product id. The store is the source of
 * truth for what the user actually pays (tax-inclusive, localized per country), so the UI should
 * prefer these over any hard-coded value. Returns {} when purchases aren't available.
 */
export async function getStorePrices(): Promise<Record<string, StorePrice>> {
  if (!purchasesAvailable()) return {};
  try {
    const Purchases = await rc();
    const offerings = await Purchases.getOfferings();
    const out: Record<string, StorePrice> = {};
    for (const pkg of allPackages(offerings)) {
      const prod = pkg.product;
      if (prod?.identifier) {
        out[prod.identifier] = { priceString: prod.priceString, price: prod.price, currencyCode: prod.currencyCode };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export type PurchaseResult = { ok: true } | { cancelled: true } | { error: string };

/** Open the store sheet for the package whose store product id matches `productId`. */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!purchasesAvailable()) return { error: 'unavailable' };
  try {
    const Purchases = await rc();
    const offerings = await Purchases.getOfferings();
    const pkg = allPackages(offerings).find((p) => p.product?.identifier === productId);
    if (!pkg) {
      console.warn('[purchases] no package for', productId, 'in', Object.keys(offerings?.all ?? {}));
      return { error: 'product_not_found' };
    }
    await Purchases.purchasePackage(pkg);
    return { ok: true };
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.userCancelled) return { cancelled: true };
    return { error: String((e as Error)?.message ?? e) };
  }
}
