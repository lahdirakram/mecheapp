# mecheapp.com — le site public

Un seul dossier, un seul service Railway :

- `site/` — landing marketing + pages légales bilingues (l'ancien `legal/`, déplacé ici)
- `src/` — **le studio payant**, servi sur `/studio`
- `server.js` — sert les deux, sans dépendance

Le studio est le tunnel d'essai **payant** pour les visiteurs qui n'installeront pas l'app : portrait,
look, essai flouté, paiement, révélation. **Aucun résultat net sans paiement.**
Plan produit et décisions : [`../docs/web-studio.md`](../docs/web-studio.md).

## Démarrer

```bash
cp web/.env.example web/.env.local   # puis coller la clé anon (staging par défaut)
cd web && npm install
npm run dev                          # studio seul, HMR   -> http://localhost:5180/studio/
npm run build && npm start           # tout le site, comme en prod -> http://localhost:3000/
```

`npm run dev` ne sert QUE le studio : Vite ne connaît pas `site/`. Pour voir la landing et les pages
légales, il faut passer par `npm start`. Les deux entrées existent dans `.claude/launch.json`
(`studio` et `meche-site`).

Sans `.env.local`, la page affiche une erreur explicite au lieu d'un écran blanc (`src/lib/config.ts`
lève, `main.tsx` rend le message).

## Pourquoi hors du workspace pnpm

Comme `backoffice/`. `pnpm-workspace.yaml` ne couvre que `apps/*` et `packages/*`, donc
ce dossier a son propre `node_modules` et son propre lockfile **npm**. Le `.npmrc` racine force
`node-linker=hoisted` pour Metro ; une app navigateur n'a rien à faire dans cet arbre plat.

Conséquence : **pas d'import `@meche/*` possible ici.** Ce qui est partagé est recopié
volontairement, et les endroits où la copie DIVERGE sont commentés (voir `src/lib/supabase.ts`).

TypeScript est local (`^6`, aligné sur `apps/meche`). Comme dans `backoffice/`, utiliser
`./node_modules/.bin/tsc` plutôt que `npx tsc`, qui remonterait sur le TypeScript de la racine.

## Ce qui est branché, et ce qui ne l'est pas

| | État |
|---|---|
| Upload + redimensionnement navigateur (1600px) | fait |
| Choix du look (feed publié) + description libre | fait |
| Compte par code email à 6 chiffres | fait |
| Google + Apple (redirection OAuth, photo conservée) | fait, à configurer côté dashboards |
| `generate` avec `supportsLocked: true`, polling, aperçu flouté | fait |
| Révélation via `unlock` | fait |
| Paiement Paddle (webhook + checkout) | écrit, **configuré et testé en sandbox** |

## Paiement : l'ordre est la sécurité

`payAndReveal` dans `App.tsx` fait, dans cet ordre : **checkout Paddle → attendre que le grand livre
bouge → `unlock`**. Jamais autrement.

L'événement `checkout.completed` du navigateur dit que la personne a fini de payer, **pas** que les
crédits existent : seul `paddle-webhook` les crée, par un appel serveur-à-serveur qui peut arriver
une seconde plus tard. Révéler sur l'événement client, ce serait révéler avant que l'octroi soit
réel. D'où `waitForCredits()`, qui sonde le solde et laisse le serveur faire foi.

**Paddle est optionnel** (`PADDLE_READY`). Sans `VITE_PADDLE_CLIENT_TOKEN`, le paywall appelle
`unlock` directement, ce qui ne réussit que si le compte a déjà un crédit : c'est le mode de test
staging. Ce n'est pas une faille — `unlock` débite côté serveur quoi que fasse le client — et c'est
vérifié : sans Paddle et sans crédit, le bouton répond « Le paiement n'est pas encore disponible
ici », l'aperçu reste verrouillé.

## Comment la photo survit à Google / Apple

La redirection OAuth **recharge la page**, donc tout ce qui est dans React meurt, y compris le selfie
préparé. Sans filet, le visiteur revient connecté et on lui redemande sa photo : c'est là qu'il part.

`src/lib/draft.ts` écrit le JPEG déjà préparé dans **IndexedDB** juste avant de céder la main au
fournisseur, et `App.tsx` le relit au chargement. Si la session est ouverte et que le look a survécu,
la génération repart toute seule, sans repasser par « Continuer ».

Pourquoi pas sessionStorage : le Web Storage ne stocke que des chaînes, donc il faudrait du base64
(un tiers de plus) stocké en UTF-16 (le double en octets) contre un quota souvent limité à ~5 Mo.
Un JPEG 1600px fait 400 Ko à 1 Mo. IndexedDB prend le Blob tel quel.

Effet de bord utile : un rechargement d'onglet en cours de tunnel ne perd plus la photo non plus.

**Confidentialité.** C'est une photo de visage sur le disque du visiteur. Elle n'est écrite qu'au
moment de quitter la page, effacée **dès que le serveur a l'image** (`clearDraft()` juste après
l'enqueue, pas à la fin du tunnel), et jetée à la lecture au-delà d'une heure.

## À configurer dans les dashboards

Le code est prêt, les réglages ne le sont pas. Tout ce qui suit vit hors du repo, par projet.

### Templates d'email (sinon : lien inutilisable au lieu d'un code)

`signInWithOtp` envoie **deux templates différents** selon l'adresse :

| Adresse | Template envoyé |
|---|---|
| nouvelle | **Confirm signup** |
| déjà connue | **Magic Link** |

Les apps n'utilisent que `signUp`, donc seul « Confirm signup » avait été passé à `{{ .Token }}`.
« Magic Link » était resté au défaut Supabase, à base de `{{ .ConfirmationURL }}` : un visiteur web
ayant déjà un compte recevait un lien, qui en plus pointe vers le Site URL du projet et pas vers
`/studio/`.

**Les deux templates doivent être en `{{ .Token }}`, sur staging ET sur prod.**
Authentication → Email Templates.

`verifyCode()` tente `type: 'email'` puis retombe sur `'signup'`, parce que les deux chemins
produisent des jetons de types différents. Ne pas simplifier : voir l'historique OTP dans
`CLAUDE.md`.

### Google et Apple

- **Supabase → Authentication → URL Configuration** : ajouter `https://mecheapp.com/studio/` aux
  *Redirect URLs*. Sans ça le retour est refusé. Vaut pour staging ET prod.
- **Google** : un client OAuth **Web** (celui des apps est iOS/Android), avec l'URI de redirection
  Supabase `https://<ref>.supabase.co/auth/v1/callback`.
- **Apple** : un **Services ID** (distinct du bundle id de l'app), la clé privée Sign in with Apple,
  et le même callback Supabase. Apple exige du HTTPS, donc **le bouton Apple ne peut pas être testé
  sur `localhost`** ; Google, si.

## Il n'y a AUCUNE notification de fin sur le web

`generate` ne prévient que par **push Expo**, vers les lignes de la table `devices`. Un navigateur n'a
pas d'appareil enregistré, donc `notifyUser` sort immédiatement et **rien n'est envoyé**. Pas d'email,
pas de push, rien.

Conséquence directe, et c'est une règle de rédaction : **ne jamais écrire dans l'interface qu'un email
va arriver.** Une première version le promettait, c'était faux.

Ce qui rend malgré tout « tu peux fermer l'onglet » vrai, c'est la **reprise automatique** dans
`App.tsx` : au chargement, si une session existe, `resumableGeneration()` récupère le dernier essai
encore en cours ou terminé mais verrouillé, et remet le tunnel dessus. Revenir sur la page EST le
canal de retour.

Pour promettre un vrai email il faudrait l'envoyer depuis `generate` (Resend, la clé existe déjà côté
backoffice), en best effort à côté de `notifyUser`, avec un lien `/studio/?g=<generationId>`.
Tant que ce n'est pas fait, la copie doit rester honnête.

## Passerelle vers l'app, et le trou de connexion

L'écran de résultat propose de télécharger l'app, **uniquement après la révélation** : envoyer
quelqu'un vers un store avant qu'il ait payé, c'est le perdre. Ça marche parce que les deux surfaces
tapent sur le même projet Supabase, donc crédits et historique sont déjà sur le compte.

**Le trou :** l'app se connecte en **email + mot de passe** (`signInWithPassword`), et un visiteur web
passé par le code email n'en a jamais défini. Google et Apple, eux, passent sans friction
(l'app utilise `signInWithIdToken`). La copie le dit honnêtement : « choisis Mot de passe oublié à la
première connexion ». **Le vrai correctif est d'ajouter un chemin sans mot de passe à l'app**, pas de
mieux tourner la phrase.

Android : l'app est publiée sur Google Play depuis 2026-08-07, `PLAY_URL` pointe sur la fiche
(`com.meche.app`) et le bloc s'affiche aussi pour un visiteur Android.

## Les trois façons dont un essai peut échouer (0030 / 0031)

Le client doit distinguer les trois, sinon il ment. `failureMessage()` dans `lib/tryon.ts` fait la
correspondance ; ne pas la remplacer par un message unique.

| Cas | Ce que le serveur écrit | Ce qu'on dit |
|---|---|---|
| Solde vide, détecté tout de suite | HTTP **402** `no_credits` | il faut des crédits |
| Solde vide, détecté à la réservation | `status='failed'`, `error='no_credits'` | il faut des crédits |
| Worker mort en cours de route | `status='failed'`, `error='reaped: …'` | crédit rendu, recommence |

Le deuxième cas vient de **0030** : le crédit n'est plus réservé en tête de `generate` mais dans la
tâche de fond, juste avant l'appel Gemini payant. Une course peut donc passer la vérification
synchrone de solde et échouer ensuite. Dire « ton crédit a été conservé » dans ce cas serait faux :
il n'y avait pas de crédit.

Le troisième vient de **0031** : un cron passe en `failed` toute ligne restée `pending` plus de
**10 minutes**. Conséquence directe sur la reprise : une ligne `pending` ne peut pas être plus
vieille que ça, d'où la fenêtre de 15 min dans `resumableGeneration` (une fenêtre de 24 h ne ferait
que sonder une ligne sur le point d'être déclarée morte). Et une génération fauchée est reprise
**uniquement pour l'expliquer** : disparaître en silence au retour, c'est exactement le reproche
fait à la promesse d'email.

## Invariants à ne pas casser

- **`supportsLocked: true` dans `startTryOn`.** C'est ce qui fait livrer un aperçu flouté au lieu de
  l'image nette. L'enlever, c'est donner le produit.
- **Le code email fait 6 chiffres, point.** Voir le commentaire dans `src/lib/auth.ts` : la longueur
  vit dans le dashboard Supabase, elle a déjà causé une panne prod, et l'auto-vérification au dernier
  chiffre en dépend.
- **Rien de secret dans `VITE_*`.** Vite inline ces valeurs dans le bundle, donc lisibles par tout le
  monde. L'anon key est faite pour ça, la service key ne doit jamais approcher ce dossier.
- **`fetchLooks` filtre sur `status = 'published'`.** La curation du backoffice n'est pas décorative :
  un select sans filtre remonterait des brouillons IA non relus.

## Déploiement Railway

**Un seul service**, dont le Root Directory est `web`. Il sert la landing, les pages légales et le
studio depuis la même origine.

```
visiteur ──► Cloudflare ──► service "meche-site"  (Root Directory: web)
                                 ├── /               site/index.html      (landing FR)
                                 ├── /en             site/en/index.html   (landing EN)
                                 ├── /fr             301 -> /
                                 ├── /privacy /terms  site/{fr,en}/*.html  (langue detectee)
                                 ├── /looks/*.jpg     site/looks/
                                 └── /studio/*        dist/  (build Vite)
```

**La landing est bilingue et dupliquée à la main** : `site/index.html` (FR) et `site/en/index.html`
(EN) sont deux copies du même HTML, à modifier ENSEMBLE. Le style est partagé dans
`site/landing.css` pour que la mise en page, elle, ne puisse pas diverger. `/fr` redirige vers `/`
(une seule URL canonique par langue) ; l'ancien hub légal qui vivait sur `/fr` et `/en` a disparu,
ses liens sont dans le footer de chaque page.

**La langue sur `/` est détectée sans sacrifier le SEO** (détail dans l'en-tête de `server.js`) :
`?lang` → cookie `lang` → `Accept-Language` → fr. Un anglophone sur `/` part en **302** (jamais
301) vers `/en` ; un crawler, sans cookie ni Accept-Language, voit toujours le français stable sur
`/` et suit les `hreflang`. Le cookie n'est posé que sur un choix EXPLICITE (visiter `/en`, `/fr`,
ou un `?lang=`), et il l'emporte sur `Accept-Language`, sinon le bouton FR de `/en` rebondirait.
C'est pour ça que ce bouton pointe sur `/?lang=fr`, pas sur `/`.

**Le studio est bilingue aussi** : tout le texte vit dans `src/lib/i18n.ts` (dictionnaire FR/EN,
détection `?lang` → localStorage → cookie → `navigator.language`), les landings passent
`/studio?lang=xx`, et le bouton FR/EN du header bascule à chaud. Le choix survit au redirect OAuth
via localStorage. Ne JAMAIS remettre une chaîne en dur dans `src/` : elle sortirait en français
pour tout le monde.

### Creer le service

| Reglage | Valeur |
|---|---|
| Root Directory | `web` |
| Build / Start | lus dans `web/railway.json` (`npm run build`, puis `node server.js`) |
| Healthcheck | `/healthz` |
| Variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Domaine | le domaine public du site |

Le reste (install `npm ci`, version de Node) vient de `package.json` : `engines.node` est pinne sur
`22.x`, et Nixpacks le respecte. Ne pas le remettre en `>=20`, la resolution devient imprevisible.

`watchPatterns` limite les rebuilds aux changements dans `web/**` : un commit qui ne touche que les
apps Expo ne redeploie pas le site.

### Les variables sont des variables de BUILD

Vite inline `VITE_*` dans le bundle. Les changer impose un **redeploiement**, pas un restart.

Un build sans elles ne produit pas une erreur naturelle : il reussit et livre un bundle incapable de
joindre Supabase, pendant que Railway affiche un deploiement vert. `vite.config.ts` refuse donc de
construire quand elles manquent, avec un message qui dit quoi definir.

### Verifier un build Railway EN LOCAL, pour de vrai

`npm run build` depuis le monorepo **ne prouve rien** sur Railway. TypeScript remonte l'arborescence
pour resoudre `node_modules/@types`, donc un fichier peut compiler ici grace au `@types/node` de la
racine du monorepo, et echouer sur Railway ou le Root Directory EST ce dossier : il n'y a pas de
parent. Vecu le 2026-08-01 : `process.cwd()` dans `vite.config.ts`, vert en local, `TS2591 Cannot
find name 'process'` sur Railway.

**Le check**, qui reproduit exactement ce que Railway fait :

```bash
T=$(mktemp -d)
rsync -a --exclude node_modules --exclude dist --exclude .env.local web/ "$T"/
cd "$T" && npm ci && VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build
```

Pas de parent, pas de `.env.local`, `npm ci` sur le lockfile. Si ca passe la, ca passe sur Railway.

### Les deux pieges

1. **`base: '/studio/'` dans `vite.config.ts` et le prefixe accepte par `server.js` doivent rester
   d'accord.** S'ils divergent : page blanche et 404 sur `/assets/*`, ce qui ressemble a un build
   casse alors que c'est juste un chemin.
2. **Un build studio casse bloque le deploiement des pages legales.** C'est le prix du service
   unique. Pour un correctif urgent de politique de confidentialite, deployer en retirant l'etape de
   build, puis la remettre.

### Pourquoi pas deux services

Un proxy `/studio/*` entre deux services a ete implemente puis retire : il marchait, mais ajoutait un
saut reseau et empechait le partage direct du pied de page et des assets. Une regle Cloudflare, elle,
n'est pas possible : router un chemin vers une autre origine demande une reecriture de hostname,
reservee a l'offre **Enterprise**.

### Tester en local, exactement comme en prod

```bash
cd web && npm run build && PORT=8200 node server.js
open http://localhost:8200/          # landing
open http://localhost:8200/studio/   # studio
```

Verifie en local : landing, `/privacy`, `/terms`, `/fr/*`, `/en/*` et la detection de langue OK ;
`/studio/` et ses assets servis avec un cache immutable ; fallback SPA sur une route profonde ;
asset manquant en 404 ; traversal bloque.

Pour iterer sur le studio, `npm run dev` reste plus rapide (HMR), a `http://localhost:5180/studio/`.
