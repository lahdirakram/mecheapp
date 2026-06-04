import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Build a Supabase client. Apps pass their AsyncStorage-backed `storage` adapter so
 * sessions persist on device. URL + anon key come from EXPO_PUBLIC_* env (RLS-protected).
 */
export function createSupabase(opts: {
  url: string;
  anonKey: string;
  storage?: unknown;
}): SupabaseClient {
  return createClient(opts.url, opts.anonKey, {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storage: opts.storage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // PKCE: the email-confirmation link returns to the app with a ?code= that the deep-link
      // handler exchanges for a session (auto-login). The code_verifier lives in `storage` here.
      flowType: 'pkce',
      // No-op lock. supabase-js defaults to navigator.locks on web, which can deadlock
      // (token attach on a request never resolves); RN has no Web Locks API at all. A simple
      // pass-through is safe for a single-client mobile app and fixes both environments.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  });
}

export type { SupabaseClient };
