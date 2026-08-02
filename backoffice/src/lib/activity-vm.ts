import type { ActivityVM } from '@/components/ActivityList';
import { fmtDateTime } from '@/lib/format';
import type { Activity } from '@/queries/activity';

/** Résumé lisible du brief : le brief ne contient que lookId / prompt / sliders. */
function briefMeta(a: Activity): string {
  const bits: string[] = [];
  if (a.source) bits.push(a.source);
  if (a.match != null) bits.push(`match ${a.match}`);
  const b = a.brief ?? {};
  if (b.mood) bits.push(b.mood);
  if (b.color) bits.push(b.color);
  if (typeof b.length === 'number') bits.push(`longueur ${Math.round(b.length * 100)} %`);
  if (typeof b.fringe === 'number') bits.push(`frange ${Math.round(b.fringe * 100)} %`);
  if (a.loved) bits.push('❤ favori');
  return bits.join(' · ');
}

/**
 * Vue-modèle d'une ligne d'activité, partagée entre la fiche user (ActivityList) et l'onglet
 * Activité du dashboard (ActivityTable). Préparée côté serveur : dates déjà formatées, donc aucun
 * écart de rendu serveur/client sur les formats.
 */
export function toVM(a: Activity): ActivityVM {
  if (a.kind === 'suggestion') {
    return {
      kind: 'suggestion',
      id: a.id,
      when: fmtDateTime(a.created_at),
      title: 'Suggestion demandée',
      meta: 'contenu non conservé en base',
      status: null,
      selfiePath: null,
      resultPath: null,
      error: null,
      brief: null,
      photosDeleted: false,
    };
  }
  const prompt = a.brief?.prompt?.trim();
  // Un essai réussi sans plus aucun chemin = look supprimé dans l'app (useDeleteLook efface les
  // fichiers et nulle les chemins, mais garde la ligne comme reçu du crédit). À ne pas confondre
  // avec un essai qui n'a jamais produit d'image.
  const photosDeleted = a.status === 'done' && !a.selfie_path && !a.result_path;
  return {
    kind: 'generation',
    id: a.id,
    when: fmtDateTime(a.created_at),
    title: a.look_name || a.brief?.lookName || prompt || 'Essai',
    meta: [briefMeta(a), photosDeleted ? 'photos supprimées' : ''].filter(Boolean).join(' · '),
    status: a.status,
    selfiePath: a.selfie_path,
    resultPath: a.result_path,
    error: a.error,
    brief: a.brief ? JSON.stringify(a.brief, null, 2) : null,
    photosDeleted,
  };
}
