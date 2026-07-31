import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// Deliberately NOT packages/api-client's createSupabase. Two of its options are wrong for a browser:
//
//  - `detectSessionInUrl: false` — correct for the native apps, which exchange the PKCE code
//    themselves in a deep-link handler. On the web the Google redirect lands back on THIS page with
//    ?code=..., and supabase-js has to consume it or the sign-in silently never completes.
//  - `storage` — the apps inject AsyncStorage. The browser default (localStorage) is what we want,
//    so it stays unset.
//
// The no-op `lock` IS carried over, and on purpose: api-client's comment records that supabase-js's
// default navigator.locks path can deadlock on web (a token attach that never resolves). Don't
// "restore" the default here.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
