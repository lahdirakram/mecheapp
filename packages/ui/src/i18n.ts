import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mt, type Lang, type MKey } from '@meche/core';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

/**
 * Global FR/EN language store, persisted to the DEVICE.
 *
 * Device storage and NOT `profiles.lang` (which has existed since migration 0001 and is
 * client-writable since 0020): the toggle has to work before sign-in, and a cold start must not
 * wait on a network round-trip to know which language to paint. Syncing the column on top, for
 * cross-device, is a separate change and would need a device-vs-server precedence rule.
 *
 * FR stays the FIRST-RUN default, so an English speaker still starts in French. Seeding from the
 * device locale would be better, but `expo-localization` is a new native dependency: it cannot
 * reach anyone by OTA.
 */
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'fr',
      setLang: (lang) => set({ lang }),
      toggle: () => set((s) => ({ lang: s.lang === 'fr' ? 'en' : 'fr' })),
    }),
    {
      name: 'meche.lang',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the choice is worth storing. The actions are rebuilt on every boot, and persisting
      // them would write functions that come back as null.
      partialize: (s) => ({ lang: s.lang }),
      // The ONLY signal zustand gives on a failed read: the success path fires onFinishHydration
      // instead. Log it, since otherwise a user stuck on the default has nothing to report.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[i18n] lang hydration failed, keeping default', error);
      },
    },
  ),
);

/**
 * Never let the language gate hold the app for longer than this. See useLangHydrated: the wait MUST
 * be bounded, because some ways of failing never report themselves.
 */
const HYDRATION_TIMEOUT_MS = 1500;

/**
 * Whether the stored language has been read back yet. AsyncStorage is async, so the very first
 * render always has the `'fr'` default: without this gate an EN user watches the UI paint French
 * and then flip. <AppProviders> holds the render on it, the same way it already holds on fonts.
 *
 * The wait is bounded, and that is not a nicety. zustand's `hydrate()` fires
 * `onFinishHydration` and flips `hasHydrated()` only on its SUCCESS path: when the storage read
 * rejects (corrupt stored JSON, an AsyncStorage failure) it calls `onRehydrateStorage(undefined,
 * error)` and nothing else, so `hasHydrated()` stays false for the lifetime of the process.
 * Verified by reading zustand's compiled `.catch` branch, not assumed. Gating render on an event
 * that can never arrive means a permanently blank launch, unrecoverable short of reinstalling, so
 * the timeout is the thing that makes this gate safe to ship at all.
 *
 * Falling through the timeout costs nothing worse than the `'fr'` default, i.e. exactly the
 * behaviour that shipped for months before this store was persisted at all.
 */
export function useLangHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useLangStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const done = () => setHydrated(true);
    const unsub = useLangStore.persist.onFinishHydration(done);
    // Hydration can finish between the initial useState and this effect subscribing, which would
    // leave the app gated forever on an event that already fired. Re-check, don't assume.
    if (useLangStore.persist.hasHydrated()) done();
    const timer = setTimeout(done, HYDRATION_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  return hydrated;
}

export function useLang(): Lang {
  return useLangStore((s) => s.lang);
}

/** Returns a translator bound to the active language: `const t = useT(); t('explore')`. */
export function useT(): (key: MKey) => string {
  const lang = useLang();
  return (key: MKey) => mt(lang, key);
}
