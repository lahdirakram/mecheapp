import { useQuery } from '@tanstack/react-query';
import { useLang } from '@meche/ui';
import type { Lang } from '@meche/core';
import { getStorePrices, purchasesAvailable } from './purchases';
import { PRO_PRODUCT_ID } from './subscription';

/**
 * What Mèche Pro costs is the STORE's to state, never ours and never the server's.
 *
 * Apple and Play own the number the user is actually charged: it is localized per storefront,
 * tax-inclusive, and Apple re-prices automatically across currencies. A backend cannot know the
 * buyer's storefront before the purchase (RevenueCat only reports a currency in the webhook, i.e.
 * after the fact), so a server-held price would be a guess that reads as fact. Showing a stylist in
 * Toronto or Delhi a hardcoded "29,99 €" is both wrong and an App Store review risk.
 *
 * Hence the split: RevenueCat is the source of truth, and the literal below is a LAST-RESORT
 * fallback for when no store is reachable (web, Expo Go, missing RC key, offerings fetch fails).
 * It must stay in sync with the App Store / Play price of PRO_PRODUCT_ID, and it is the only copy
 * of that number in the app. Store listing copy (store/listing.md, store/screenshots/*.json) is
 * submitted separately and is not driven from here.
 *
 * NOTE the store string is formatted for the buyer's STOREFRONT, not for the app's language: a
 * French account reads "29,99 €" even with the UI in English. That is correct, it is what they pay.
 * Only the fallback follows the UI language, since it has no storefront to speak for.
 */
const FALLBACK_PRICE: Record<Lang, string> = { fr: '29,99 €', en: '€29.99' };

/**
 * The subscription price, ready to interpolate into copy: the live store price once known, the
 * localized fallback until then. Never returns empty, so a price can sit mid-sentence without the
 * screen needing a loading state.
 *
 * Deliberately a React Query cache and NOT a module-level one. Studio, Salon and the paywall are
 * mounted at the same time (two are tabs), so a cache without subscribers lets them disagree: the
 * first screen to ask usually loses a race against RevenueCat's `configure()`, which only runs once
 * the session resolves (lib/PurchasesSync.tsx), and `getStorePrices` reports that failure as an
 * empty object. Whichever screen asked later then showed the real price while the others stayed on
 * the fallback forever, since nothing could re-render them. Verified on a staging device: paywall
 * "29,99 €", Studio and Salon "€29.99", on screen simultaneously.
 *
 * So: throw on a missing price rather than returning null, so React Query retries the `configure()`
 * race instead of caching the failure as a success, and every subscriber updates when it lands.
 */
export function useProPrice(): string {
  const lang = useLang();
  const { data } = useQuery({
    queryKey: ['pro-price', PRO_PRODUCT_ID],
    queryFn: async () => {
      const prices = await getStorePrices();
      const priceString = prices[PRO_PRODUCT_ID]?.priceString;
      if (!priceString) throw new Error('pro price unavailable');
      return priceString;
    },
    // No store, no query: web and Expo Go go straight to the fallback instead of retrying nothing.
    enabled: purchasesAvailable(),
    // A store price does not change under a running app, and a re-fetch would cost a native call on
    // every remount. Failures still retry, here and on the next mount.
    staleTime: Infinity,
    retry: 3,
  });

  return data ?? FALLBACK_PRICE[lang];
}
