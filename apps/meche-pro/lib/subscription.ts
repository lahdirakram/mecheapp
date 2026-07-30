import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

// Cancelling an auto-renewable subscription is the STORE's job: neither StoreKit nor Play Billing
// exposes an API to cancel, so the only honest "cancel" an app can offer is a link out to the
// store's own management screen. Both stores expect that link to exist in a subscription app, and a
// subscriber looks for it in the app's settings, not on the paywall they already bought from.
const APPLE_MANAGE = 'https://apps.apple.com/account/subscriptions';
const PLAY_MANAGE = 'https://play.google.com/store/account/subscriptions';

/**
 * The single V1 plan. Same string on both stores: it is the App Store product id AND the Play
 * subscription id (Play's base plan suffix `:monthly` only appears in RevenueCat's composite id,
 * never here). Lives in lib/ rather than in the paywall route so any screen can reach it.
 */
export const PRO_PRODUCT_ID = 'meche_pro_monthly';

/** The store screen where the user can see, change or cancel their subscription. */
export function manageSubscriptionUrl(productId?: string): string {
  if (Platform.OS === 'ios') return APPLE_MANAGE;
  // Play only deep-links to a specific subscription with BOTH the sku and the right package, and
  // the package differs between staging and prod (see app.config.js), so read it at runtime. A
  // wrong package would open a broken page, so fall back to the generic screen when unsure.
  const pkg = Constants.expoConfig?.android?.package;
  if (!pkg || !productId) return PLAY_MANAGE;
  return `${PLAY_MANAGE}?sku=${encodeURIComponent(productId)}&package=${encodeURIComponent(pkg)}`;
}

export function openManageSubscription(productId?: string): void {
  void Linking.openURL(manageSubscriptionUrl(productId));
}
