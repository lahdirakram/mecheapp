'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { grantCredits } from '@/lib/writes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Accorder (ou reprendre) des crédits, appelée par le formulaire de la fiche utilisateur. Comme la
 * curation : un submit classique, donc ça marche même sans hydratation.
 *
 * Le résultat repart en query string plutôt qu'en état React — la page est un Server Component
 * `force-dynamic`, et le rechargement est justement ce qui affiche le nouveau solde.
 */
export async function grantAction(formData: FormData) {
  const id = String(formData.get('user_id') ?? '');
  if (!UUID.test(id)) redirect('/');

  const raw = String(formData.get('delta') ?? '').trim();
  const note = String(formData.get('note') ?? '');
  const ref = String(formData.get('ref') ?? '');

  let flash: string;
  try {
    const delta = Number(raw);
    if (!raw || !Number.isFinite(delta)) throw new Error('Montant invalide : un nombre entier est attendu.');
    const res = await grantCredits(id, delta, note, ref);
    flash = res.replay
      ? `Déjà appliqué (envoi en double ignoré). Solde : ${res.balance}.`
      : `${delta > 0 ? `+${delta}` : delta} crédit${Math.abs(delta) > 1 ? 's' : ''}. Nouveau solde : ${res.balance}.`;
  } catch (e) {
    flash = `err:${e instanceof Error ? e.message : String(e)}`;
  }

  revalidatePath(`/users/${id}`);
  redirect(`/users/${id}?flash=${encodeURIComponent(flash)}`);
}
