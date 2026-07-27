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
export function priceCentsSql(col = 'pack_id'): string {
  const whens = Object.entries(PACK_PRICES_CENTS)
    .map(([id, cents]) => {
      if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`pack_id invalide: ${id}`);
      return `when '${id}' then ${cents}`;
    })
    .join(' ');
  return `(case ${col} ${whens} else 0 end)`;
}
