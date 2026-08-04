/**
 * Prix catalogue des packs de crédits, en centimes d'euro.
 * Source : supabase/migrations/0005_reprice_packs.sql:3-6 et supabase/seed.sql:4-8, où
 * `credit_packs.price` est une chaîne d'affichage FR ('2,99 €') et non un montant.
 *
 * POURQUOI UNE ESTIMATION : le webhook RevenueCat (supabase/functions/iap-webhook/index.ts:100-106)
 * n'écrit que { user_id, delta, reason:'purchase', pack_id, external_id } et jette les champs
 * `price` / `price_in_purchased_currency` / `currency` / `store` de l'événement. Il n'existe donc
 * aucun montant en base. Le CA calculé ici est :
 *   - en EUR catalogue, pas au prix localisé réellement payé sur l'App Store / Play,
 *   - BRUT, avant commission store (15/30 %) et avant TVA (les prix affichés sont TTC),
 *   - rétroactif : un futur repricing réécrirait l'historique.
 * L'abonnement Pro (29,99 €/mois) n'a aucun prix en base et reste exclu du CA.
 */
export const PACK_PRICES_CENTS: Record<string, number> = {
  taste: 99, // 5 crédits
  star: 299, // 20 crédits
  pro: 599, // 50 crédits
};

/**
 * Fabrique le `case pack_id when … end` en centimes, pour sommer le CA côté SQL sans dupliquer
 * les prix. Les clés sont les nôtres, mais on les valide quand même avant interpolation.
 */
/**
 * Coûts IA : depuis 0036, chaque appel Gemini sortant écrit une ligne `ai_calls` avec son
 * usageMetadata et son coût EXACT en micro-dollars (calculé au tarif du moment de l'appel,
 * retries et refus inclus — Google facture les deux). Les coûts IA s'AFFICHENT donc en USD,
 * la devise de la facture Google : aucune conversion dans le chiffre principal. L'équivalent
 * EUR entre parenthèses (et la marge, qui se soustrait d'un CA en EUR) passe par un taux fixe
 * assumé, à rafraîchir à la main de temps en temps.
 *
 * Les unités micro-USD servent aussi à estimer l'HISTORIQUE d'avant 0036, qui n'a pas de
 * lignes `ai_calls` : image × 0,039 $ (le prix officiel par image ≤ 1024px), suggestion
 * × ~0,003 $ (mesuré sur un appel réel : 2 886 µ$ — ~400 tokens d'entrée mais ~1 100 de sortie,
 * le thinking de gemini-2.5-flash pèse plus que le JSON rendu).
 */
export const USD_TO_EUR = 0.87;
export const AI_IMAGE_EST_MICRO_USD = 39_000;
export const AI_SUGGEST_EST_MICRO_USD = 3_000;

/** micro-USD → centimes d'euro, pour l'équivalent EUR et la marge. */
export const microUsdToCents = (microUsd: number) => (microUsd * USD_TO_EUR) / 10_000;

/** Centimes d'euro → micro-USD, pour les coûts historiques enregistrés en EUR (gen_meta.cost_eur). */
export const eurCentsToMicroUsd = (cents: number) => (cents * 10_000) / USD_TO_EUR;

export function priceCentsSql(col = 'pack_id'): string {
  const whens = Object.entries(PACK_PRICES_CENTS)
    .map(([id, cents]) => {
      if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`pack_id invalide: ${id}`);
      return `when '${id}' then ${cents}`;
    })
    .join(' ');
  return `(case ${col} ${whens} else 0 end)`;
}
