import type { ActivityVM } from '@/components/ActivityList';
import { fmtDateTime, fmtUsdMicroFine } from '@/lib/format';
import { AI_IMAGE_EST_MICRO_USD, AI_SUGGEST_EST_MICRO_USD } from '@/lib/pricing';
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
 * Coût affiché sur la ligne : mesuré (registre ai_calls, 0036) quand il existe, sinon estimé au
 * prix unitaire, préfixé « ≈ ». Null = rien n'a été dépensé (échec no_credits : l'appel Gemini
 * n'est jamais parti).
 */
function costLabel(a: Activity): string | null {
  if (a.cost_micro_usd != null) return fmtUsdMicroFine(a.cost_micro_usd);
  if (a.kind === 'suggestion') return `≈ ${fmtUsdMicroFine(AI_SUGGEST_EST_MICRO_USD)}`;
  if (a.error === 'no_credits') return null;
  return `≈ ${fmtUsdMicroFine(AI_IMAGE_EST_MICRO_USD)}`;
}

/**
 * Raison d'échec courte pour la colonne Détail : l'erreur complète (gardée dans le dépliage) porte
 * les catégories de sécurité et la phrase du modèle — trop long pour une cellule. On retire le
 * verbatim `texte="…"` et on borne.
 */
function shortError(e: string | null): string {
  if (!e) return 'échec';
  const cleaned = e.replace(/texte="[^"]*"?/g, '').replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
  return cleaned.length > 90 ? `${cleaned.slice(0, 90)}…` : cleaned;
}

/**
 * Vue-modèle d'une ligne d'activité, partagée entre la fiche user (ActivityList) et l'onglet
 * Activité du dashboard (ActivityTable). Préparée côté serveur : dates déjà formatées, donc aucun
 * écart de rendu serveur/client sur les formats.
 */
export function toVM(a: Activity): ActivityVM {
  if (a.kind === 'suggestion') {
    const s = a.suggestion;
    return {
      kind: 'suggestion',
      id: a.id,
      when: fmtDateTime(a.created_at),
      title: s?.name ? `Suggestion : ${s.name}` : 'Suggestion demandée',
      meta: s
        ? [s.description, (s.reasons ?? []).join(', ')].filter(Boolean).join(' · ')
        : 'contenu non conservé (avant 0038, ou compte supprimé)',
      cost: costLabel(a),
      status: null,
      selfiePath: null,
      resultPath: null,
      error: null,
      // Le dépliage d'une suggestion montre son JSON complet (dont le prompt destiné au
      // générateur d'image), comme le brief d'un essai.
      brief: s ? JSON.stringify(s, null, 2) : null,
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
    meta: [
      briefMeta(a),
      photosDeleted ? 'photos supprimées' : '',
      a.status === 'failed' ? shortError(a.error) : '',
    ]
      .filter(Boolean)
      .join(' · '),
    cost: costLabel(a),
    status: a.status,
    selfiePath: a.selfie_path,
    resultPath: a.result_path,
    error: a.error,
    brief: a.brief ? JSON.stringify(a.brief, null, 2) : null,
    photosDeleted,
  };
}
