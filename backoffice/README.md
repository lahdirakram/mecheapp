# Backoffice Mèche

Dashboard admin **local** et **en lecture seule** : vue d'ensemble chiffrée, tableau d'utilisateurs
paginé avec recherche, et fiche utilisateur avec l'activité et l'avant/après de chaque essai.

> **Usage local uniquement, ne pas déployer.** Il n'y a aucune authentification, et le process
> détient la clé `service_role` plus un accès Postgres direct : la mettre en ligne exposerait toute
> la base. Le serveur n'écoute que sur `127.0.0.1`.

## Démarrer

```bash
./backoffice/start.sh
```

C'est le seul point d'entrée. Il bascule sur Node 22, installe les dépendances au premier lancement,
vérifie que `.env.local` est complet, refuse de démarrer si le port est occupé (en donnant la
commande pour libérer), et annonce sur quel backend il est branché avant d'ouvrir. Port différent :
`PORT=3200 ./backoffice/start.sh`.

Première fois, remplir la configuration :

```bash
cp backoffice/.env.example backoffice/.env.local
```

`DATABASE_URL` se récupère dans Supabase → Project Settings → Database → Connection string →
**Session pooler**. Le mode « Transaction » ne conserve pas l'état de session.

Basculer entre les deux backends = remplacer les trois valeurs de `.env.local` par celles de l'autre
projet (`hqhnvjjbohzktoapsytj` = prod, `vefxfjcdvstjwieasrbq` = staging). Le bandeau en haut de page
rappelle en permanence lequel est branché, en rouge pour la prod.

## Les filtres du haut

Quatre sélecteurs pilotent **à la fois les cartes et le tableau** : lire deux périmètres différents
sur un même écran est le meilleur moyen de tirer une fausse conclusion. L'état vit dans l'URL, donc
une vue se partage et se recharge à l'identique.

| Filtre | Défaut | Effet |
|---|---|---|
| **Période** | Tout | Filtre les **événements** : essais, suggestions, transactions, et la carte « Inscrits ». |
| **Essais** | Réussis | `réussis` ne compte que `status = 'done'`. Un échec n'est pas un essai livré. |
| **Comptes** | Tous | `activés` = au moins un essai réussi. |
| **Rôle** | Tous | B2C / Pro. |

Trois subtilités volontaires, sinon les chiffres se contrediraient :

1. **La période ne filtre pas le nombre de comptes.** C'est le dénominateur de l'ARPU et du taux de
   conversion : le faire varier avec la fenêtre rendrait ces taux illisibles. « Inscrits » est la
   carte qui, elle, suit la période.
2. **`Comptes = tous` par défaut**, alors que le filtre `activés` existe. Réduire le dénominateur
   gonfle mécaniquement les taux de conversion : ce serait se mentir par défaut. Le filtre est à un
   clic quand on veut regarder la cohorte activée.
3. **« Crédits en circulation » ignore la période** : c'est un solde courant, pas un flux. Le
   restreindre à une fenêtre n'aurait aucun sens. Même chose pour la colonne « Solde » du tableau.

La répartition `ok / échecs / en cours` sur la carte des essais est toujours calculée **sans** le
filtre de statut, pour rester informative même quand les échecs sont exclus du total.

## Comptes internes

`EXCLUDED_EMAILS` dans `.env.local` liste les adresses à sortir de **tous** les chiffres : comptes
perso, famille, comptes de test. Sur un petit volume ils faussent tout, et surtout ils concentrent
des essais et des achats de test qui n'ont rien à voir avec de vrais clients.

```
EXCLUDED_EMAILS=toi@exemple.com,quelquun@exemple.com
```

Ils restent **visibles dans le tableau**, marqués « interne », pour rester consultables quand tu
débugues. Le nombre de comptes exclus est rappelé sous le titre du dashboard, pour que les chiffres
restent explicables. La résolution se fait sur `auth.users.email` en SQL, il n'y a donc aucune liste
d'UUID à maintenir à la main.

Le stack local (`supabase start`) marche aussi, et c'est le plus pratique pour travailler sur le
backoffice lui-même : `.env.local` contient déjà le bloc à décommenter, le bandeau affiche `LOCAL`,
et le TLS est automatiquement désactivé pour ce Postgres qui n'en fait pas.

## Pourquoi hors du workspace pnpm

`pnpm-workspace.yaml` ne référence que `apps/*` et `packages/*`, et `.npmrc` force
`node-linker=hoisted`. Une app web sous `apps/` partagerait l'arbre `node_modules` aplati avec les
deux apps Expo (qui épinglent `react@19.2.3` / `react-native@0.85.3`) et risquerait de casser Metro.
Le backoffice a donc son propre `node_modules` et son propre lockfile npm, comme `legal/`.

## Lecture seule

`src/lib/db.ts` exécute chaque requête dans une transaction `begin read only`. C'est le garde-fou
central : il tient quel que soit le mode de pooling, contrairement à un réglage de session qui
serait perdu en pooling transactionnel. Aucune écriture n'est possible, même par erreur.

Les photos passent par `/api/img` (`src/app/api/img/route.ts`), qui streame les octets depuis les
buckets privés `selfies` / `generated` avec la clé `service_role`. Aucune URL signée ne sort du
backoffice, et le bucket est validé par allowlist.

## Ce que les chiffres veulent vraiment dire

- **CA, CA moyen, panier moyen : ce sont des estimations** (badge `EST` dans l'UI). Le webhook
  RevenueCat (`supabase/functions/iap-webhook/index.ts:100-106`) n'écrit que
  `{user_id, delta, reason, pack_id, external_id}` et jette `price` / `currency` / `store`. Il
  n'existe donc aucun montant en base. Les prix utilisés sont ceux du catalogue
  (`src/lib/pricing.ts`, d'après `0005_reprice_packs.sql`) : EUR, **bruts** avant commission store
  (15/30 %) et avant TVA, et sans les prix localisés réellement payés. Un repricing futur
  réécrirait l'historique.
- **L'abonnement Pro (29,99 €/mois) est exclu du CA** : aucun prix n'existe en base pour lui. Il est
  compté à part, en nombre d'abonnements actifs.
- **Les suggestions n'ont pas de contenu.** `suggest_calls` (`0009_store_hardening.sql:47-53`) est un
  compteur de rate-limit ; `suggest/index.ts` renvoie la suggestion au client sans la persister.
  L'activité n'affiche donc qu'une date.
- **« Crédits consommés » est déjà net.** Un essai qui échoue voit sa ligne de réservation
  supprimée (`generate/index.ts:329,343`), pas compensée par un `+1`. Il ne reste que la ligne
  `generations` en `status = 'failed'`.
- **« Ont fait un essai »** compte les utilisateurs distincts dans `generations`, tous statuts
  confondus : une tentative échouée reste une tentative.
- **L'email vient de `auth.users`**, pas de `profiles`. C'est la raison d'être de la connexion
  Postgres directe : `supabase/config.toml` n'expose pas le schéma `auth` à l'API Data, donc
  chercher ou trier par email est impossible via PostgREST.

## Pour rendre le CA exact

Ajouter `price_cents` / `currency` à `credit_packs` et `amount_cents` / `currency` / `store` /
`product_id` à `credit_transactions`, puis patcher `iap-webhook` pour les écrire depuis l'événement
RevenueCat. Le CA devient exact à partir du déploiement ; l'historique reste estimé.
