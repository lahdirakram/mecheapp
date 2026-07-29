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
- `legal/` — marketing + legal pages (zero-dep Node server, Railway). Also outside the workspace.

## Working rules
- **Node 22 for all `eas`/`expo`/`supabase` commands**: `source ~/.nvm/nvm.sh && nvm use 22`. Default
  Node 18 crashes Metro.
- **The user ships JS changes by OTA, not local Metro.** Use `./scripts/ota-staging.sh "msg"` then
  `./scripts/ota-prod.sh "msg"`. Don't start `expo start` unless asked.
- **Never `git commit`/`push` until the user explicitly says so.** Branch off `main` if needed.
- **No em dash in user-facing copy** (FR/EN strings). Use a period or comma.
- **Cap paid AI calls** — retries/fan-out on the Gemini image model must stay tightly bounded (budget).
  A refusal (`gemini: blocked …`) is NOT retried: paying a second call for a policy block is waste.
- After edits, `cd apps/meche && npx tsc --noEmit` to typecheck before shipping. In `backoffice/`, use
  `./node_modules/.bin/tsc` — `npx tsc` picks up the root workspace's TypeScript 6, not the local 5.9.
- **Client write access to the DB is deliberately minimal.** Read `docs/security-model.md` before
  touching any policy, grant, or `functions/generate`. The rule: never let the client write a value
  the server later reads back with `service_role`.
- **The backoffice has exactly ONE write path**: `backoffice/src/lib/curation.ts`, which sets
  `feed_items.status` through PostgREST (never the Postgres pool, so `lib/db.ts`'s `begin read only`
  stays literally true). Its `service_role` client is typed with a `Database` that declares only
  `feed_items`, so a write to any other table doesn't compile. A second write goes through that file
  or not at all. The curation screen is `/feed`: `gen-feed.mjs` drafts are invisible to the app until
  published there. **Refusing archives, it doesn't delete** — gen-feed de-duplicates combos across
  ALL statuses, so erasing a refusal makes it regenerate, and that's a paid Gemini call.
- **Deploy order when a migration and an OTA go together**: OTA first, then migration. New JS calling
  a missing RPC is a window YOU close in minutes; a migration that breaks old clients lasts until
  every user updates. Then push the migration immediately — don't leave the gap open.
- **`app.json` `version` is the OTA compatibility key** (`runtimeVersion.policy = "appVersion"`). If it
  drifts from the installed binary, updates silently never arrive. Both lanes are on `1.0.1`; keep them
  aligned, or switch to `policy: "fingerprint"` at a store release (both lanes at once).
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
# OTA (JS-only changes)
./scripts/ota-staging.sh "msg"      # → staging
./scripts/ota-prod.sh "msg"         # → prod
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
`legal/public/{fr,en}/privacy.html` is public and enforceable. Two commitments there are backed by
code, and changing either side without the other makes the policy false:
- account deletion erases everything **except** a 12-month email hash (anti-abuse, migration 0023)
- the retention period is honoured by the `purge-signup-marks` cron (0024)

Deployed separately from the app, on Railway.

## Per-app notes
`apps/meche/AGENTS.md` and `apps/meche-pro/AGENTS.md` carry app-specific notes (e.g. the pinned Expo
version docs). Read them before editing that app.
