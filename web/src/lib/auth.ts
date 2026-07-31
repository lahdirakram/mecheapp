import { supabase } from './supabase';
import { REDIRECT_URL } from './config';

/**
 * The email OTP length is FIXED AT 6 here, exactly like the four native screens.
 *
 * That length lives in the Supabase dashboard (Auth → Email OTP length), is versioned nowhere, and
 * differs per project. `supabase/config.toml` only governs the LOCAL stack. The July 2026 prod
 * outage was this: the project was moved to 8, every client truncated at 6, and `verifyOtp` answered
 * "invalid" while Resend reported "delivered".
 *
 * Do NOT make this tolerant of a variable length. Auto-verifying on the last digit is what removes a
 * button press from the funnel, and that only works if we know when the code is complete.
 * Both projects must stay on 6.
 */
export const OTP_LENGTH = 6;

export class AuthError extends Error {}

/**
 * Send a login code. Creates the account when the address is new, which fires `handle_new_user` and
 * grants the welcome credit that pays for the blurred teaser. That is the intended path, not a side
 * effect: the web funnel has no other source of a first credit.
 *
 * WHICH EMAIL TEMPLATE THIS SENDS DEPENDS ON WHETHER THE ADDRESS EXISTS:
 *   - new address      -> "Confirm signup" template
 *   - existing address -> "Magic Link" template
 * Both must be set to `{{ .Token }}` in the dashboard, per project. The apps only ever exercised
 * "Confirm signup", so "Magic Link" was still the stock link-based default and web users with an
 * existing account received an unusable link instead of a code. Same family of trap as the OTP
 * length: this behaviour lives in the dashboard and is versioned nowhere.
 */
export async function sendCode(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
    throw new AuthError('Cette adresse ne ressemble pas à un email.');
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true },
  });
  if (error) {
    // Rate limiting is the common one and deserves its own wording.
    if (/rate|too many|seconds/i.test(error.message)) {
      throw new AuthError('Trop de demandes. Attends une minute avant de redemander un code.');
    }
    throw new AuthError("Le code n'a pas pu être envoyé. Vérifie ton adresse.");
  }
}

/**
 * Verify the code and open the session.
 *
 * Tries `type: 'email'` first (the documented type for `signInWithOtp`), then falls back to
 * `'signup'`. The two paths above mint differently-typed tokens, and this project has already lost
 * five weeks to an OTP failure that presented as "code invalide" while the email was delivered
 * fine. One extra attempt, only on failure, is cheap next to that.
 */
export async function verifyCode(email: string, code: string): Promise<void> {
  const digits = code.replace(/\D/g, '').slice(0, OTP_LENGTH);
  if (digits.length !== OTP_LENGTH) {
    throw new AuthError(`Le code fait ${OTP_LENGTH} chiffres.`);
  }
  const clean = email.trim().toLowerCase();

  const first = await supabase.auth.verifyOtp({ email: clean, token: digits, type: 'email' });
  if (!first.error) return;

  const second = await supabase.auth.verifyOtp({ email: clean, token: digits, type: 'signup' });
  if (!second.error) return;

  // Log both so a genuine mismatch is diagnosable; never show a raw code to a visitor.
  console.warn('[auth] verify failed', { email: first.error.message, signup: second.error.message });
  throw new AuthError('Ce code est invalide ou expiré. Redemande-en un.');
}

export type Provider = 'google' | 'apple';

/**
 * Start a Google or Apple sign-in.
 *
 * This NAVIGATES AWAY and returns to REDIRECT_URL, so React state does not survive it. The caller
 * MUST persist the in-flight try-on (lib/draft.ts) before calling this, or the visitor comes back
 * signed in with no photo.
 *
 * The `?code=` on the way back is exchanged by supabase-js itself, because the browser client sets
 * `detectSessionInUrl: true` (unlike the native apps, which do it by hand in a deep-link handler).
 * The PKCE verifier lives in localStorage and survives the round trip.
 */
export async function signInWith(provider: Provider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: REDIRECT_URL },
  });
  // Reached only if the redirect never happened; otherwise the page is already gone.
  if (error) {
    throw new AuthError(
      provider === 'apple'
        ? "La connexion avec Apple n'a pas pu démarrer. Utilise ton email."
        : "La connexion avec Google n'a pas pu démarrer. Utilise ton email.",
    );
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
