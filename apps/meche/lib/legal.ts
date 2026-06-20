import { Linking } from 'react-native';

// Public legal site (Railway, served at mecheapp.com). Language-specific paths so the in-app links
// match the user's current language. Same base is used for the App Store / Play privacy URL.
export const LEGAL_BASE = 'https://mecheapp.com';

export type LegalDoc = 'privacy' | 'terms' | 'mentions-legales';

export function legalUrl(doc: LegalDoc, lang: 'fr' | 'en'): string {
  return `${LEGAL_BASE}/${lang}/${doc}`;
}

export function openLegal(doc: LegalDoc, lang: 'fr' | 'en'): void {
  void Linking.openURL(legalUrl(doc, lang));
}
