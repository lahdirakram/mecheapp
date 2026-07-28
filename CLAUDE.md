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
- `backoffice/` — **local admin dashboard**, read-only. `./backoffice/start.sh`. Deliberately OUTSIDE
  the pnpm workspace (`.npmrc` forces `node-linker=hoisted`; a web app under `apps/` would share the
  flat tree with the Expo apps). Own `node_modules`, own npm lockfile. Detail: `backoffice/README.md`.
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
- **Deploy order when a migration and an OTA go together**: OTA first, then migration. New JS calling
  a missing RPC is a window YOU close in minutes; a migration that breaks old clients lasts until
  every user updates. Then push the migration immediately — don't leave the gap open.
- **`app.json` `version` is the OTA compatibility key** (`runtimeVersion.policy = "appVersion"`). If it
  drifts from the installed binary, updates silently never arrive. Both lanes are on `1.0.1`; keep them
  aligned, or switch to `policy: "fingerprint"` at a store release (both lanes at once).

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
