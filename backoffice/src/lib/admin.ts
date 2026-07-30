import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

/**
 * Client `service_role` partagé (Storage + les écritures du backoffice : curation du feed, crédits
 * accordés à la main).
 *
 * Il ne sert JAMAIS à lire une table : tout le SQL de lecture passe par `lib/db.ts`, qui garantit
 * le `begin read only`. Passer par PostgREST plutôt que par le pool Postgres pour l'écriture n'est
 * pas un détail : ça garde ce garde-fou littéralement vrai (aucune connexion du pool ne peut
 * écrire, même par erreur), et ça limite l'écriture à ce qu'un client PostgREST peut faire sur une
 * table nommée explicitement.
 */
/**
 * Schéma volontairement minuscule : il ne déclare QUE ce que le backoffice a le droit d'écrire.
 * Ce n'est pas de la cosmétique de types — `from('autre_table')` ne compile pas, donc la surface
 * d'écriture est vérifiée à la compilation et pas seulement par la revue.
 *
 * `credit_transactions` n'est volontairement PAS listée : les crédits accordés passent par la RPC
 * `admin_grant_credits` (0029), qui porte les garde-fous en base. Un insert direct dans le ledger
 * ne compile donc pas, même depuis `lib/writes.ts`.
 */
type BackofficeDb = {
  public: {
    Tables: {
      feed_items: {
        Row: { id: string; status: string };
        Insert: { id?: string; status?: string };
        Update: { status?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      admin_grant_credits: {
        Args: { p_user: string; p_delta: number; p_note: string; p_ref: string };
        Returns: { error?: string; tx_id?: string; balance?: number; replay?: boolean };
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

let cached: ReturnType<typeof createClient<BackofficeDb>> | null = null;

export function admin() {
  if (!cached) {
    const env = getEnv();
    cached = createClient<BackofficeDb>(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
