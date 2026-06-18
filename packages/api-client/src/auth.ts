import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabase } from './provider';

export type Role = 'b2c' | 'pro';

/** Auth actions bound to the app's Supabase client. Social providers use ID-token sign-in. */
export function useAuth() {
  const client = useSupabase();

  return {
    /** Email + password sign-up. `role` decides B2C (gets 1 free credit) vs Pro (see trigger).
     *  `emailRedirectTo` is the app deep link the confirmation email returns to (auto-login).
     *  `lang` is stored in user metadata so the confirmation email template can localise via
     *  `{{ .Data.lang }}` ("fr" | "en"). */
    async signUpEmail(
      email: string,
      password: string,
      role: Role = 'b2c',
      displayName = '',
      emailRedirectTo?: string,
      lang: 'fr' | 'en' = 'fr',
    ) {
      return client.auth.signUp({
        email,
        password,
        options: { data: { role, display_name: displayName, lang }, emailRedirectTo },
      });
    },

    signInEmail(email: string, password: string) {
      return client.auth.signInWithPassword({ email, password });
    },

    /** Confirm a sign-up with the 6-digit code from the email (OTP, not the magic link).
     *  On success the client stores the session, so the screen can just route on. */
    verifyEmailOtp(email: string, token: string) {
      return client.auth.verifyOtp({ email, token, type: 'signup' });
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
