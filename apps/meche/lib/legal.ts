import { Linking } from 'react-native';

// Public legal site (Railway, served at mecheapp.com). Language-specific paths so the in-app links
// match the user's current language. Same base is used for the App Store / Play privacy URL.
export const LEGAL_BASE = 'https://mecheapp.com';

// Version des CGU/politique enregistrée dans consent_events.doc_version (migration 0040) : la
// preuve doit dater le texte accepté. À bumper quand web/site/{fr,en}/{terms,privacy}.html change
// sur le fond (pas pour une coquille).
export const LEGAL_DOC_VERSION = '2026-08-08';

export type LegalDoc = 'privacy' | 'terms' | 'mentions-legales';

export function legalUrl(doc: LegalDoc, lang: 'fr' | 'en'): string {
  return `${LEGAL_BASE}/${lang}/${doc}`;
}

export function openLegal(doc: LegalDoc, lang: 'fr' | 'en'): void {
  void Linking.openURL(legalUrl(doc, lang));
}
