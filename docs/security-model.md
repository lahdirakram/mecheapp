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
