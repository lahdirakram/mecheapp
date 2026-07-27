import 'server-only';
import { Pool } from 'pg';
import { getEnv } from './env';

// Le pool survit au hot-reload de Next (sinon chaque edit ouvre un nouveau pool).
declare global {
  // eslint-disable-next-line no-var
  var __mechePool: Pool | undefined;
}

type PgTarget = { user: string; password: string; host: string; port: number; database: string };

/**
 * Découpe la chaîne Postgres nous-mêmes au lieu de la confier à `connectionString`.
 *
 * POURQUOI : `pg` délègue à pg-connection-string, qui fait `new URL(dsn)` puis
 * `decodeURIComponent(url.password)` (index.js:45). Un mot de passe collé BRUT depuis le dashboard
 * Supabase casse donc de deux façons, vérifiées :
 *   - un `#` ou un `?` fait lever ERR_INVALID_URL (ils terminent l'autorité, le host disparaît) ;
 *   - un `%` suivi de deux chiffres hexa est SILENCIEUSEMENT décodé en autre chose
 *     (`%23` devient `#`), donc pg se connecte avec un mot de passe faux sans rien signaler.
 * `connectionString` attend en fait un mot de passe déjà percent-encodé. En passant les champs
 * séparément, la question de l'encodage disparaît : on colle le mot de passe brut, tel quel.
 *
 * Le host ne peut pas contenir de `@`, donc le DERNIER `@` sépare toujours correctement les deux
 * moitiés, même si le mot de passe en contient un.
 */
function parseDsn(dsn: string): PgTarget {
  const clean = dsn.trim().replace(/^["']|["']$/g, '');
  const m = /^postgres(?:ql)?:\/\/(.*)@([^@]+)$/.exec(clean);
  if (!m) {
    throw new Error(
      'DATABASE_URL invalide. Format attendu : postgresql://user:motdepasse@hote:port/base',
    );
  }
  const [, userinfo, hostpart] = m;
  const sep = userinfo.indexOf(':');
  // Pas de décodage : le mot de passe est pris tel quel, comme copié depuis le dashboard.
  const user = sep === -1 ? userinfo : userinfo.slice(0, sep);
  const password = sep === -1 ? '' : userinfo.slice(sep + 1);

  // Les paramètres (?sslmode=…) sont ignorés : le TLS est décidé plus bas selon l'environnement.
  const hm = /^([^:/]+)(?::(\d+))?(?:\/([^?]*))?/.exec(hostpart.replace(/\?.*$/, ''));
  if (!hm) throw new Error('DATABASE_URL : hôte illisible');

  return {
    user,
    password,
    host: hm[1],
    port: hm[2] ? Number(hm[2]) : 5432,
    database: hm[3] || 'postgres',
  };
}

function makePool(): Pool {
  const env = getEnv();
  const pool = new Pool({
    ...parseDsn(env.databaseUrl),
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    application_name: 'meche-backoffice',
    // Le pooler Supabase impose TLS mais sa chaîne n'est pas dans le store Node : transport
    // chiffré, vérification du cert désactivée. Le Postgres de `supabase start` ne fait pas
    // de TLS du tout, donc on ne le demande pas.
    ssl: env.isLocal ? undefined : { rejectUnauthorized: false },
  });

  // OBLIGATOIRE : node-postgres fait remonter sur le pool les erreurs des clients INACTIFS
  // (connexion coupée par le pooler, rechargement à chaud de Next, sortie de veille du Mac).
  // Sans ce listener elles deviennent des uncaughtException et tuent le serveur. Le pool
  // rouvre une connexion tout seul au prochain checkout, il n'y a rien d'autre à faire.
  pool.on('error', (err) => {
    console.error('[db] connexion inactive perdue:', err.message);
  });

  return pool;
}

function getPool(): Pool {
  if (!global.__mechePool) global.__mechePool = makePool();
  return global.__mechePool;
}

/**
 * Toute lecture passe par une transaction `read only` explicite. C'est le garde-fou central du
 * backoffice : il tient quel que soit le mode de pooling (contrairement à un `set` de session,
 * perdu en mode transaction), donc aucune requête ne peut écrire, même par erreur.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    await client.query('begin read only');
    const res = await client.query(sql, params);
    await client.query('commit');
    return res.rows as T[];
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Même chose, pour les requêtes dont on attend exactement zéro ou une ligne. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
