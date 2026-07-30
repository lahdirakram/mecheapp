// The subscription's monthly quota / the lifetime free discovery try-ons.
//
// DISPLAY ONLY. These are a mirror of the server's enforcement, never the enforcement itself:
// supabase/functions/generate reads PRO_MONTHLY_QUOTA / PRO_FREE_TRIALS from its env (same
// defaults as below) and is the only thing that can refuse a generation. Editing these numbers
// changes what the UI promises, not what the user gets, so a change here without the matching
// env change on both Supabase projects makes every screen lie.
export const MONTHLY_QUOTA = 100;
export const FREE_TRIALS = 3;
