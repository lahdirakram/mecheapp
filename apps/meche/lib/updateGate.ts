import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useMinVersion } from '@meche/api-client';

// Server-driven "update required" gate. The switch is the `min_version` row of app_config (0032),
// world-readable and already fetched wholesale by useAppFlags, so this costs no extra query.
//
// FAIL OPEN IS THE WHOLE DESIGN. Everything below answers "don't block" when it is unsure: flag
// absent, still loading, fetch failed, value unparseable, our own version unreadable. Read commit
// 747d3ec before loosening any of it — a launch gate that waited on an event which could never
// arrive shipped a permanently blank app to prod, unrecoverable short of reinstalling. A gate that
// can brick the app is worse than no gate, and here the failure would be crueller still: the user
// is told to update, and updating changes nothing.

/**
 * The B2C listing on the App Store. Real id, not a placeholder: it is the `ascAppId` used by
 * `eas submit` (apps/meche/eas.json) and the id behind the download button on mecheapp.com.
 * The `/app/id<id>` form needs no country segment and no slug, so it survives a rename.
 */
const APP_STORE_ID = '6777728552';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const PLAY_DETAILS = 'https://play.google.com/store/apps/details?id=';
/** Only used if the runtime config is unreadable. Matches app.json's production `android.package`. */
const ANDROID_PACKAGE_FALLBACK = 'com.meche.app';

/** Where this build's user goes to get the newer build. */
export function storeUrl(): string {
  if (Platform.OS === 'ios') return APP_STORE_URL;
  // Play needs the exact applicationId, and it differs between staging and prod (app.config.js), so
  // read it at runtime rather than hardcoding prod. Same reasoning as meche-pro's
  // manageSubscriptionUrl. A staging build points at a Play page that does not exist, which is
  // correct: there is no staging listing to send anyone to.
  const pkg = Constants.expoConfig?.android?.package ?? ANDROID_PACKAGE_FALLBACK;
  return `${PLAY_DETAILS}${encodeURIComponent(pkg)}`;
}

export function openStore(): void {
  // expo-linking's openURL REJECTS when no app can handle the url (SDK 56 doc). There is nothing
  // useful to do about it from a blocking screen, but swallow it loudly rather than leaving an
  // unhandled rejection: if the store link is broken, that log is the only trace.
  void Linking.openURL(storeUrl()).catch((e) => console.warn('[update] store link failed', e));
}

/**
 * A dotted numeric version as a list of numbers, or null when it is anything else.
 *
 * Strict on purpose: null means "don't block". Suffixed or partial values ('1.0.2-beta', '1.0.x',
 * '', 'latest') are rejected rather than salvaged, because every salvage rule is a guess about
 * ordering, and guessing wrong here locks people out of the app.
 */
function parseVersion(v: string | undefined | null): number[] | null {
  if (typeof v !== 'string') return null;
  const parts = v.trim().split('.');
  if (parts.length === 0) return null;
  const out: number[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (!Number.isSafeInteger(n)) return null;
    out.push(n);
  }
  return out;
}

/**
 * Is `current` strictly older than `min`? Segment-by-segment numeric compare, never a string
 * compare: lexically '1.0.10' sorts BELOW '1.0.9', which would gate every user of the newest build.
 * Missing segments count as 0, so '1.1' and '1.1.0' are equal. Unparseable on either side is false.
 */
export function isBelowMinVersion(current: string | undefined | null, min: string | undefined | null): boolean {
  const a = parseVersion(current);
  const b = parseVersion(min);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/**
 * Whether this build must be replaced before it can be used. False whenever we are not certain.
 *
 * `Constants.expoConfig?.version` is the version in the BUNDLE's app.json. Under
 * `runtimeVersion.policy: "appVersion"` (app.json) that always equals the installed binary's
 * version, since an update only reaches a binary whose version matches the one it was built from.
 * If the project ever moves to `policy: "fingerprint"`, that stops being true: a bundle could then
 * run on a binary of a different version, and this would have to read `nativeApplicationVersion`
 * from expo-application instead (a new native dependency, so not an OTA-able swap).
 */
export function useUpdateRequired(): boolean {
  const min = useMinVersion();
  return isBelowMinVersion(Constants.expoConfig?.version, min);
}
