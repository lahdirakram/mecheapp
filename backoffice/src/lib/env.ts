import 'server-only';

// Les deux projets Supabase (CLAUDE.md → "Environments", ENVIRONMENTS.md:38-41).
const PROJECTS: Record<string, { label: string; isProd: boolean }> = {
  hqhnvjjbohzktoapsytj: { label: 'PROD', isProd: true },
  vefxfjcdvstjwieasrbq: { label: 'STAGING', isProd: false },
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} manquant. Copier backoffice/.env.example vers backoffice/.env.local et le remplir.`,
    );
  }
  return v;
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Comptes internes (les tiens, ceux de tes proches, les comptes de test) à sortir des chiffres.
 * Ils faussent tout au démarrage : deux comptes maison sur 82, c'est 2,4 % du volume, et surtout
 * ils concentrent des essais et des achats de test qui n'ont rien à voir avec de vrais clients.
 * Renseigné par EXCLUDED_EMAILS, séparé par des virgules. Volontairement dans .env.local (ignoré
 * par git) plutôt que dans le code : pas d'adresses personnelles versionnées.
 */
function excludedEmails(): string[] {
  return (process.env.EXCLUDED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getEnv() {
  const supabaseUrl = required('SUPABASE_URL');
  const host = new URL(supabaseUrl).hostname;
  // `supabase start` : le stack de dev local, ni prod ni staging.
  const isLocal = LOCAL_HOSTS.has(host);
  // Ref du projet extrait de https://<ref>.supabase.co.
  const ref = isLocal ? 'local' : (host.split('.')[0] ?? '');
  const known = PROJECTS[ref];
  return {
    supabaseUrl,
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    databaseUrl: required('DATABASE_URL'),
    excludedEmails: excludedEmails(),
    projectRef: ref,
    isLocal,
    // Un projet inconnu est traité comme prod : mieux vaut un bandeau rouge de trop.
    label: isLocal ? 'LOCAL' : (known?.label ?? `INCONNU (${ref})`),
    isProd: isLocal ? false : (known?.isProd ?? true),
  };
}
