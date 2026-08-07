// Build-time config. Vite inlines VITE_* into the bundle, so ONLY publishable values belong here:
// the project URL and the anon key (both RLS-protected, both already shipped in the mobile apps).
// A service key here would be readable by every visitor.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Config manquante : ${name}. Copier web/.env.example vers web/.env.local et remplir les valeurs.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);

/** Where Google OAuth comes back to. Must be an allowed redirect URL in the Supabase dashboard. */
export const REDIRECT_URL = `${window.location.origin}/studio/`;

/** Which backend this bundle talks to, for the dev banner. Derived, never trusted for logic. */
export const IS_STAGING = SUPABASE_URL.includes('vefxfjcdvstjwieasrbq');

/**
 * Paddle is OPTIONAL, unlike the Supabase vars above.
 *
 * Without it the paywall calls `unlock` directly, which only succeeds if the account already holds
 * a credit. That is exactly the staging test path, and it is safe: no Paddle can never mean a free
 * reveal, because `unlock` charges a credit server-side regardless of what the client does.
 *
 * The client token is publishable by design (it identifies the seller to Paddle.js, it does not
 * authorise anything). The API key never comes near the browser.
 */
export const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN ?? '';
export const PADDLE_ENV: 'sandbox' | 'production' =
  import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox';
export const PADDLE_READY = PADDLE_TOKEN.length > 0;

/** Same values as the landing pages (site/index.html + site/en/index.html keep their own copies). */
export const APPSTORE_URL = 'https://apps.apple.com/fr/app/m%C3%A8che/id6777728552';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.meche.app';

export type Platform = 'ios' | 'android' | 'other';

export function platform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh, so touch points are what actually distinguish it.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}
