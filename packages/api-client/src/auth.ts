import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabase } from './provider';

export type Role = 'b2c' | 'pro';

/** Auth actions bound to the app's Supabase client. Social providers use ID-token sign-in. */
export function useAuth() {
  const client = useSupabase();

  return {
    /** Email + password sign-up. `role` decides B2C (gets 1 free credit) vs Pro (see trigger). */
    async signUpEmail(email: string, password: string, role: Role = 'b2c', displayName = '') {
      return client.auth.signUp({
        email,
        password,
        options: { data: { role, display_name: displayName } },
      });
    },

    signInEmail(email: string, password: string) {
      return client.auth.signInWithPassword({ email, password });
    },

    /**
     * Apple sign-in. Pass the identityToken from expo-apple-authentication.
     * Requires the Apple provider configured in Supabase Auth.
     */
    signInApple(identityToken: string) {
      return client.auth.signInWithIdToken({ provider: 'apple', token: identityToken });
    },

    /** Google sign-in via ID token (from expo-auth-session / Google). */
    signInGoogle(idToken: string) {
      return client.auth.signInWithIdToken({ provider: 'google', token: idToken });
    },

    signOut() {
      return client.auth.signOut();
    },

    resendConfirmation(email: string) {
      return client.auth.resend({ type: 'signup', email });
    },
  };
}

/** Non-hook variant for use outside React (e.g. deep-link handlers). */
export function authActions(client: SupabaseClient) {
  return {
    signOut: () => client.auth.signOut(),
  };
}
