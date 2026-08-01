import { supabase } from './supabase';

/**
 * Drapeaux serveur du studio (`app_config`, 0027).
 *
 * Une seule clé compte ici : `web_studio` (0034), l'interrupteur d'arrêt du tunnel payant. Il permet
 * de suspendre le studio par une ligne SQL, sans rebuild Railway (les VITE_* sont inlinées au build)
 * et sans couper le service, qui sert aussi les pages légales.
 */

/** FAIL OPEN. Voir 0034 : une panne réseau ne doit jamais ressembler à une fermeture volontaire. */
const DEFAULT_OPEN = true;

export async function fetchStudioOpen(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'web_studio')
      .maybeSingle();
    // Erreur, ligne absente, valeur vide : ouvert. Seul un '0' explicite ferme.
    if (error || !data) return DEFAULT_OPEN;
    return String(data.value).trim() !== '0';
  } catch {
    return DEFAULT_OPEN;
  }
}
