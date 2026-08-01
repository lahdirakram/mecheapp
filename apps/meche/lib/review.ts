import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

// App rating, deliberately reduced to ONE path: the explicit "Rate Mèche" row in settings.
//
// The native in-place prompt (SKStoreReviewController / Play ReviewManager) was built and then
// removed. Not because it misbehaved, but because it cannot be verified on either of our test
// channels — Android's flow requires the app to be in the account's Play library, so a sideloaded
// EAS build never shows it, and iOS never shows it under TestFlight. Both fail silently. Shipping a
// mechanism whose only observable behaviour is "nothing happened" means shipping something nobody
// can confirm works or notice when it breaks, and the upside over a visible menu row is small.
//
// If it ever comes back: it must NOT fire from a press handler (Apple forbids wiring
// SKStoreReviewController to a button), and it must not fire during the reveal of a paid result,
// which talks over the payoff and demands a verdict before the user has formed one. Arm at the good
// moment, ask later, on an idle screen, in a later session.

/** Deep-link to the store listing's review form. This is what the "Rate Mèche" row does. */
export async function openStoreListing(): Promise<void> {
  // `StoreReview.storeUrl()` reads ios.appStoreUrl / android.playStoreUrl from the Expo config, so
  // both are set in app.json. It returns null if they are missing, hence the guard.
  const url = StoreReview.storeUrl();
  if (!url) return;
  // iOS opens the listing on the Reviews tab and pre-opens the compose sheet with this param;
  // Android has no equivalent and the plain listing is already the right destination.
  const target = Platform.OS === 'ios' ? `${url}?action=write-review` : url;
  try {
    await Linking.openURL(target);
  } catch {
    // Ignored on purpose. Rating is the least important thing the app does; it may never break a
    // screen.
  }
}
