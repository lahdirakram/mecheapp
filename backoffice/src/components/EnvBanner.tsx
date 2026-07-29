import { getEnv } from '@/lib/env';

/** On regarde de vraies données : le bandeau dit toujours lequel des deux projets est branché. */
export function EnvBanner() {
  let label: string;
  let isProd: boolean;
  let ref: string;
  try {
    const env = getEnv();
    label = env.label;
    isProd = env.isProd;
    ref = env.projectRef;
  } catch {
    return (
      <div className="banner banner--prod">
        Configuration manquante<span>backoffice/.env.local</span>
      </div>
    );
  }
  return (
    <div className={`banner ${isProd ? 'banner--prod' : 'banner--staging'}`}>
      <b>Mèche · backoffice · {label}</b>
      {/* Écriture unique : le statut d'un feed_item (lib/curation.ts). Tout le reste est lu. */}
      <span>lecture seule, sauf curation du feed · {ref}</span>
    </div>
  );
}
