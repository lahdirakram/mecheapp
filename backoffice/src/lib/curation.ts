import 'server-only';
import { admin } from './admin';
import { isFeedStatus } from '@/queries/feed';

/**
 * LA SEULE ÉCRITURE DU BACKOFFICE.
 *
 * Le reste de l'outil est en lecture seule et doit le rester (`lib/db.ts` ouvre chaque requête par
 * `begin read only`). Valider une photo du feed demande forcément d'écrire, alors cette écriture
 * est isolée ici et volontairement étroite :
 *   - elle passe par PostgREST, pas par le pool Postgres, donc le garde-fou `read only` du pool
 *     reste littéralement vrai ;
 *   - une seule table (`feed_items`), une seule colonne (`status`) ;
 *   - le statut est revalidé, et les ids sont validés comme UUID avant de partir dans un `in()`.
 *
 * Aucune suppression : refuser = `archived`. Les combos déjà tirés restent lus par
 * `gen-feed.mjs` pour sa déduplication (il lit tous les statuts), donc supprimer un refus ferait
 * regénérer la même image, à nouveau payante.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setFeedStatus(ids: string[], status: string): Promise<number> {
  if (!isFeedStatus(status)) throw new Error(`statut inconnu: ${status}`);
  const clean = [...new Set(ids)].filter((id) => UUID.test(id));
  if (clean.length === 0) return 0;

  const { data, error } = await admin()
    .from('feed_items')
    .update({ status })
    .in('id', clean)
    .select('id');

  if (error) throw new Error(`curation: ${error.message}`);
  return data?.length ?? 0;
}
