# Modèle de sécurité — ce qu'un client peut faire, et pourquoi

À lire avant de toucher aux policies, aux grants ou à `supabase/functions/generate`.

## Le principe, en une phrase

Deux mécanismes distincts, qu'il faut ne pas confondre :

- **La RLS isole les utilisateurs entre eux.** Chaque policy est en `user_id = auth.uid()`, donc un
  client ne voit et ne touche que ses propres lignes, quoi qu'il écrive dans sa requête. Vérifié :
  aucune donnée ni photo d'un autre utilisateur n'est atteignable, même en ciblant les lignes par
  leur UUID.
- **Les grants limitent ce qu'un client peut faire sur SES PROPRES lignes.** C'est là qu'étaient les
  trous.

Le motif dangereux n'est donc pas « le client peut écrire ». C'est :

> **le client peut écrire une valeur que le serveur relira ensuite avec `service_role`.**

Un client qui écrit ses propres données ne nuit qu'à lui-même — sauf si le serveur fait confiance à
cette valeur avec des privilèges élevés. C'est ce qui a produit les failles de juillet 2026.

## Ce que ça avait donné

`generations` était en `for all` et le serveur la relit **trois fois** dans `generate` :

1. le compteur à vie plafonne `PRO_FREE_TRIALS` ([generate](../supabase/functions/generate/index.ts) ~125)
2. le compteur horaire plafonne `GEN_USER_HOURLY_CAP` (~252)
3. le refine recharge `selfie_path` / `result_path` et les télécharge en `service_role`, donc **hors
   RLS storage** (~146)

Chaîne exploitable, chaque maillon vérifié : compte neuf → `claim_pro_role()` (accordé à
`authenticated` depuis 0020) → `isPro` vrai → `isPaidLook` court-circuitait **tous** les plafonds de
coût → seul restait le compteur à vie → le client supprimait ses lignes `generations` → compteur à
zéro → on recommence. Soit des générations Gemini **payantes illimitées**, sans limite de débit ni
plafond de budget, depuis un seul compte gratuit.

Le point 3 était un « confused deputy » : le contrôle était `prev.user_id = auth.uid()`, qui valide
qui possède la **ligne**, jamais que le **chemin** appartient à cette personne.

## L'état actuel

| table | écriture client | relue en `service_role` |
|---|---|---|
| `generations` | **aucune** (0021) | oui, 3× |
| `devices` | **aucune** (0021) | oui (`expo_push_token`) |
| `profiles` | UPDATE sur `display_name`, `handle`, `lang` seulement (0020 + 0022) | oui (`role`, `lang`) |
| `credit_transactions`, `subscriptions`, `suggest_calls` | **aucune policy** → refus RLS | oui |
| `looks`, `feed_events` | CRUD complet | écrites seulement, jamais relues |
| `requests`, `messages`, `bookings`, `salons`, `stylists`, `services`, `portfolio_items` | CRUD selon propriété | **aucune fonction edge n'y touche** |

Les tables qui portent l'argent et les quotas ont le grant mais **aucune policy d'écriture** : en
RLS, pas de policy = refus. Elles sont verrouillées par Postgres, pas par le code de l'app.

### Les RPC qui remplacent l'écriture directe (0021, 0023)

Le client ne garde que ce dont l'app se sert, via des fonctions `security definer` qui dérivent
l'identité de `auth.uid()` :

- `forget_generation_media(uuid)` — annule les chemins de SA génération après suppression d'un look.
  **La ligne survit** : c'est le reçu du crédit dépensé. Sans elle, un écart crédits/essais n'est
  plus diagnosticable, et les deux compteurs de quota ci-dessus redeviennent réinitialisables.
- `register_push_token(text, text)` / `unregister_push_token(text)` — valide la forme du token,
  plafonne à 10 appareils, et **réattribue** un token déjà enregistré ailleurs (un token identifie un
  APPAREIL, pas un compte).

### Premier essai verrouillé (0026) — bucket `vault` + `unlock_generation`

Une génération payée par le pool FREE (crédit de bienvenue) alors que le pool PAID est à zéro est
livrée en **aperçu flouté 160px** ; l'image nette attend dans le bucket **`vault`**, qui n'a **aucune
policy storage** : pas de policy = refus RLS pour toute opération client (lire, signer, supprimer).
Seul `service_role` y touche — même barrière que le schéma `private` ci-dessous. Le device ne reçoit
donc jamais les octets nets avant l'achat (le cache local-first les persisterait sinon).

**Le flou est appliqué SUR LE SERVEUR** (`_shared/teaser.ts` : réduction 160px, box blur 3 passes
rayon 5, JPEG q50, ~2,5 Ko), et le client n'applique **aucun** `blurRadius`. C'est délibéré : un flou
côté client est un effet d'affichage, donc quiconque lit le cache images de l'app récupère le fichier
qui est dessous. Livrer une vignette nette et la flouter à l'écran ne protège rien. Le flou est aussi
destructif là où la réduction ne l'est pas : un agrandissement IA remonte partiellement un downscale,
il ne reconstruit pas une moyenne de voisinage. Invariant : **ne jamais livrer une image nette au
client en comptant sur le rendu pour la masquer** — ce qui est sur l'appareil est ce qui est visible.

Invariants à ne pas casser :
- **Le débit du déblocage garde `reason='generation'`** (`external_id='unlock:<genId>'`). La replay
  free/paid de `generate` ne comprend que `purchase`/`generation`/`admin_grant` ; une nouvelle
  reason gonflerait silencieusement le solde qu'elle calcule. L'index unique sur `external_id`
  (0007) rend le double-débit impossible, y compris sous deux appels concurrents (vérifié sur
  staging).
- **Un crédit accordé par le backoffice (`admin_grant`, 0029) compte du côté PAYÉ**, donc il lève le
  verrou comme un achat — c'est le but : un geste commercial doit donner un vrai essai, pas un
  aperçu flouté. Les deux replays (serveur `generate`, client `useCreditSummary`) doivent connaître
  la reason **ensemble** ; l'une sans l'autre donne un solde affiché que le serveur refuse, ou un
  écran « avant achat » sur un compte que le serveur considère payant. L'écriture n'est pas un
  insert : la RPC `admin_grant_credits` (service_role seulement) porte les bornes, le refus de
  solde négatif, l'advisory lock partagé avec `reserve_generation_credit` / `unlock_generation`, et
  l'idempotence par `external_id='admin:<ref>'`.
- **Débit AVANT reveal.** Le chemin net est prédictible (`<uid>/<genId>-out.<ext>`) ; la RPC
  `unlock_generation` (advisory lock partagé avec `reserve_generation_credit`) committe le débit,
  PUIS la fonction `unlock` déplace vault→generated, avec compensation (delete du débit + re-lock)
  si le déplacement échoue. Copier avant de débiter permettrait de voler l'image en pollant l'URL.
- **Une ligne `locked=true` ne porte jamais un `result_path` net** : le fail-open du teaser (pipeline
  image en panne → livraison nette) remet `locked=false` dans le même update.
- `unlock {discard:true}` efface l'objet vault quand un look verrouillé est supprimé (le client n'a
  aucun accès au bucket), et `delete-account` couvre le bucket `vault` dans sa boucle d'effacement.
- Kill switch : la ligne `app_config.locked_first_try` (0027, table world-readable en SELECT,
  écriture service_role seulement) pilote `generate` ET la présentation client (affichage des
  crédits achetés seuls, caption "d'abord l'aperçu"), pour que l'expérience bascule d'un bloc :
  `update app_config set value='0' where key='locked_first_try';`. Valeurs : `0` off, `1` respecte
  le flag client `supportsLocked`, `force` verrouille tout. L'env `LOCKED_FIRST_TRY` sur `generate`,
  s'il est posé, écrase la table (levier d'urgence) ; en temps normal il reste absent.

### Le schéma `private` (0023)

`supabase/config.toml` ne publie que `public` et `graphql_public`, donc `private` est **inatteignable
par l'API Data** indépendamment des grants. Les `revoke` sont une seconde barrière, pas la première.
Il contient le poivre de hachage et les marqueurs de réinscription.

### Jobs pg_cron

`pg_cron` était déjà dans `shared_preload_libraries` des projets Supabase, il suffisait de créer
l'extension.

- `purge-signup-marks` (04h17 UTC) — conservation 12 mois des marqueurs (0024). **Quotidien et non
  mensuel** : la politique de confidentialité annonce 12 mois, un passage mensuel dépasserait
  l'engagement publié.
- `reconcile-orphan-paths` (04h32 UTC) — annule les chemins d'images dont l'objet storage a disparu
  (0025). Supprimer un look retire les fichiers **puis** annule les chemins, et ces deux étapes ne
  sont pas atomiques : une requête interrompue laisse un chemin mort.

### Anti-réinscription (0023)

Un trigger `BEFORE DELETE on auth.users` — **pas** dans `delete-account`, car une suppression faite
depuis le dashboard ou l'API admin contournerait la fonction edge. Il attrape ses propres exceptions :
une suppression de compte ne doit **jamais** échouer, c'est une obligation App Store et un droit RGPD.

Le crédit n'est refusé que si la personne avait **réellement consommé** quelque chose. Normalisation :
minuscules, espaces, `+suffixe` retiré ; les **points restent significatifs** (seul Gmail les ignore,
les ignorer partout refuserait un crédit à de vrais nouveaux utilisateurs).

> **Obligation liée :** ce mécanisme conserve un hash d'email, qui reste une donnée personnelle
> pseudonymisée au sens du RGPD. Il est annoncé dans `legal/public/{fr,en}/privacy.html`. **Toute
> modification de la durée ou de la finalité doit être reportée dans ces pages**, qui sont publiques.

Contournable en changeant d'adresse. Le vrai plancher reste `GEN_DAILY_BUDGET_EUR` dans `generate`.

## Refaire l'audit

Le motif à chercher est toujours le même : croiser « écrivable par le client » et « relu par le
serveur en `service_role` ».

```sql
-- 1. Qu'est-ce qu'un client peut écrire ? (grant ET policy requis)
select t.table_name,
       string_agg(distinct g.privilege_type, ',') as grants,
       (select string_agg(distinct cmd, ',') from pg_policies p
         where p.tablename = t.table_name and p.cmd <> 'SELECT') as policies
from information_schema.tables t
left join information_schema.role_table_grants g
  on g.table_name = t.table_name and g.grantee = 'authenticated'
 and g.privilege_type in ('INSERT','UPDATE','DELETE')
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
group by t.table_name order by 1;
```

```bash
# 2. Qu'est-ce que le serveur relit avec service_role ?
grep -rhoE "from\('[a-z_]+'\)" supabase/functions/*/index.ts | sort | uniq -c | sort -rn
```

L'intersection des deux est la seule zone à risque. Tester ensuite en se mettant dans la peau d'un
client, jamais en lisant les policies :

```sql
select set_config('request.jwt.claims',
  json_build_object('sub','<uuid>','role','authenticated')::text, true);
set local role authenticated;
-- puis tenter lectures et écritures, dans une transaction annulée
```

## Ce qui reste ouvert

- **`profiles` a encore le grant `DELETE`** pour `authenticated`. Inoffensif aujourd'hui : aucune
  policy `DELETE` n'existe, donc la RLS refuse. Mais c'est le même motif — un droit inutilisé dont
  l'innocuité dépend d'une policy absente ailleurs. Et `profiles` cascade sur `generations` **et**
  `credit_transactions` : une future policy de suppression rouvrirait la chaîne de quota. À révoquer
  au prochain changement de schéma.
- **`delete-account` ne vide pas le bucket `portfolio`**, qui est public. Sans effet tant que le côté
  Pro n'a pas d'utilisateur (0 en prod), à corriger avant son lancement — une ligne dans la boucle
  des buckets.
- **Une suppression de compte faite HORS `delete-account`** (dashboard, API admin, SQL) laisse les
  fichiers en place : Supabase interdit désormais de supprimer dans `storage.objects` en SQL, donc
  rien ne les emporte. Ils sont inatteignables (les policies sont indexées sur l'uid du dossier, qui
  n'existe plus) mais **inatteignable n'est pas effacé**, et la politique publiée promet l'effacement.
  Filet de rattrapage : `scripts/purge-orphan-media.ts` (dry-run par défaut, `--commit` pour agir),
  qui supprime tout dossier dont l'uid n'est plus dans `auth.users`. À lancer après toute suppression
  faite en direct. Vérifié sur staging : 38 fichiers récupérés, dont 4 images nettes dans le `vault`.
