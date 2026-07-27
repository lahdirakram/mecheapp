/**
 * Écran d'erreur lisible. Les deux cas attendus au premier lancement : .env.local absent ou
 * incomplet, et DATABASE_URL qui ne connecte pas (mauvais mot de passe, ou pooler en mode
 * "Transaction" au lieu de "Session").
 */
export function Fatal({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="fatal">
      <h1>Configuration incomplète</h1>
      <p className="sub">Le backoffice n&apos;a pas pu lire la base.</p>
      <pre>{msg}</pre>
      <p className="sub">
        Vérifier <code>backoffice/.env.local</code> (copie de <code>.env.example</code>) :{' '}
        <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>,{' '}
        <code>DATABASE_URL</code>. La chaîne Postgres doit être celle du <b>Session pooler</b>.
      </p>
    </div>
  );
}
