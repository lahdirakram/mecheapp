import { create } from 'zustand';
import { mt, type Lang, type MKey } from '@meche/core';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

/** Global FR/EN language store (FR default). Persisted to device in Phase 2 via auth profile. */
export const useLangStore = create<LangState>((set) => ({
  lang: 'fr',
  setLang: (lang) => set({ lang }),
  toggle: () => set((s) => ({ lang: s.lang === 'fr' ? 'en' : 'fr' })),
}));

export function useLang(): Lang {
  return useLangStore((s) => s.lang);
}

/** Returns a translator bound to the active language: `const t = useT(); t('explore')`. */
export function useT(): (key: MKey) => string {
  const lang = useLang();
  return (key: MKey) => mt(lang, key);
}
