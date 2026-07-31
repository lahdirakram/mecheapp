import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabase } from './provider';

export type Role = 'b2c' | 'pro';

/** Mot de passe saisi à l'inscription, gardé en mémoire le temps de la vérification du code.
 *
 *  Pourquoi : quelqu'un dont le compte est resté non confirmé refait l'inscription pour recevoir un
 *  nouveau code. Supabase ne remplace PAS le mot de passe dans ce cas, c'est le tout premier saisi
 *  qui reste actif (vérifié sur staging). Sans cette reprise, la personne entre bien dans l'app via
 *  le code, puis ne peut plus jamais se reconnecter avec le mot de passe qu'elle vient de choisir.
 *
 *  En mémoire volatile et lu une seule fois, JAMAIS en paramètre de route : les params d'expo-router
 *  finissent dans l'URL et dans l'état de navigation sérialisé. */
let pendingSignupPassword: string | null = null;

export function rememberSignupPassword(password: string) {
  pendingSignupPassword = password;
}

export function takeSignupPassword() {
  const password = pendingSignupPassword;
  pendingSignupPassword = null;
  return password;
}

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
     * Passwordless sign-in: email a 6-digit code to an EXISTING account.
     *
     * Why this exists: the web studio signs people up with a code and never sets a password, so
     * those accounts could not get into the app at all (`signInEmail` needs one). It also covers
     * the far more common case of an app user who simply forgot theirs.
     *
     * `shouldCreateUser: false` is load-bearing. Left at its default of `true`, a typo in the email
     * would silently CREATE an account — firing `handle_new_user`, burning a welcome credit, and
     * leaving the person staring at a code sent to an address they do not own. Signing up stays the
     * deliberate path in `signup.tsx`.
     *
     * NOTE: this sends the dashboard's "Magic Link" template, not "Confirm signup". Both must be on
     * `{{ .Token }}` or the email arrives with an unusable link instead of a code. See CLAUDE.md.
     */
    signInWithEmailCode(email: string) {
      return client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    },

    /**
     * Verify a passwordless sign-in code.
     *
     * Tries `email` then falls back to `signup`: a never-confirmed account mints a differently
     * typed token, and this project has already lost weeks to an OTP that presented as "invalid"
     * while the mail was delivered fine. One extra attempt, only on failure.
     */
    async verifySignInOtp(email: string, token: string) {
      const first = await client.auth.verifyOtp({ email, token, type: 'email' });
      if (!first.error) return first;
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

    /** Start a password reset: emails a 6-digit recovery code (the "Reset Password" template must
     *  expose `{{ .Token }}`, like the signup one). Supabase returns success even for unknown
     *  emails, so the screen can't leak whether an account exists. */
    resetPassword(email: string) {
      return client.auth.resetPasswordForEmail(email);
    },

    /** Verify the 6-digit recovery code. On success the client stores a (temporary) session, which
     *  is what authorises the follow-up `updatePassword` call. */
    verifyRecoveryOtp(email: string, token: string) {
      return client.auth.verifyOtp({ email, token, type: 'recovery' });
    },

    /** Set a new password for the signed-in (recovery) session. */
    updatePassword(password: string) {
      return client.auth.updateUser({ password });
    },

    /** Permanently delete the signed-in user's account (storage + all data, via the delete-account
     *  Edge Function), then sign out locally so the auth guard routes back to Welcome. */
    async deleteAccount() {
      const { error } = await client.functions.invoke('delete-account');
      if (error) throw error;
      await client.auth.signOut();
    },
  };
}

/** Non-hook variant for use outside React (e.g. deep-link handlers). */
export function authActions(client: SupabaseClient) {
  return {
    signOut: () => client.auth.signOut(),
  };
}
