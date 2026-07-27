import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

/**
 * Client service_role réservé au Storage. Les deux buckets d'images sont privés
 * (`selfies` depuis l'origine, `generated` basculé privé par 0004_private_generated.sql),
 * et les policies sont scopées sur auth.uid() : seul service_role peut lire les fichiers
 * d'un autre utilisateur.
 *
 * Aucune lecture de table ne passe par ici — tout le SQL est dans lib/db.ts.
 */
export const IMAGE_BUCKETS = ['selfies', 'generated'] as const;
export type ImageBucket = (typeof IMAGE_BUCKETS)[number];

export function isImageBucket(v: string): v is ImageBucket {
  return (IMAGE_BUCKETS as readonly string[]).includes(v);
}

let cached: ReturnType<typeof createClient> | null = null;

export function storage() {
  if (!cached) {
    const env = getEnv();
    cached = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached.storage;
}
