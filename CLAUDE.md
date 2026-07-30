# Mèche — monorepo guide

Two-sided coiffure (hair) marketplace. AI hair try-on for clients (B2C) + a stylist side (Pro).
Stack: Expo / React Native, Supabase (Postgres + Auth + Storage + Edge Functions), RevenueCat (IAP),
Gemini (image generation + suggestions). pnpm + turbo workspace.

## Keep this file alive — every session
**Before finishing a session, update this file (and `docs/`) with what you learned.** This context is
the only thing the next session starts from; if a discovery stays in a chat transcript, it is lost.

Record:
- **gotchas that cost time** — the wrong assumption, and what the right check is. State the *check*,
  not just the conclusion (e.g. "white screen → `nslookup` the Supabase host first").
- **decisions and their WHY**, especially when the obvious option was rejected. The reasoning is what
  stops someone undoing it in six months.
- **invariants** someone could break without noticing — security, legal, quota, cost.

Do NOT record: a changelog (git has it), routine work, or anything readable from the code. Keep this
file short and put detail in `docs/` behind a one-line pointer, as the sections below do.

Say whether something was **verified** or only **deduced** — a deduction written as fact is how a
wrong belief survives across sessions.

## Layout
- `apps/meche` — **B2C app** (clients). Main app; most work happens here.
- `apps/meche-pro` — Pro/stylist app.
- `packages/ui` — shared components (`MText`, `MIcon`, `MPAL` palette, `useSheet`/`useToast`, `TabBar`…).
- `packages/api-client` — Supabase client, auth, React Query hooks (`queries.ts`).
- `packages/core` — theme/palette, fonts, i18n, shared types.
- `supabase/` — `migrations/` (schema, the source of truth — never hand-edit schema in a dashboard),
  `functions/` (`generate`, `suggest`, `iap-webhook`, `delete-account`), `seed.sql`.
- `backoffice/` — **local admin dashboard**, read-only *except* the feed curation screen (`/feed`,
  publish/refuse the AI drafts). `./backoffice/start.sh`. Deliberately OUTSIDE the pnpm workspace
  (`.npmrc` forces `node-linker=hoisted`; a web app under `apps/` would share the flat tree with the
  Expo apps). Own `node_modules`, own npm lockfile. Detail: `backoffice/README.md`.
- `web/` — **tout le site public**, un seul service Railway (zero-dep Node + Vite/React) :
  `site/` = landing + pages légales (l'ancien `legal/`, déplacé), `src/` = le **studio payant** servi
  sur `/studio`. Le studio est le tunnel *premier essai verrouillé* de l'app rejoué dans le
  navigateur, avec Paddle à la place de RevenueCat. Hors workspace comme `backoffice/`, donc **aucun
  import `@meche/*`** : `web/src/lib/supabase.ts` est une copie qui DIVERGE volontairement
  (`detectSessionInUrl` doit être `true` sur le web). Paiement Paddle écrit et testé en sandbox.
  Détail : `docs/web-studio.md` + `web/README.md`.

## Working rules
- **Node 22 for all `eas`/`expo`/`supabase` commands**: `source ~/.nvm/nvm.sh && nvm use 22`. Default
  Node 18 crashes Metro.
- **The user ships JS changes by OTA, not local Metro.** Use `./scripts/ota-staging.sh "msg"` then
  `./scripts/ota-prod.sh "msg"`. Don't start `expo start` unless asked.
- **One OTA lane per app, and they are NOT interchangeable.** `meche` and `meche-pro` are two
  separate EAS projects; `_ota.sh` takes the app as its first argument (`ota-staging.sh` /
  `ota-prod.sh` = B2C, `ota-pro-staging.sh` / `ota-pro-prod.sh` = Pro). Until 2026-07-30 `_ota.sh`
  hardcoded `apps/meche`, so "run the OTA script" on a Pro change silently shipped the B2C app and
  none of the Pro work. **The check** before believing an OTA carried your change: the script's
  `→ OTA: app=…` line, and `Runtime version` in the output (B2C is on 1.0.1, Pro on 1.0.0).
- **Never `git commit`/`push` until the user explicitly says so.** Branch off `main` if needed.
- **No em dash in user-facing copy** (FR/EN strings). Use a period or comma.
- **Cap paid AI calls** — retries/fan-out on the Gemini image model must stay tightly bounded (budget).
  A refusal (`gemini: blocked …`) is NOT retried: paying a second call for a policy block is waste.
- After edits, `cd apps/meche && npx tsc --noEmit` to typecheck before shipping. In `backoffice/`, use
  `./node_modules/.bin/tsc` — `npx tsc` picks up the root workspace's TypeScript 6, not the local 5.9.
- **Client write access to the DB is deliberately minimal.** Read `docs/security-model.md` before
  touching any policy, grant, or `functions/generate`. The rule: never let the client write a value
  the server later reads back with `service_role`.
- **The backoffice writes from ONE file, `backoffice/src/lib/writes.ts`**, always through PostgREST
  (never the Postgres pool, so `lib/db.ts`'s `begin read only` stays literally true). Exactly two
  writes: `feed_items.status` (curation) and the `admin_grant_credits` RPC (credits). Its
  `service_role` client is typed with a `Database` declaring only `feed_items` and that one
  function, so a write to any other table doesn't compile — `credit_transactions` is deliberately
  absent, the ledger is only ever touched via the RPC. A third write goes through that file or not
  at all. The curation screen is `/feed`: `gen-feed.mjs` drafts are invisible to the app until
  published there. **Refusing archives, it doesn't delete** — gen-feed de-duplicates combos across
  ALL statuses, so erasing a refusal makes it regenerate, and that's a paid Gemini call.
- **An admin-granted credit is a PURCHASED credit, and that is a three-file invariant** (0029). The
  reason is `admin_grant`, and it counts on the *paid* side of the free/paid ledger replay in BOTH
  `functions/generate` (decides `locked`) and `packages/api-client/src/queries.ts` (decides the
  pre/post-purchase experience). Teach one and not the other and the app promises credits the
  server won't honour, or the reverse. Why not just reuse `'purchase'`: the backoffice reads
  revenue, payers and average basket straight off `reason='purchase'` × catalogue price, and
  `claim_pro_role()` (0020) uses "has a purchase" as its fresh-account test — a free grant would
  have invented revenue out of nothing.
- **Deploy order when a migration and an OTA go together**: OTA first, then migration. New JS calling
  a missing RPC is a window YOU close in minutes; a migration that breaks old clients lasts until
  every user updates. Then push the migration immediately — don't leave the gap open.
- **`db push` suit le NUMÉRO de migration, pas le nom de fichier — et un worktree part d'un `main`
  figé.** Un worktree créé avant un merge ne voit pas les migrations arrivées depuis : on écrit un
  `0029_x.sql` alors qu'un `0029_y.sql` est DÉJÀ appliqué sur les deux lanes. `db push` considère
  alors 0029 comme fait et **saute silencieusement** le fichier, sans erreur ni avertissement. Si la
  fonction edge déployée juste après appelle une RPC de cette migration fantôme, chaque appel part
  en 500. **Le check** avant tout `db push` depuis un worktree : `supabase migration list --linked`,
  et comparer local/remote ligne à ligne. Un numéro présent des deux côtés avec un nom différent =
  collision, il faut renuméroter. Vécu le 2026-07-30 : `0029_admin_credit_grants` arrivé par `main`
  pendant qu'un worktree préparait son propre 0029.
- **Une migration edge se déploie AVANT sa fonction** (l'inverse de la règle OTA juste au-dessus) :
  la nouvelle fonction appelle la nouvelle RPC. Ajouter la RPC en SURCHARGE plutôt qu'en
  remplacement (ex. 0030) rend la fenêtre inoffensive — les deux signatures coexistent, l'ancienne
  fonction déployée continue de tourner pendant le déploiement.
- **`app.json` `version` is the OTA compatibility key** (`runtimeVersion.policy = "appVersion"`). If it
  drifts from the installed binary, updates silently never arrive. B2C `1.0.2`, Pro `1.0.1` (les deux
  bumpés en même temps que l'ajout d'`expo-image-manipulator`, voir ci-dessous) ; ou passer à
  `policy: "fingerprint"` à une sortie store (les deux lanes d'un coup).
- **Ajouter un module NATIF oblige à bumper `version`, sinon le prochain OTA fait crasher tout le
  parc.** Avec `policy: "appVersion"`, un OTA garde la même runtimeVersion et atterrit donc sur les
  binaires DÉJÀ installés, qui n'ont pas le code natif. Un `import` de ce module échoue au
  chargement du module, AVANT tout `try/catch` : aucun repli applicatif ne peut rattraper ça, l'écran
  crashe. Le bump est la seule protection, et il agit comme une barrière : les anciens binaires ne
  reçoivent plus ce JS et attendent la mise à jour store. **Le check** avant d'ajouter une dépendance :
  a-t-elle un dossier `ios/`/`android/` ou un `expo-module.config.json` ? Si oui, c'est natif, donc
  build store obligatoire et bump de `version`. Vaut particulièrement pour Pro, dont le canal
  `production` est ce que fait tourner un reviewer Apple : un crash là = un refus.
- **La longueur du code OTP email vit dans le dashboard, pas dans le repo — et elle est figée à 6
  côté app.** Les 4 écrans de saisie (`confirm` + `reset`, meche et meche-pro) coupent à 6 chiffres
  et auto-vérifient dès le 6e ; `supabase/config.toml` (`otp_length = 6`) ne vaut QUE pour le
  Supabase local. Chaque projet cloud a son propre réglage (Auth → Email OTP length), versionné
  nulle part. **Les deux projets doivent rester sur 6** ; ne pas rendre l'app tolérante à une
  longueur variable, ça détruit l'auto-vérification (on ne sait plus quand la saisie est finie, il
  faut temporiser). Panne prod du 2026-07-29 : projet passé à 8, code tronqué à 6, `verifyOtp`
  répond "invalide", et TOUS les nouveaux comptes restent en attente de vérification pendant que
  Resend affiche "delivered". **Le check** quand une inscription bloque avec un email pourtant
  livré : compter les chiffres du code reçu AVANT de suspecter le code applicatif.
  **Pourquoi ça a tenu cinq semaines** : staging était resté à 6, seule la prod était à 8. Tous les
  tests device passaient donc, puisque le build `preview` tape sur staging. Un test vert sur staging
  ne prouve RIEN sur la prod dès que le comportement dépend d'un réglage de dashboard : ces
  réglages-là se comparent entre les deux projets, ils ne se testent pas. Même panne
  possible, plus silencieuse, sur le mot de passe oublié (`type: 'recovery'`).
  **Corollaire vérifié** : refaire l'inscription avec la même adresse (le geste naturel quand on
  n'a pas reçu son code, et le seul possible puisque `signin` n'offre aucun renvoi) renvoie bien un
  code, mais NE remplace PAS le mot de passe, le tout premier reste actif. `confirm.tsx` repose
  donc celui qui vient d'être saisi juste après `verifyOtp`, et avale le 422 `same_password` qui
  signifie seulement "c'était déjà le bon". Ne pas "nettoyer" ce catch.
  **Même famille, vérifié le 2026-07-30 : le TEMPLATE d'email aussi vit dans le dashboard, et il y
  en a plusieurs.** `signInWithOtp` (utilisé par `web/` ET, depuis la connexion par code, par
  `apps/meche`) envoie **"Confirm signup"** si l'adresse est neuve, mais **"Magic Link"** si elle existe déjà. Seul "Confirm signup"
  avait été passé à `{{ .Token }}` : un compte existant recevait donc un LIEN inutilisable au lieu
  d'un code. **Le check** quand un email arrive mais ne contient pas de code : regarder QUEL
  template a été envoyé avant de suspecter le client. Les deux doivent être en `{{ .Token }}`, sur
  les deux projets. **Et une modification de template met plusieurs minutes à se propager** : après
  l'édition, les envois repartent encore sur l'ancien contenu un moment. Ne pas en conclure que la
  sauvegarde a échoué et repartir en chasse. Pour distinguer « pas propagé » de « pas envoyé » :
  `select token_type, created_at from auth.one_time_tokens order by created_at desc limit 5;`
  (un `recovery_token` = chemin magic link ; un `confirmation_token` = chemin inscription), et
  `auth.users.recovery_sent_at` / `confirmation_sent_at` disent si un mail est vraiment parti.
  `auth.audit_log_entries` est vide sur ce plan, ne pas compter dessus.
- **Staging SQL without the service key**: `npx supabase@latest db query --linked "<sql>"` runs
  arbitrary SQL on the linked project via the Management API (CLI keychain auth). This is the test
  lever for staging (confirm a test user's email, grant test credits) — no secrets on disk needed.
  Verified: full API-level e2e is possible with anon key + a user JWT + this.
- **Locked first try (0026)**: the welcome-credit generation is delivered as a 160px preview blurred
  SERVER-side (never a sharp image masked by a client `blurRadius`, which anyone reading the image
  cache can strip), clear image in the client-inaccessible `vault` bucket until `unlock` charges 1
  credit. Invariants (debit
  reason MUST stay `'generation'`, debit-before-reveal, fail-open) in `docs/security-model.md` —
  read it before touching `generate`, `unlock` or migration 0026. The switch is the
  `app_config.locked_first_try` row (0027): it drives `generate` AND the whole client experience,
  so one SQL update flips everything (`0` off, `1` respect client flag, `force` always). The
  `LOCKED_FIRST_TRY` env var, when set, overrides the row (emergency only; keep it unset).
- **UX rule behind the locked first try: the credit vocabulary does not exist before the first
  purchase.** No counter, no "1 crédit", no "recharge" for someone who never bought. Pre-purchase
  the app says what happens ("ton essai apparaît d'abord en aperçu"), the paywall renders IN PLACE
  under the blurred result (`components/UnlockSheet.tsx`, packs sold as "ton résultat net + N
  essais" with the reveal's credit already deducted), and every out-of-credits gate routes to the
  waiting result (`usePendingLocked`) instead of the recharge screen. Post-purchase, the classic
  credit UI returns unchanged. Breaking this split is what made the first attempt feel bolted on.

- **Egress is the bill that scales, so nothing is stored as PNG.** Gemini returns PNG; `generate`
  re-encodes everything through `functions/_shared/images.ts` before writing (measured on real
  images: 11x lighter at identical resolution, invisible on a photo). Three renditions per result:
  full JPEG (~160 KB), a 420px thumbnail (~23 KB) that GRIDS must use instead of the full image
  (`generations.thumb_path`, 0028), and the blurred preview for locked tries (~2 KB). The stored
  selfie is downscaled to 1080px — but never `modelB64`, degrading the model input would degrade
  the product. Feed images are the most-read asset (every new user scrolls them, while a generated
  look is only ever read by its author), so `gen-feed.mjs` encodes to JPEG itself before upload —
  nothing extra to run after a batch. `scripts/reencode-feed.ts` remains as the catch-up tool for
  anything uploaded earlier and to delete the leftover PNGs; `scripts/purge-orphan-media.ts` erases
  media whose account is gone. Both are Deno, dry-run by default, and read the service key from
  `.env.gen-feed` (staging) or `backoffice/.env.local` (prod) via `set -a; source …; set +a`.
  Done on both lanes: feed 122 MB → 11 MB (staging), 82 MB → 7.5 MB (prod).
- **`offerings.current` est un piège dans ce repo : ne jamais chercher un produit dedans.** Un seul
  projet RevenueCat sert les DEUX apps, et `current` est un *statut* porté par une seule offering
  (`default`, les crédits B2C). Le produit Pro vit dans une autre offering, dont l'identifiant est
  lui aussi littéralement `current` (et **non renommable**, champ figé côté RevenueCat), donc le
  chercher dans `offerings.current` échoue toujours. **Chercher dans `offerings.all`** (helper
  `allPackages`, présent à l'identique dans les DEUX `lib/purchases.ts`, meche et meche-pro). Un
  package mappe **un produit par app**, donc une offering partagée n'expose à chaque app que ce qui
  la concerne. Panne prod du 2026-07-30 : `docs/meche-pro-launch.md` (chercher « offering »).
  Le B2C n'était pas cassé, il marchait **par chance** : ses packs vivent dans l'offering qui porte
  le statut. C'était donc une bombe à retardement, désamorcée depuis (même helper). Si les deux
  copies divergent un jour, c'est le signe qu'il faut sortir ce helper dans `packages/`.
- **Le crédit se réserve juste AVANT l'appel Gemini, jamais avant.** Un crédit paie un appel payant
  et rien d'autre : validation, encodage, upload, inserts sont gratuits. `generate` réservait en
  tête, puis encodait et uploadait le selfie avant d'écrire la ligne `generations`. Une EXCEPTION
  dans cette fenêtre était remboursée par le catch ; un kill dur ne l'était pas (limite mémoire/CPU
  pendant qu'imagescript décode une photo pleine résolution en bitmap brut : 12 Mpx = 49 Mo, 48 Mpx
  = 195 Mo), donc pas de remboursement ET pas de ligne. Six comptes en prod, dont cinq nouveaux
  users qui ont perdu leur unique crédit gratuit à leur tout premier essai et ne sont jamais
  revenus. **Le check** quand un crédit part sans résultat : compter les objets dans
  `selfies/<uid>/` — zéro veut dire que la ligne n'a jamais existé, pas qu'elle a été supprimée
  (rien ne peut supprimer une `generations` : 0021 a retiré le delete au client, et
  `delete-account` emporterait le ledger avec). Corrigé en 0030, filet de rattrapage en 0031
  (cron `reap-stuck-generations`, toutes les 5 min, seuil 10 min — mesuré : p99 réel = 15,5 s ;
  ne pas descendre sous la minute, on rembourserait des générations vivantes). Ce cron ne voit PAS
  les orphelins d'avant 0030 : leur débit n'a pas de `gen:<id>` et leur ligne n'existe pas.
- **`credit_transactions.external_id` doit porter `gen:<generationId>` sur un débit de génération.**
  Il valait NULL, donc un débit ne pointait sur rien : c'est précisément pourquoi la perte ci-dessus
  est restée invisible six semaines (sans lien on ne peut que COMPTER les débits et comparer à des
  COMPTES de générations, jamais joindre). L'index unique de 0007 rend aussi le double débit
  structurellement impossible. Même motif que `unlock:<gen>` (0026).
- **Le plafond d'appels payants vit dans `reserve_generation_credit`, pas dans l'ordre des appels.**
  Le `pg_advisory_xact_lock` est pris AVANT la lecture du solde : N requêtes concurrentes sur un
  seul crédit se sérialisent et une seule gagne. C'est ce qui rend sûr de réserver depuis la tâche
  de fond. Ne pas « simplifier » ce lock : c'est la seule chose entre 1 crédit et N générations
  payantes.
- **La sortie de `gemini-2.5-flash-image` est plafonnée à 1024px** (vérifié sur la doc Google, input
  max 7 Mo/image). Redimensionner le selfie à 1024px de côté long ne dégrade donc RIEN de ce qui
  atteint le résultat, ce qui lève la tension avec « ne jamais dégrader `modelB64` ». Attention :
  `expo-image-manipulator` n'est installé nulle part et c'est un module natif, donc **ce
  redimensionnement ne peut PAS partir en OTA** — il attend un build store.
- **La connexion par code email de l'app (`(auth)/code.tsx`) doit garder `shouldCreateUser: false`.**
  Au défaut `true`, une faute de frappe dans l'email CRÉE un compte : `handle_new_user` part, un
  crédit de bienvenue est consommé, et la personne attend un code envoyé ailleurs. Et l'envoi ne
  doit jamais distinguer succès et échec, sinon on révèle qu'une adresse a un compte. Ce chemin
  existe parce que le studio web inscrit sans mot de passe : sans lui, un acheteur web ne peut pas
  entrer dans l'app. Il dépend du template **« Magic Link »** en `{{ .Token }}` sur les DEUX projets.
- **Un toast est invisible depuis un écran `presentation: 'modal'` sur iOS** (overlay rendu à la
  racine, le modal natif est un autre contrôleur de vue et passe devant). Depuis un modal, utiliser
  `Alert.alert`. Vaut aussi pour `useSheet`, déjà noté dans `packages/ui/src/feedback.tsx`.

## Environments (full detail: ENVIRONMENTS.md)
Three lanes; **the build profile decides the backend**:
- `development` — simulator + dev client, staging backend.
- `preview` — real device (iOS + Android), **staging** backend, OTA channel `preview`.
- `production` — stores, **prod** backend, OTA channel `production`.

Two Supabase projects: **staging** `vefxfjcdvstjwieasrbq`, **prod** `hqhnvjjbohzktoapsytj`. Same
migrations pushed to both (`supabase db push` on the linked project) so they never drift.

## IAP (detail in ENVIRONMENTS.md → "In-app purchases")
All purchases — sandbox test AND real — credit the **prod** backend; there is **no staging IAP**.
One RevenueCat project → one webhook → prod `iap-webhook` (no environment filter). Android IAP needs
a Play-distributed build (internal track), not a sideloaded APK.

## Commands
```bash
# typecheck
cd apps/meche && npx tsc --noEmit
# OTA (JS-only changes) — B2C (apps/meche)
./scripts/ota-staging.sh "msg"      # → staging
./scripts/ota-prod.sh "msg"         # → prod
# OTA — Pro (apps/meche-pro), separate EAS project, separate channels
./scripts/ota-pro-staging.sh "msg"  # → staging
./scripts/ota-pro-prod.sh "msg"     # → prod (= the TestFlight build under App Store review)
# native build / store
cd apps/meche && eas build --profile preview --platform all       # on-device staging
cd apps/meche && eas build --profile production --platform all     # stores
# supabase (link the target project first)
npx supabase@latest link --project-ref <ref> && npx supabase@latest db push
npx supabase@latest functions deploy <fn> --project-ref <ref>
# backoffice admin, local + read-only (checks Node, .env.local, free port, prints the target backend)
./backoffice/start.sh
```

Two Supabase refs, for copy/paste: staging `vefxfjcdvstjwieasrbq`, prod `hqhnvjjbohzktoapsytj`.

## Legal pages are a contract with the code
`web/site/{fr,en}/privacy.html` is public and enforceable. Two commitments there are backed by
code, and changing either side without the other makes the policy false:
- account deletion erases everything **except** a 12-month email hash (anti-abuse, migration 0023)
- the retention period is honoured by the `purge-signup-marks` cron (0024)

Served by `web/server.js`, deployed separately from the app on Railway.

## Per-app notes
`apps/meche/AGENTS.md` and `apps/meche-pro/AGENTS.md` carry app-specific notes (e.g. the pinned Expo
version docs). Read them before editing that app.
