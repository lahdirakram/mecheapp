import { getLocales } from 'expo-localization';
import { seedLang } from '@meche/ui';

// Seeds the app language from the phone's language, for anyone who has never picked one explicitly.
//
// Before this, `lang` defaulted to 'fr' unconditionally, so an English speaker installed the app,
// got a French UI, and had to find a toggle buried three taps deep to escape it. Testers reported
// this as "the app has no language setting" — which is what an undiscoverable setting looks like.
//
// Why this file lives in apps/meche and not next to the store in packages/ui: `expo-localization`
// is a NATIVE module and packages/ui is shared with meche-pro, whose shipped binary does not carry
// it. dyld resolves a framework at process start, so an import in shared code would kill Pro at
// launch on its next OTA, with no JS-level catch possible. Pro simply never calls this.
//
// Timing is handled entirely by `seedLang`, which re-applies itself after the persisted value has
// been merged in. Do NOT "simplify" this into a plain set-before-hydration: the stored language
// overwrites the store wholesale when it loads, so a seed applied only at module scope is silently
// discarded for every user who has any stored value at all.
export function seedLangFromDevice(): void {
  try {
    const locales = getLocales();
    // Logged unconditionally, and worth keeping. The one thing that cannot be reasoned about from
    // here is what the OS actually reports: iOS in particular can filter this list against the
    // app's declared localizations, so "the phone is in Arabic" and "the app is told Arabic" are
    // different claims. When the language comes out wrong, this line settles which half is at fault
    // before anyone edits logic.
    console.log('[i18n] device locales', locales.map((l) => l.languageTag).join(','));
    // Ordered by the user's OWN preference list, so the first entry we can actually render wins.
    // Someone whose phone is set to Spanish then French gets French, not the FR fallback by
    // accident — the difference is invisible today but real for the next language added.
    for (const l of locales) {
      if (l.languageCode === 'fr' || l.languageCode === 'en') {
        seedLang(l.languageCode);
        return;
      }
    }
    // Any other locale: English is the safer neutral for a non-francophone, and FR remains one tap
    // away. Falling back to FR here would hand the French UI to exactly the users least able to
    // read it.
    seedLang('en');
  } catch (e) {
    // Never let a locale read break the launch. The 'fr' default is the pre-existing behaviour.
    console.warn('[i18n] device locale unavailable, keeping default', e);
  }
}
