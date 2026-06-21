# Mèche — monorepo guide

Two-sided coiffure (hair) marketplace. AI hair try-on for clients (B2C) + a stylist side (Pro).
Stack: Expo / React Native, Supabase (Postgres + Auth + Storage + Edge Functions), RevenueCat (IAP),
Gemini (image generation + suggestions). pnpm + turbo workspace.

## Layout
- `apps/meche` — **B2C app** (clients). Main app; most work happens here.
- `apps/meche-pro` — Pro/stylist app.
- `packages/ui` — shared components (`MText`, `MIcon`, `MPAL` palette, `useSheet`/`useToast`, `TabBar`…).
- `packages/api-client` — Supabase client, auth, React Query hooks (`queries.ts`).
- `packages/core` — theme/palette, fonts, i18n, shared types.
- `supabase/` — `migrations/` (schema, the source of truth — never hand-edit schema in a dashboard),
  `functions/` (`generate`, `suggest`, `iap-webhook`, `delete-account`), `seed.sql`.

## Working rules
- **Node 22 for all `eas`/`expo`/`supabase` commands**: `source ~/.nvm/nvm.sh && nvm use 22`. Default
  Node 18 crashes Metro.
- **The user ships JS changes by OTA, not local Metro.** Use `./scripts/ota-staging.sh "msg"` then
  `./scripts/ota-prod.sh "msg"`. Don't start `expo start` unless asked.
- **Never `git commit`/`push` until the user explicitly says so.** Branch off `main` if needed.
- **No em dash in user-facing copy** (FR/EN strings). Use a period or comma.
- **Cap paid AI calls** — retries/fan-out on the Gemini image model must stay tightly bounded (budget).
- After edits, `cd apps/meche && npx tsc --noEmit` to typecheck before shipping.

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
```

## Per-app notes
`apps/meche/AGENTS.md` and `apps/meche-pro/AGENTS.md` carry app-specific notes (e.g. the pinned Expo
version docs). Read them before editing that app.
