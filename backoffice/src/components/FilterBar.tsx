import Link from 'next/link';
import { withParams } from '@/lib/qs';
import { DEFAULT_SCOPE, type Scope } from '@/queries/filters';

/**
 * `key` est contraint aux clés de Scope, donc une faute de frappe sur le nom du filtre est
 * attrapée à la compilation. Les valeurs restent de simples chaînes : `parseScope` les revalide
 * de toute façon côté serveur, et une valeur inconnue retombe sur le défaut.
 */
type FilterGroup = {
  key: keyof Scope;
  label: string;
  options: { value: string; label: string; title?: string }[];
};

/**
 * Les quatre filtres pilotent à la fois les métriques et le tableau. Chacun est un groupe de liens
 * (pas de JS) : l'URL porte l'état, donc une vue se partage et se recharge à l'identique.
 *
 * La valeur par défaut est retirée de l'URL pour garder des liens propres, d'où le `undefined`.
 */
const GROUPS: FilterGroup[] = [
  {
    key: 'period',
    label: 'Période',
    options: [
      { value: 'all', label: 'Tout' },
      { value: '90d', label: '90 j' },
      { value: '30d', label: '30 j' },
      { value: '7d', label: '7 j' },
      { value: 'month', label: 'Ce mois-ci', title: 'Depuis le 1er du mois (heure de Paris)' },
      { value: 'yesterday', label: 'Hier', title: "La journée d'hier complète (heure de Paris)" },
      { value: 'today', label: "Aujourd'hui", title: 'Depuis minuit (heure de Paris)' },
    ],
  },
  {
    key: 'attempts',
    label: 'Essais',
    options: [
      { value: 'done', label: 'Réussis', title: 'Les échecs ne comptent pas comme essai livré' },
      { value: 'all', label: 'Tous statuts', title: 'Réussis + échecs + en cours' },
    ],
  },
  {
    key: 'accounts',
    label: 'Comptes',
    options: [
      { value: 'all', label: 'Tous' },
      {
        value: 'active',
        label: 'Activés',
        title: 'Au moins un essai réussi. Attention : réduit le dénominateur des taux',
      },
    ],
  },
  {
    key: 'role',
    label: 'Rôle',
    options: [
      { value: 'all', label: 'Tous' },
      { value: 'b2c', label: 'B2C' },
      { value: 'pro', label: 'Pro' },
    ],
  },
];

export function FilterBar({
  scope,
  params,
}: {
  scope: Scope;
  params: Record<string, string>;
}) {
  return (
    <div className="filters">
      {GROUPS.map((g) => (
        <div className="fgroup" key={g.key}>
          <span className="fgroup__label">{g.label}</span>
          <div className="seg">
            {g.options.map((o) => {
              const active = scope[g.key] === o.value;
              const href = withParams(params, {
                [g.key]: o.value === DEFAULT_SCOPE[g.key] ? undefined : o.value,
                // Changer de périmètre remet la pagination à 1, sinon on tombe sur du vide.
                page: undefined,
              });
              return (
                <Link
                  key={o.value}
                  href={href}
                  aria-current={active}
                  title={o.title}
                  scroll={false}
                >
                  {o.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
