import { Platform } from 'react-native';

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
    } else {
      await Purchases.logIn(appUserId);
    }
  } catch (e) {
    console.warn('[purchases] syncPurchaseUser failed', e);
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
 * `current` is a STATUS that exactly one offering carries, and in this project it is `default` (the
 * B2C credit packs) that carries it — while the Pro subscription lives in a *different* offering
 * whose literal identifier happens to also be `current`. Reading `offerings.current` therefore
 * returns the credit packs and never sees `meche_pro_monthly`. Searching every offering is what
 * lets one RevenueCat project serve both apps.
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
  } catch (e) {
    console.warn('[purchases] getStorePrices failed', e);
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
    if ((e as any)?.userCancelled) {
      console.warn('[purchases] purchasePackage reported userCancelled', e);
      return { cancelled: true };
    }
    console.warn('[purchases] purchasePackage failed', e);
    return { error: String((e as Error)?.message ?? e) };
  }
}

export type RestoreResult = { ok: true; restored: boolean } | { error: string };

/**
 * Re-attach the store account's past purchases to the signed-in user (Apple 3.1.1: a subscription
 * must be restorable after a reinstall or on a new device). Like a purchase, the entitlement itself
 * lands server-side through the RevenueCat webhook; `restored` only says whether the store had
 * anything active to give back, so the UI can tell "done" from "nothing to restore".
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!purchasesAvailable()) return { error: 'unavailable' };
  try {
    const Purchases = await rc();
    const info = await Purchases.restorePurchases();
    const entitlements: string[] = Object.keys(info?.entitlements?.active ?? {});
    const subs: string[] = info?.activeSubscriptions ?? [];
    return { ok: true, restored: entitlements.length > 0 || subs.length > 0 };
  } catch (e) {
    return { error: String((e as Error)?.message ?? e) };
  }
}
