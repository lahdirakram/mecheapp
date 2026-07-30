import 'server-only';
import { admin } from './admin';
import { isFeedStatus } from '@/queries/feed';

/**
 * LES SEULES ÉCRITURES DU BACKOFFICE.
 *
 * Le reste de l'outil est en lecture seule et doit le rester (`lib/db.ts` ouvre chaque requête par
 * `begin read only`). Les deux gestes qui écrivent sont isolés ici, et volontairement étroits :
 *   - ils passent par PostgREST, pas par le pool Postgres, donc le garde-fou `read only` du pool
 *     reste littéralement vrai ;
 *   - la surface est déclarée dans le type `BackofficeDb` de `lib/admin.ts` : une table
 *     (`feed_items`, colonne `status`) et une fonction (`admin_grant_credits`). Écrire ailleurs ne
 *     compile pas.
 *
 * Toute nouvelle écriture passe par ce fichier, ou n'existe pas.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Curation du feed : une seule table, une seule colonne. Le statut est revalidé, et les ids sont
 * validés comme UUID avant de partir dans un `in()`.
 *
 * Aucune suppression : refuser = `archived`. Les combos déjà tirés restent lus par `gen-feed.mjs`
 * pour sa déduplication (il lit tous les statuts), donc supprimer un refus ferait regénérer la même
 * image, à nouveau payante.
 */
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

/** Erreurs métier renvoyées par la RPC (0029), déjà rédigées pour l'écran. */
const GRANT_ERRORS: Record<string, string> = {
  bad_delta: 'Montant invalide : un entier entre -1000 et 1000, et pas 0.',
  not_found: 'Compte introuvable.',
  pro_account: "Compte pro : son quota vient de l'abonnement, un crédit n'y servirait à rien.",
  would_go_negative: 'Retrait refusé : le solde deviendrait négatif.',
};

export type GrantResult = { balance: number; replay: boolean };

/**
 * Crédits accordés à la main (geste commercial, remboursement, presse, test).
 *
 * Ce sont de VRAIS crédits : la raison `admin_grant` compte dans le pool PAYÉ côté serveur
 * (`functions/generate`) comme côté app (`useCreditSummary`), donc l'essai sort net même quand le
 * premier essai verrouillé est actif. Le pourquoi du choix de raison est dans la migration 0029.
 *
 * L'écriture n'est PAS un insert dans `credit_transactions` mais un appel de RPC : les garde-fous
 * (bornes, solde jamais négatif, verrou par utilisateur, idempotence) vivent en base, là où un
 * futur appelant ne peut pas les contourner.
 *
 * `ref` est l'uuid frappé au RENDU du formulaire : un double envoi retombe sur la même ligne
 * (external_id unique, 0007) au lieu de créditer deux fois.
 */
export async function grantCredits(
  userId: string,
  delta: number,
  note: string,
  ref: string,
): Promise<GrantResult> {
  if (!UUID.test(userId)) throw new Error('Utilisateur invalide.');
  if (!UUID.test(ref)) throw new Error('Formulaire expiré, recharge la page.');
  if (!Number.isInteger(delta)) throw new Error('Montant invalide : un nombre entier est attendu.');

  const { data, error } = await admin().rpc('admin_grant_credits', {
    p_user: userId,
    p_delta: delta,
    p_note: note.slice(0, 200),
    p_ref: ref,
  });

  if (error) throw new Error(`crédits: ${error.message}`);
  const res = (data ?? {}) as { error?: string; balance?: number; replay?: boolean };
  if (res.error) throw new Error(GRANT_ERRORS[res.error] ?? `crédits: ${res.error}`);
  return { balance: res.balance ?? 0, replay: res.replay === true };
}
