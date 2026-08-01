import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mt, type Lang, type MKey } from '@meche/core';

interface LangState {
  lang: Lang;
  /**
   * Whether `lang` came from the human or from a default/seed. Without this a stored `'fr'` is
   * indistinguishable from never having been asked, so `seedLang` could not tell whom it is allowed
   * to overwrite.
   */
  chosen: boolean;
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
 * FR is the fallback default, but it is no longer what an English speaker gets: the B2C app seeds
 * from the device locale on first run (see `seedLang`). This module stays deliberately FREE of
 * `expo-localization` even so, because it is shared with meche-pro, whose binary does not carry that
 * native module. An import here would be loaded by dyld at process start, i.e. an unavoidable
 * launch crash for Pro on the next OTA. The caller supplies the locale; the store only arbitrates.
 */
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'fr',
      chosen: false,
      setLang: (lang) => set({ lang, chosen: true }),
      toggle: () => set((s) => ({ lang: s.lang === 'fr' ? 'en' : 'fr', chosen: true })),
    }),
    {
      name: 'meche.lang',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the choice is worth storing. The actions are rebuilt on every boot, and persisting
      // them would write functions that come back as null.
      partialize: (s) => ({ lang: s.lang, chosen: s.chosen }),
      // The ONLY signal zustand gives on a failed read: the success path fires onFinishHydration
      // instead. Log it, since otherwise a user stuck on the default has nothing to report.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[i18n] lang hydration failed, keeping default', error);
        // The device seed is (re)applied HERE, after the stored value has been merged in. Verified
        // in zustand's compiled middleware: `merge()` runs at line 419 and overwrites whatever the
        // store held, and this callback runs at 431 — before `hasHydrated = true` (433) and before
        // the listeners that open <AppProviders>' render gate. So this is both the first point where
        // the seed can survive, and the last point where changing the language is still invisible.
        applyDeviceLang();
      },
    },
  ),
);

/**
 * The device language, as reported by whichever app bothered to look it up. Module-level rather than
 * store state because it is an INPUT to the decision, not part of it: persisting it would resurrect
 * a stale phone locale on the next launch.
 */
let deviceLang: Lang | null = null;

function applyDeviceLang(): void {
  if (!deviceLang) return;
  const s = useLangStore.getState();
  // `chosen` is deliberately read as falsy-or-not rather than `=== false`: a value stored by a build
  // that predates this flag comes back with `chosen` undefined, and "stored before we ever asked" is
  // exactly the case the seed exists to serve. Reading it as a strict boolean would freeze every
  // existing user on French forever, which is the bug this whole mechanism was meant to fix.
  if (s.chosen) return;
  if (s.lang !== deviceLang) useLangStore.setState({ lang: deviceLang });
}

/**
 * Tell the store what language the phone is in. Only ever overrides a default, never an explicit
 * choice, so it is safe to call on every launch.
 *
 * Applied twice on purpose: once now (covers a call that lands after hydration has finished) and
 * once from `onRehydrateStorage` (covers the normal case, where this is called at module scope
 * before the storage read completes). Whichever happens last wins, and both orders end in the same
 * state, so the caller does not have to know anything about hydration timing.
 */
export function seedLang(lang: Lang): void {
  deviceLang = lang;
  applyDeviceLang();
}

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
