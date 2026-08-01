# Studio web — l'offre payante hors stores

Statut : **tunnel vérifié de bout en bout sur staging, Paddle écrit et configuré en SANDBOX.**
Reste : le vrai checkout sandbox, puis la prod.
Plan de déploiement complet en bas de ce fichier. Le code vit dans
[`web/`](../web/README.md). Maquette cliquable :
https://claude.ai/code/artifact/1b945957-666b-447e-98ca-64304c336a33

Une page unique sur le site (`/studio`) pour les visiteurs qui n'installeront pas l'app. Portrait,
look, essai flouté, paiement Paddle, révélation. Aucun résultat net sans paiement.

Décidé : **email avant la génération**, **`/studio` en chemin sur le domaine principal**, et **les
mêmes prix que l'app** (le tarif Paddle négocié est un 10 % pur, sans part fixe, donc 0,99 € reste
rentable).

## La décision qui structure tout : ce n'est pas un nouveau produit

Le parcours web est **le premier essai verrouillé (0026) avec Paddle à la place de RevenueCat**.
Le crédit de bienvenue de `handle_new_user` paie le teaser flouté, `unlock` débite le crédit acheté
pour révéler. Toute la chaîne existe déjà et a été auditée.

Conséquence : **la seule fonction edge à écrire est `paddle-webhook`.** `generate`, `unlock`, le
bucket `vault`, le flou serveur, les plafonds de coût, la RLS : rien à toucher.

Ce qui a été rejeté, et pourquoi :

- **Paiement avant toute génération** (zéro dépense IA non compensée). Rejeté : le web n'a pas la
  preuve sociale d'un store, et demander de l'argent avant d'avoir rien montré à quelqu'un qui vient
  d'arriver est le pire taux de conversion possible. Le teaser flouté est précisément le mécanisme
  construit pour ce problème.
- **Sessions anonymes Supabase** (friction zéro jusqu'au paiement). Rejeté : `handle_new_user`
  accorde 1 crédit gratuit à tout nouveau `auth.users`, et `enable_anonymous_sign_ins` autorise 30
  inscriptions/heure/IP. Soit un robinet de générations Gemini gratuites, farmable en vidant le
  localStorage, avec seulement `GEN_DAILY_BUDGET_EUR` en dernier rempart (et le plafond horaire par
  utilisateur inopérant, puisque chaque visite est un uid neuf). **L'email avant la génération est
  ce qui rend le teaser coûteux à farmer** : une adresse réelle par essai gratuit, et le marqueur
  anti-réinscription (0023) refuse déjà le crédit de bienvenue à une adresse qui a consommé.
- **Export Expo web de `apps/meche`**. Rejeté : l'app est bâtie sur caméra native, RevenueCat, push,
  et le tunnel web est un produit différent (une page, pas d'onglets, pas de gratuit). Un SPA séparé
  est plus petit que le travail de neutraliser les modules natifs.

## Où vit le code

`web/` à la racine, **hors du workspace pnpm**, même raison que `backoffice/` : c'est une
app navigateur, elle ne doit pas partager l'arbre plat des apps Expo. Propre `node_modules`, propre
lockfile npm. Vite + React + TypeScript. Deux dépendances : `@supabase/supabase-js`, `@paddle/paddle-js`.

## Le routage : `/studio` sur le domaine principal (décidé)

**Décidé : le chemin, pas le sous-domaine.** `mecheapp.com/studio`, pour garder un tunnel continu
depuis la landing.

**Vérifié, et ça change la solution** (developers.cloudflare.com/rules/origin-rules, juillet 2026) :
les Origin Rules Cloudflare ne réécrivent le hostname (« DNS record override ») **qu'en offre
Enterprise**. Les offres Free, Pro et Business ne permettent que l'override de port. Une Origin Rule
ne peut donc pas router `/studio*` vers un autre service Railway.

Retenu : **un seul service, un seul dossier.** L'ancien `legal/` a été déplacé dans `web/site/`, et
`web/server.js` sert tout : la landing, les pages légales bilingues, et le SPA sur `/studio`. Pas de
proxy, pas d'adressage inter-services, un seul déploiement. Le studio porte du coup le vrai pied de
page du site, ce qui était l'argument décisif : `/studio` ne doit pas ressembler à un autre site.

**Le coût, assumé et à ne pas oublier** : un build studio cassé bloque le déploiement des pages
légales, qui sont un engagement opposable. Si ça arrive pendant un correctif urgent de politique de
confidentialité, déployer sans l'étape de build puis la remettre.

Écarté en chemin, avec la raison :

- **Un proxy `/studio/*` entre deux services Railway** (implémenté puis retiré) : marchait, mais
  ajoutait un saut réseau, l'adressage privé, et surtout empêchait le partage direct du pied de page
  et des assets. Piège rencontré au passage, noté au cas où on y revienne : **le réseau privé Railway
  est IPv6 seul**, un serveur qui écoute sur `0.0.0.0` y est injoignable (`ECONNREFUSED`), il faut
  `::`.
- **Worker Cloudflare** : marche en offre gratuite (100k req/jour), mais c'est une brique de plus à
  déployer et surveiller.

## Les prix : les mêmes que l'app (décidé)

Le tarif public Paddle est 5 % + 0,50 $ (vérifié sur paddle.com/pricing, juillet 2026). C'est la
**part fixe** qui interdisait les petits paniers : 0,50 $ sur 0,99 €, c'est la moitié du prix.
**Le tarif négocié est un 10 % pur, sans part fixe**, donc la commission devient proportionnelle et
l'entrée à 0,99 € redevient rentable.

Décision : **le web vend exactement les mêmes packs que l'app.** On verra plus tard s'il faut
augmenter, mais partout à la fois.

| Pack | Crédits | Prix | Frais 10 % | Net | Coût IA | Marge |
|---|---|---|---|---|---|---|
| `taste` | 5 | 0,99 € | 0,10 € | 0,89 € | 0,20 € | 78 % |
| `star` | 20 | **2,99 €** | 0,30 € | 2,69 € | 0,80 € | 70 % |
| `pro` | 50 | 5,99 € | 0,60 € | 5,39 € | 2,00 € | 63 % |

`star` porte le badge `popular` et arrive présélectionné. Coût IA au plein tarif (0,04 €/essai),
comme si tous les crédits vendus étaient consommés, ce qui n'arrive jamais : la marge réelle est
au-dessus.

### Ce que cette égalité supprime

C'est la vraie économie de la décision, au-delà du prix :

- **Pas de colonne `channel`**, pas de lignes `credit_packs` propres au web. Les trois lignes
  existantes servent les deux surfaces.
- **Pas d'OTA préalable.** Le plan précédent imposait « OTA d'abord, migration ensuite » parce que
  des lignes web seraient apparues dans l'écran de recharge de l'app, où elles seraient
  inachetables. Sans lignes nouvelles, les clients installés voient exactement ce qu'ils voyaient.
  La seule migration devient un `alter table credit_packs add column paddle_price_id text` :
  une colonne nullable, invisible pour un client qui fait `select *`.
- **Pas de dérive de prix entre les deux canaux** : le paywall web lit `credit_packs`
  (`web/src/lib/packs.ts`), il n'a pas sa propre copie des tarifs. Changer un prix reste un seul
  `update`, appliqué partout.

## `locked_first_try` : `'0'` en prod, et c'est assumé

**Vérifié : la prod est à `'0'`, staging à `'1'`.** La prod livre donc aujourd'hui l'image nette à
tout compte qui a son crédit de bienvenue. Le 0027 insère `'1'`, mais c'est la valeur d'insertion,
pas l'état courant.

**Décision : on le laisse à `'0'` pour l'instant.** Ce qui comptait était de savoir que le mécanisme
marche quand on l'allume, et c'est vérifié de bout en bout sur staging (compte neuf → teaser flouté
serveur → paywall → `unlock` → image nette, invariants du grand livre respectés).

Ce qu'il faut garder en tête :

- **Le studio web ne peut pas ouvrir au public tant que la prod est à `'0'`.** `generate` renverrait
  une image nette, il n'y aurait rien à révéler, et le paywall vendrait du vide. C'est le dernier
  interrupteur à basculer, pas un préalable au développement.
- **Le réglage est global, il ne distingue pas l'app du web.** Le passer à `'1'` allume aussi le
  premier essai verrouillé dans l'app en prod. Le test device de l'app est donc sur le chemin
  critique du lancement web, même si le web n'en dépend pas pour être construit et testé.
- La bascule, le moment venu :
  `update app_config set value = '1', updated_at = now() where key = 'locked_first_try';`
  Pas de redéploiement, pas d'OTA : `generate` et le client lisent la même ligne.

## Points de vigilance
- **La photo est TOUJOURS convertie en JPEG et redimensionnée à 1600px dans le navigateur** avant
  l'envoi (`web/src/lib/image.ts`). Deux raisons : `generate` plafonne le payload décodé (7 Mo) et
  le base64 gonfle d'un tiers ; et un PNG de résolution téléphone pèse plusieurs mégaoctets pour la
  même image, c'est le moyen le plus simple de dépasser le plafond. Un JPEG 1600px q0.9 fait 0,3 à
  1,5 Mo, un ordre de grandeur sous la limite, avec un garde-fou qui ré-encode plus bas si jamais
  un cliché très bruité dépasse 4 Mo. **Ne pas baisser le 1600px** : c'est l'image que Gemini voit,
  et la règle du repo est que la copie STOCKÉE peut être réduite, pas l'entrée du modèle.
- **Pas d'analytics tiers au lancement** → pas de bandeau cookies (la session Supabase en localStorage
  est strictement nécessaire), donc pas de friction sur le tunnel. Ajouter GA4 change ça.
- **Légal, deux ajouts obligatoires** : renonciation explicite au droit de rétractation de 14 jours
  pour livraison numérique immédiate (case à cocher au checkout, Paddle le gère mais les CGV doivent
  le dire), et Paddle déclaré comme vendeur et sous-traitant dans
  `web/site/{fr,en}/privacy.html`. Rappel : ces pages sont un contrat avec le code.
- **La longueur de l'OTP email doit rester à 6** sur le projet prod, sinon le tunnel web casse au même
  endroit que l'app (voir CLAUDE.md).

## Paddle : configuration

**Contrairement à l'IAP, le web EST testable de bout en bout hors prod.** RevenueCat n'a qu'un projet,
d'où la règle « tout achat crédite la prod ». Paddle a un vrai **sandbox séparé**
(`sandbox-vendors.paddle.com`), avec ses propres produits, son propre client token et ses propres
destinations de webhook. On câble donc :

| Environnement Paddle | Webhook vers | Sert à |
|---|---|---|
| **Sandbox** | `vefxfjcdvstjwieasrbq` (staging) | tester le tunnel d'achat en entier |
| **Production** | `hqhnvjjbohzktoapsytj` (prod) | les vrais paiements |

### Dans le dashboard Paddle (les deux environnements)

1. **Vérification du compte** — Paddle valide l'identité et l'activité avant d'autoriser les
   paiements réels. **C'est le seul délai non compressible du plan**, à lancer en premier. Le
   sandbox, lui, est utilisable tout de suite.
2. **Catalog → Products** : un produit « Mèche — essais », catégorie de taxe **standard digital
   goods** (Paddle est vendeur officiel, c'est ce réglage qui pilote la TVA).
3. **Catalog → Prices** : trois prix **one-time** (surtout pas récurrents), en EUR :
   2,99 / 5,99 / 8,99. Noter les trois identifiants `pri_...`, ils vont dans `credit_packs`.
4. **Checkout → Website approval** : ajouter le domaine du site. Sans ça, Paddle.js refuse
   d'ouvrir le checkout depuis cette origine.
5. **Developer tools → Authentication** : récupérer le **client token** (`live_...` / `test_...`).
   Il est publiable, il part dans le bundle.
6. **Developer tools → Notifications** : une destination vers
   `https://<ref>.supabase.co/functions/v1/paddle-webhook`, abonnée à **`transaction.completed`**
   uniquement. Récupérer la clé secrète (`pdl_ntfset_...`).

### Ce que le webhook doit faire (vérifié sur developer.paddle.com, 2026-07-30)

- **Signature** : en-tête `Paddle-Signature: ts=<unix>;h1=<hex>`. `h1` est un HMAC-SHA256 de la
  chaîne `` `${ts}:${rawBody}` `` avec la clé `pdl_ntfset_...`. **Le corps BRUT est obligatoire** :
  reparser puis re-sérialiser le JSON change la chaîne signée et la vérification échoue.
  Comparaison à temps constant.
- **Tolérance d'horodatage** : le défaut des SDK Paddle est de **5 secondes**, ce qui est trop serré
  ici — un démarrage à froid de fonction edge plus une dérive d'horloge suffisent à faire rejeter un
  paiement légitime. Prendre **60 s** : ça reste inutilisable pour un rejeu et ça supprime les faux
  négatifs.
- **Idempotence : `event_id`** (préfixe `evt_`), pas `notification_id` (`ntf_`). Un même événement
  peut produire plusieurs notifications, chacune avec son `notification_id`, mais toutes avec le
  même `event_id`. C'est donc `event_id` qui va dans `credit_transactions.external_id`, où l'index
  unique de 0007 rend le double-crédit impossible.
- **`reason` doit rester `'purchase'`** (invariant `security-model.md`), et l'uuid Supabase arrive
  par `data.custom_data.user_id`, passé au checkout. Même piège que `$RCAnonymousID` : sans lui, on
  crédite personne.
- Déployer avec **`--no-verify-jwt`** (Paddle n'envoie pas de JWT Supabase), comme `iap-webhook`.

## Compte Paddle dédié : « AML Technology »

**Décidé : un compte Paddle séparé pour Mèche**, sandbox et production, parce que Paddle impose un
compte par entreprise et que plusieurs réglages sont globaux au compte, dont **le libellé de relevé
bancaire**. Vérifié sur paddle.com/help : « you will need to create a new account with a unique
email address for every new business ». Un compte = un nom légal, un nom d'affichage, **un libellé
de relevé**, un jeu de statistiques.

Sur l'ancien compte partagé avec FixMyText.AI, le libellé était `PERFECTION` : c'est ce qu'un client
Mèche aurait vu sur son relevé, cause classique de contestation. Sur le nouveau compte il est mis à
**`MECHE`**.

### Configuré en SANDBOX (2026-07-31)

Produit `pro_01kyvyfzhdd62ej08a44njx6y2`, catégorie **standard digital goods**, trois prix
**one-time** en EUR, quantité max 1 :

| Pack | Prix | `paddle_price_id` (sandbox) |
|---|---|---|
| `taste` (5) | 0,99 € | `pri_01kyvyjp7tv16d6ky7k1ahpmsv` |
| `star` (20) | 2,99 € | `pri_01kyvyn3r3h5w97mzvc9knvj24` |
| `pro` (50) | 5,99 € | `pri_01kyvyqg1x4drb5wtdyy8ykhcq` |

Écrits dans `credit_packs` sur **staging**. Destination webhook vers
`https://vefxfjcdvstjwieasrbq.supabase.co/functions/v1/paddle-webhook`, abonnée à
**`transaction.completed` uniquement**. `PADDLE_WEBHOOK_SECRET` posé sur staging, fonction déployée
en `--no-verify-jwt`. Client token dédié dans `web/.env.local`.

### Deux pièges du dashboard, tous deux vérifiés

1. **Le champ « Base price » est en locale française et avale le point décimal.** Taper `0.99`
   enregistre **99,00 €**. Il faut la virgule : `0,99`. Relire le montant affiché avant chaque
   enregistrement, l'erreur est silencieuse et coûteuse.
2. **Un « Default payment link » est obligatoire** avant de pouvoir enregistrer quoi que ce soit
   dans Checkout Settings, y compris le libellé de relevé. Sur un compte neuf il est vide, et
   l'erreur affichée (« one or more fields are missing or invalid ») ne dit pas lequel. En sandbox,
   `localhost` est accepté (Paddle le réécrit en https).

### Pages légales : mises à jour pour la vente web

**Elles étaient devenues fausses.** Les CGU disaient que les achats « sont traités par Apple ou
Google » et que « toute demande de remboursement passe par le store concerné » : vrai pour l'app,
faux dès qu'on vend sur le site. Et **Paddle exige une politique de remboursement** pour approuver
un domaine (« your website must link through to, or contain, your: terms of service, privacy notice
and refund policy »).

Ajouté en FR et EN dans `web/site/*/terms.html` :

- **Achats sur le web** : Paddle.com Market Ltd vendeur officiel, facture et TVA par Paddle, libellé
  bancaire `MECHE`, crédits communs au site et à l'app, aucun abonnement.
- **Remboursements** : crédits non consommés remboursables 14 jours ; crédits consommés non
  remboursables ; **génération échouée = crédit rendu automatiquement** (c'est ce que fait vraiment
  le code, refund du `resvId` dans `generate`).
- **Droit de rétractation** étendu : le consentement à l'exécution immédiate est recueilli par
  Paddle au paiement, et le droit subsiste tant que les crédits ne sont pas consommés.

Et dans `web/site/*/privacy.html` : Paddle ajouté à la liste des sous-traitants, avec ce qu'il reçoit
(email, données de facturation) et ce que nous ne voyons jamais (les données de carte).

**Pourquoi 14 jours, alors que ce n'est pas un abonnement.** Question posée, réponse vérifiée :

- Le droit de rétractation de 14 jours (directive 2011/83, `L221-28` en France) **ne dépend pas de
  la récurrence**. Il vise les contrats à distance conclus avec un consommateur, achat unique
  compris. Ce qui l'écarte pour un contenu numérique, c'est **le consentement exprès à l'exécution
  immédiate**, pas le fait que ce soit un paiement unique.
- Surtout : **Paddle est vendeur officiel, donc sa politique s'applique à l'acheteur quoi qu'on
  écrive.** Elle dit (paddle.com/legal/refund-policy) : remboursement à sa seule discrétion si la
  demande arrive dans les 14 jours, et remboursement intégral pour un produit numérique **sauf si
  l'acheteur a commencé à l'utiliser ou à en bénéficier**. Écrire « aucun remboursement »
  n'empêcherait rien, ça rendrait juste les CGU incohérentes avec le vécu de l'acheteur.
- **Le tunnel referme la fenêtre tout seul** : révéler consomme un crédit immédiatement, donc payer
  et « bénéficier » sont le même geste. L'exposition résiduelle, c'est quelqu'un qui paie et ne
  révèle jamais, ce que le produit rend quasi impossible.

Le test retenu est donc celui de Paddle : **un seul crédit utilisé et l'achat entier n'est plus
remboursable**, crédits restants inclus. Pas de remboursement partiel.

> **À faire relire par un juriste avant la mise en vente.** C'est de la rédaction contractuelle
> écrite pour coller au comportement réel du code, pas un avis juridique.

**Trou opérationnel connexe** : rembourser dans Paddle **ne retire pas les crédits**, rien n'écoute
`transaction.refunded`. Quelqu'un remboursé garde donc ses crédits non consommés. Volume nul au
lancement, mais c'est à traiter avant que ça compte.

### Le webhook, testé contre staging

| Cas | Réponse |
|---|---|
| Sans signature / signature fausse | `401 unauthorized` |
| Horodatage périmé (10 min) | `401 stale_signature` |
| Prix inconnu (autre produit) | `200 skipped: no_matching_pack` |
| `user_id` absent ou non-uuid | `200 skipped: unmappable_user` |
| Événement non `transaction.completed` | `200 ignored` |
| Notre prix | `200 granted: true, credits: 20` |
| Même `event_id` rejoué | `200 granted: false` |

Grand livre : une seule ligne `purchase`, `pack_id='star'`. Rejoué après rotation du secret et
bascule sur les prix du nouveau compte : identique.

**Le garde-fou « prix inconnu » reste indispensable** même avec un compte dédié : c'est lui qui
rend le webhook insensible à tout ce qui n'est pas au catalogue Mèche.

## Cartes de test sandbox

Aucune vraie carte n'est acceptée par un compte sandbox. Nom du porteur libre, expiration
n'importe quelle date future, CVV et code postal libres (la doc Paddle n'en impose aucun).

| Cas | Numéro |
| --- | --- |
| Succès, sans 3DS | `4242 4242 4242 4242` |
| Succès, avec 3DS | `4000 0038 0000 0446` |
| Visa debit valide | `4000 0566 5566 5556` |
| Refusée | `4000 0000 0000 0002` |
| Passe, puis refus aux suivants (INUTILE ICI, voir plus bas) | `4000 0027 6000 3184` |

Pour tester l'écran de révélation, prendre celle **sans 3DS** : l'overlay se ferme directement et
on voit l'enchaînement `confirming` → `fetching` → balayage sans étape intercalée. La carte 3DS est
utile pour l'inverse, vérifier que l'attente tient quand la banque s'intercale.

`4000 0000 0000 0002` est la seule façon de vérifier qu'un paiement refusé ne débite AUCUN crédit :
`payAndReveal` doit revenir au paywall avec l'erreur, jamais avancer vers `unlock`.

**Ne pas se servir de `4000 0027 6000 3184`.** Elle passe une fois puis refuse tout le reste, et
elle existe pour tester l'échec de RENOUVELLEMENT d'un abonnement (la relance, l'impayé). Le studio
vend des packs à l'unité et l'abonnement Pro passe par RevenueCat, donc il n'y a aucun second
prélèvement à faire échouer. La doc Paddle ne dit pas si le refus vaut aussi pour un simple second
achat, donc au mieux elle testerait la même branche que la carte refusée, en moins reproductible.
Le vrai risque est de l'utiliser pour un test « qui doit marcher » : l'achat SUIVANT sera refusé
sans raison visible, et on ira chercher le bug dans `paddle-webhook` alors qu'il n'y en a pas.

## État PRODUCTION (2026-08-01)

Compte Paddle **AML Technologies** (live), produit `pro_01kyx6btf76rhabnm0y2fkems0` :

| Pack | Prix | `paddle_price_id` (production) |
|---|---|---|
| `taste` (5) | 0,99 € | `pri_01kyx6f9bz87wdmwb519ffyk3g` |
| `star` (20) | 2,99 € | `pri_01kyx6kqc17z6e203m431p65s3` |
| `pro` (50) | 5,99 € | `pri_01kyx6pmt88zfe897sqfg5skb9` |

Fait côté prod : migration 0033 poussée, `paddle_price_id` renseigné, `paddle-webhook` déployé en
`--no-verify-jwt`, `PADDLE_WEBHOOK_SECRET` posé, destination abonnée à **`transaction.completed` ET
`adjustment.created`**, libellé de relevé `MECHE`, client token « Meche studio web » créé.

Fumée sur le webhook prod : non signé → `401`, signé avec un prix étranger → `200 no_matching_pack`
(donc rien crédité, aucun compte touché).

### Bloqué, et dans cet ordre

1. **Le domaine `mecheapp.com` n'est PAS approuvé sur le compte production.** Volontairement pas
   soumis : Paddle exige que le site contienne « terms of service, privacy notice **and refund
   policy** », et la politique de remboursement qu'on vient d'écrire n'est pas encore en ligne.
   Soumettre avant le déploiement, c'est risquer un refus.
2. **Le « Default payment link » ne s'enregistre pas** tant que le domaine n'est pas approuvé. Le
   champ reste vide en prod, c'est normal.

Donc : **déployer le site d'abord**, puis soumettre le domaine, puis renseigner le payment link.

### Un remboursement se traite sur DEUX événements, pas un

**Vécu au premier vrai remboursement sandbox (2026-08-01).** Le webhook a bien reçu
`adjustment.created`, et a répondu `ignored: adjustment_status:pending_approval`. Les crédits ne
sont jamais repartis.

Un remboursement naît **`pending_approval`** et ne passe **`approved`** que plus tard — et ce
passage arrive en **`adjustment.updated`**, un autre événement. S'abonner au seul
`adjustment.created`, c'est voir chaque remboursement exactement une fois, dans le seul état où il
NE FAUT PAS agir, et ne plus jamais en entendre parler. L'infobulle de Paddle le dit elle-même :
« pending to approved or from pending to rejected ».

Corrigé : le webhook traite `adjustment.created` **et** `adjustment.updated`, et les deux
destinations (sandbox et prod) sont abonnées aux deux. C'est sans risque parce que la reprise est
idempotente sur `paddle_adj:<adjustment_id>` : le premier événement porteur d'`approved` fait le
travail, les suivants ne font rien.

**Le check** quand un remboursement ne reprend pas les crédits : lire le LOG DE LIVRAISON Paddle
(Notifications → destination → View logs) et regarder la réponse de notre endpoint, avant de
suspecter la signature ou la base. Il dit exactement pourquoi on a ignoré l'événement.

### Deux réglages de présentation

- **Brand Color du checkout** : `#15110E` (l'ink de `MPAL`), sandbox et prod. Le défaut Paddle est
  un vert vif qui n'a rien à voir avec la palette. **Le champ exige le `#`** : taper `15110E` seul
  est accepté par l'input mais n'applique rien, l'aperçu reste vert.
- **L'overlay ne se ferme pas tout seul** après un paiement réussi : Paddle ignore qu'on s'apprête à
  révéler le résultat dessous. `web/src/lib/paddle.ts` appelle donc `Checkout.close()` après
  l'attente, sinon le visiteur doit fermer un checkout déjà payé au moment précis où on veut son
  attention sur la photo.

### Piège d'automatisation, vérifié deux fois

Sur les cases à cocher des événements, un clic **par référence d'élément** ne fait rien du tout,
sans erreur. Il faut cliquer **par coordonnées** et **vérifier visuellement** que la case est cochée
avant d'enregistrer. C'est ce qui a fait croire que `adjustment.created` était activé en sandbox
alors qu'il ne l'était pas. La colonne « Events » de la liste des destinations donne le compte réel.

## Plan de déploiement

### Phase 0 — à lancer maintenant, en parallèle du code

- Ouvrir le compte Paddle et **démarrer la vérification** (délai externe).
- Prod : OTP à 6, et **les DEUX templates d'email en `{{ .Token }}`** sur les deux projets.
  `locked_first_try` reste à `'0'` pour l'instant : c'est le dernier interrupteur, en phase 3.
- Supabase (staging **et** prod) : ajouter `https://mecheapp.com/studio/` aux *Redirect URLs*, créer le
  client OAuth **Web** Google et le **Services ID** Apple (voir le piège Apple ci-dessous).

#### Une `redirect_to` non autorisée est REMPLACÉE, pas refusée

C'est le piège le plus coûteux du lot, parce qu'il ne produit aucune erreur là où on la cherche.
Si l'URL passée à `signInWithOAuth({ redirectTo })` n'est pas dans *Auth → URL Configuration →
Redirect URLs*, Supabase ne refuse pas : il lui **substitue la Site URL**. Ici la Site URL vaut
`meche://auth-callback` (le deep link de l'app mobile), donc le navigateur reçoit le code OAuth sur
un schéma qu'il ne sait pas ouvrir :

```
Failed to launch 'meche://auth-callback?error=invalid_request&error_code=flow_state_already_used'
because the scheme does not have a registered handler.
```

Le `flow_state_already_used` n'est qu'une conséquence du deuxième essai, pas la cause : chercher de
ce côté fait perdre du temps. **Le check** : `admin/generate_link` avec un `redirect_to` et regarder
ce qui revient dans le lien. S'il a changé, l'URL n'est pas dans la liste. Vérifié le 2026-08-01,
les deux URLs du studio revenaient en `meche://auth-callback`.

Il faut donc AJOUTER à la liste, sur les deux projets :
`https://mecheapp.com/studio/` et `http://localhost:5180/studio/`.

**Ne pas toucher à Site URL** : `meche://auth-callback` est ce qui fait revenir l'app mobile après un
OAuth. La remplacer par l'URL du studio réparerait le web en cassant les deux apps.

#### Apple sur le web : deux pièges qui donnent le même message

`invalid_request — Invalid client id or web redirect url` apparaît à l'étape d'AUTORISATION, donc
avant que le client secret ne serve : inutile de suspecter le JWT quand on voit cet écran.

1. **L'ordre de `Client IDs` compte.** Supabase envoie la **première** entrée comme `client_id` du
   flux web. Un bundle id en tête (`com.meche.app`) fait refuser Apple, qui attend un Services ID.
   Le bon ordre est donc `com.meche.web,com.meche.app`. Ça ne casse pas iOS : le flux natif accepte
   n'importe quel id de la liste, quel que soit l'ordre. Seul le web dépend de la position.
2. **Le domaine à déclarer est celui de SUPABASE, pas le nôtre.** La redirection OAuth va sur
   `<ref>.supabase.co`, jamais sur `mecheapp.com`. Donc dans le Services ID :
   *Domains and Subdomains* = `hqhnvjjbohzktoapsytj.supabase.co` (et l'équivalent staging), et
   *Return URLs* = `https://hqhnvjjbohzktoapsytj.supabase.co/auth/v1/callback`.

Et le champ **Secret Key (for OAuth)** n'est PAS le `.p8` : c'est un JWT signé avec, valable 6 mois
maximum, généré par `scripts/apple-client-secret.mjs`. Le bandeau « expire every 6 months » du
dashboard est ce qui tranche : un `.p8` n'expire jamais. À l'expiration, la connexion Apple **web**
casse seule pendant que l'app native continue de marcher.

### Phase 1 — le code qui manque

1. `supabase/functions/paddle-webhook` (contrat ci-dessus).
2. Checkout Paddle.js dans `web/` : `npm i @paddle/paddle-js`, deux variables
   `VITE_PADDLE_CLIENT_TOKEN` et `VITE_PADDLE_ENV` (`sandbox` | `production`), et le passage de
   `customData: { user_id }` + de l'email du compte à l'ouverture du checkout.
3. Migration `credit_packs` : **une seule colonne**, `paddle_price_id text`, sur les trois lignes
   existantes. Pas de colonne `channel`, pas de lignes web (voir la section prix).
4. ~~Le paywall lit `credit_packs` au lieu d'une constante codée en dur.~~ **Fait**
   (`web/src/lib/packs.ts`), vérifié contre staging.

### Phase 2 — tout valider sur staging, avec Paddle sandbox

Rien de ce qui suit ne touche la prod.

1. Déployer `paddle-webhook` sur **staging**, `supabase secrets set PADDLE_WEBHOOK_SECRET=...`.
2. Pousser la migration `credit_packs` sur **staging**.
3. Achat sandbox complet avec un **compte neuf** (sinon pas de teaser, voir le piège plus haut) :
   compte → teaser flouté → checkout → webhook → crédits → révélation → image nette.
4. Vérifier le grand livre : une ligne `purchase` avec `external_id = 'evt_...'`, puis une ligne
   `generation` avec `external_id = 'unlock:<genId>'`.
5. Rejouer la même notification depuis le dashboard Paddle : **aucun crédit supplémentaire**.

### Phase 3 — la prod

Les prix étant identiques à ceux de l'app, **il n'y a plus d'OTA préalable** : la migration
n'ajoute qu'une colonne nullable, aucun client installé ne voit de différence.

1. **Migration prod** : `alter table credit_packs add column if not exists paddle_price_id text`,
   puis renseigner les trois `pri_...` de l'environnement **production** de Paddle.
2. **Déployer `paddle-webhook` en prod** + `PADDLE_WEBHOOK_SECRET` (secret de production, pas celui
   du sandbox), avec `--no-verify-jwt`.
3. **Mettre à jour les pages légales** dans `web/site/` : renonciation explicite au droit de
   rétractation de 14 jours pour livraison numérique immédiate, et Paddle déclaré vendeur officiel
   et sous-traitant dans `privacy.html` (FR et EN). Elles partent dans le même déploiement que le
   studio, effet utile de la fusion en un seul service.
4. **Déployer le service Railway** avec les variables de production, puis pointer le domaine.
5. **En dernier, la bascule** : `locked_first_try` à `'1'` en prod. Avant ça, le studio est en ligne
   mais donne l'image nette : ne pas ouvrir les vannes de trafic tant que ce n'est pas fait.

### Phase 4 — go-live

- Un **vrai achat à 2,99 €** avec un compte neuf, carte réelle. Vérifier le crédit et la révélation.
- Vérifier la facture Paddle (TVA appliquée selon le pays).
- Se rembourser depuis Paddle, et **noter que le remboursement ne retire pas les crédits** : rien
  n'écoute `transaction.refunded` aujourd'hui. À décider séparément (l'IAP a le même trou).
- Surveiller les logs de `paddle-webhook` sur les premières transactions.

## La branche est en retard sur `main`

**Ce worktree part d'`origin/main`, pas de `main`.** Neuf commits locaux manquent, dont trois qui
touchent directement le tunnel web :

- **0030** (`fix(generate): le credit se reserve juste avant l'appel Gemini`) — le crédit n'est plus
  réservé en tête de fonction mais dans la tâche de fond. Nouvelle forme d'échec : `status='failed'`
  avec `error='no_credits'`, au lieu d'un 402.
- **0031** — un cron fauche en `failed` toute génération `pending` de plus de 10 minutes.
- `validate.ts` : le plafond est passé de 12 Mo à **7 Mo**.

Le client web a été adapté à ce comportement **sans fusionner** (voir `web/README.md`, section sur
les trois échecs). **À faire avant de committer : rebaser cette branche sur `main`.** Le seul
fichier en conflit potentiel est `CLAUDE.md`, modifié des deux côtés.

**Le check, pour la prochaine fois** : `git log --oneline HEAD..main` avant de commencer, pas
`HEAD..origin/main`. Les fonctions edge se déploient séparément du dépôt, donc le comportement en
ligne peut être en avance sur ce qu'on lit dans son worktree.

## Remboursements : les crédits repartent avec l'argent (fait)

`adjustment.created` est traité dans `paddle-webhook`. Sans ça, un acheteur remboursé gardait ses
crédits : perte sèche, et boucle d'abus évidente (acheter, révéler, se faire rembourser, recommencer).

**Le piège central, et la raison d'être du code tel qu'il est écrit.** La ligne de reprise DOIT
porter `reason = 'purchase'` avec un delta **négatif**. Une reason neuve comme `'refund'` serait
**invisible pour `generate`** : sa boucle fait

```
if (reason === 'purchase' || reason === 'admin_grant') paid += delta;
else if (reason === 'generation') { ... }
else if (delta > 0) free += delta;      // un delta négatif tombe ici et n'est jamais compté
```

alors que `my_credit_balance` est un simple `sum(delta)` et le verrait. **Les deux lecteurs
divergeraient**, et un utilisateur remboursé continuerait à générer. C'est exactement le motif
signalé dans `security-model.md` à propos du débit de `unlock`.

Autres décisions, toutes vérifiées contre staging :

- **Clé de la subvention = l'id de TRANSACTION** (`paddle_txn:<txn>`), pas l'`event_id`. Un
  remboursement arrive en `adjustment.created` et référence la transaction ; en gardant l'event id
  on n'aurait aucun moyen de retrouver ce qu'il faut reprendre. `transaction.completed` ne part
  qu'une fois par transaction, donc la déduplication reste aussi forte.
- Reprise idempotente sur `paddle_adj:<adjustment_id>`.
- On ne reprend que sur `status = 'approved'` : sur `pending_approval` le remboursement peut encore
  être refusé.
- `action` `refund` et `chargeback` reprennent ; `credit` (avoir sur facture future) non.
- **Le solde a le droit de passer négatif** : quelqu'un qui a déjà dépensé ses crédits puis s'est
  fait rembourser tombe sous zéro, et `generate` bloque sur `balance <= 0`. C'est voulu.
- **Un remboursement partiel reprend tout le lot.** Un crédit ne se livre pas à moitié.

| Cas testé | Réponse |
|---|---|
| Achat | `granted: true, credits: 20` |
| Remboursement `pending_approval` | `ignored: adjustment_status:pending_approval` |
| Ajustement `credit` | `ignored: adjustment:credit` |
| Remboursement d'une transaction inconnue | `skipped: no_matching_grant` |
| Remboursement **approuvé** | `revoked: true, credits: -20` |
| Même remboursement rejoué | `revoked: false` |

Après coup, le pool payant vu par `generate` retombe à **0** et la somme brute concorde : les deux
lecteurs sont d'accord.

**Reste à faire côté Paddle** : cocher `adjustment.created` dans la destination (sandbox ET prod).
Sans l'abonnement, Paddle n'envoie jamais l'événement et le code ci-dessus ne sert à rien.

## Le mot de passe manquant : réglé (connexion par code dans l'app)

**Fait.** L'app accepte désormais la connexion par code email, comme le web. Livrable en **OTA**,
aucune brique native.

- `packages/api-client/src/auth.ts` : `signInWithEmailCode()` et `verifySignInOtp()`.
- `apps/meche/app/(auth)/code.tsx` : écran de saisie du code, calqué sur `confirm.tsx`
  (auto-vérification au 6e chiffre, renvoi avec 60 s de délai).
- `apps/meche/app/(auth)/signin.tsx` : lien « Me connecter avec un code », à côté de « Mot de passe
  oublié ».
- Chaînes FR/EN dans `packages/core/src/i18n/dictionary.ts`.

`cd apps/meche && npx tsc --noEmit` : propre.

### Deux invariants à ne pas casser

1. **`shouldCreateUser: false`.** Au défaut (`true`), une faute de frappe dans l'email **créerait un
   compte** : `handle_new_user` se déclenche, un crédit de bienvenue part, et la personne attend un
   code envoyé à une adresse qui n'est pas la sienne. L'inscription doit rester le chemin explicite
   de `signup.tsx`.
2. **On ne distingue jamais succès et échec de l'envoi.** Une erreur « utilisateur inconnu »
   révélerait qu'une adresse a un compte. `signin.tsx` route vers l'écran de code quoi qu'il arrive,
   et l'aide sur cet écran dit honnêtement que rien n'arrivera si le compte n'existe pas. Même
   posture que `resetPassword`, qui renvoie toujours un succès.

### Dépendance à vérifier avant l'OTA prod

`signInWithOtp` sur une adresse **existante** envoie le template **« Magic Link »**, pas « Confirm
signup ». S'il n'est pas en `{{ .Token }}` sur le projet prod, la fonctionnalité enverra des liens
inutilisables au lieu de codes, silencieusement. Voir la section templates plus haut.

### Ce que ça règle au-delà du web

Le mot de passe oublié, cas bien plus fréquent que le visiteur web qui installe l'app : plus besoin
de « réinitialiser » un mot de passe pour se connecter.

## Ce qui avait été proposé (pour mémoire)

**Le problème.** Un visiteur web s'inscrit avec un code email, sans mot de passe. L'app, elle, se
connecte en `signInWithPassword` (`apps/meche/app/(auth)/signin.tsx`). Il ne peut donc pas entrer
dans l'app avec le compte qu'il vient de payer. Google et Apple passent, eux, via
`signInWithIdToken`.

**Proposé : ajouter la connexion par code email à l'app.** C'est le même mécanisme que le web, et
l'app sait déjà saisir un code à 6 chiffres (`confirm.tsx`, `reset.tsx`).

- Sur `signin.tsx`, sous le champ mot de passe : « Recevoir un code par email ».
- `signInWithOtp({ email, options: { shouldCreateUser: **false** } })`. Le `false` est important :
  l'inscription doit rester le chemin explicite de `signup.tsx`, sinon une faute de frappe dans
  l'email crée un compte vide et consomme un crédit de bienvenue.
- Puis l'écran de code existant, et `verifyOtp({ type: 'email' })` avec le repli sur `'signup'`,
  comme `web/src/lib/auth.ts`.
- Livrable en **OTA**, aucune brique native.

Pourquoi celle-là plutôt que les autres :

- **Faire choisir un mot de passe au visiteur web après l'achat** : ajoute une friction juste après
  le paiement, au pire moment, et pour un compte qu'il n'utilisera peut-être jamais dans l'app.
- **Lien profond web → app avec un jeton** : plus de code, plus de surface, et ne règle pas le cas
  de quelqu'un qui installe l'app trois semaines plus tard.
- **Garder « Mot de passe oublié »** (l'état actuel) : ça marche, mais demander de réinitialiser un
  mot de passe qu'on n'a jamais eu est incompréhensible, et c'est la première impression de l'app
  pour quelqu'un qui vient de payer.

Bénéfice au-delà du web : ça règle aussi le cas, bien plus fréquent, de l'utilisateur d'app qui a
oublié son mot de passe. Le template « Magic Link » est déjà passé à `{{ .Token }}` pour le web,
donc l'infrastructure est en place.

## Ce qui n'est pas couvert, et qu'il faudra trancher

- **Remboursements et litiges** : aucun `transaction.refunded` traité, donc un remboursement laisse
  les crédits. Acceptable au lancement (volume nul), à reprendre ensuite.
- **Le mot de passe manquant** : un visiteur web inscrit par code email ne peut pas se connecter à
  l'app, qui exige un mot de passe. Contourné par « Mot de passe oublié », mais le vrai correctif est
  un chemin sans mot de passe côté app. Voir `web/README.md`.
