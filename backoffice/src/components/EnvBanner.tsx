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
      <span>lecture seule · {ref}</span>
    </div>
  );
}
