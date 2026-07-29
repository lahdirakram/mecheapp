'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { setFeedStatus } from '@/lib/curation';

/**
 * Action de curation, appelée par les formulaires de la page feed (aucun JS côté client : un
 * bouton = un submit, donc ça marche même si l'hydratation n'a pas eu lieu).
 *
 * `back` est l'URL de la vue courante pour y revenir avec ses filtres ; elle vient du serveur mais
 * transite par le DOM, donc on la revalide (chemin interne uniquement, pas de redirection ouverte).
 */
export async function curateAction(formData: FormData) {
  const status = String(formData.get('status') ?? '');
  const ids = formData.getAll('id').map(String);
  const raw = String(formData.get('back') ?? '');
  const back = raw.startsWith('/feed') ? raw : '/feed';

  const n = await setFeedStatus(ids, status);

  revalidatePath('/feed');
  redirect(`${back}${back.includes('?') ? '&' : '?'}ok=${n}&to=${status}`);
}
