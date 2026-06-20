# Environments — Mèche

Three lanes. **The build profile decides the backend**, not where you upload it. TestFlight / Play
internal are just distribution tubes — a build points at staging or prod depending on how it was
built.

| Lane | How you reach it | Backend (Supabase) | Money | Build profile / channel |
|------|------------------|--------------------|-------|-------------------------|
| **Dev** | `expo start` on your device | local (`supabase start`) or staging | none | `development` |
| **Test** | on-device internal build | **STAGING** | no IAP (see below) | `preview` / channel `preview` |
| **Prod** | App Store + Play public | **PROD** | real | `production` / channel `production` |

Rule: **never submit a `preview` build to the public**. TestFlight holds `preview` (staging) builds
for you; the App Store gets the `production` (prod) build.

## In-app purchases (IAP) — PROD only

IAP is the one exception to the lanes above. A store app is a single identity tied to one backend, so
**all purchases — sandbox/license-tester AND real — credit the PROD backend.** There is no staging IAP.

- **One** RevenueCat project → **one** webhook → the **prod** `iap-webhook` (no environment filter; it
  grants for sandbox and production alike — a normal store user can't make sandbox purchases).
- Test the webhook **logic** on staging via RevenueCat "send test event" / a crafted POST with a
  staging user id. The **real purchase flow** is only verifiable on the store track (sandbox = no
  charge), against prod.
- **Android**: Play Billing needs a **Play-distributed build** (internal track), never a sideloaded
  `preview` APK (else "produit introuvable"). Build `production` → `eas submit` to Internal testing →
  add your Google account as a License tester + opt in → install from the Play link. Products
  `meche_credits_taste/star/pro` must be Active. iOS: same idea via TestFlight sandbox.

## Supabase projects

| Env | Project ref | Notes |
|-----|-------------|-------|
| STAGING | `vefxfjcdvstjwieasrbq` | the original project; keep on the Free tier |
| PROD | `hqhnvjjbohzktoapsytj` | the new clean project |

## Where every variable lives (one home each)

| Thing | Home | Per-env? | In git? |
|-------|------|----------|---------|
| `EXPO_PUBLIC_*` (URL, anon key, Google client IDs, RC public keys) — **public** | `eas.json` → profile `env` | yes (`production` vs `preview`/`development`) | yes |
| Local dev `EXPO_PUBLIC_*` | `apps/meche/.env` | n/a | no (gitignored) |
| Edge-function secrets (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TEXT_MODEL`, `GEN_DAILY_CAP`, `GEN_USER_HOURLY_CAP`, `RC_WEBHOOK_SECRET`) | Supabase project secrets (`supabase secrets set`) | yes — set on each project | **never** |
| Auth providers (Apple/Google) + Resend SMTP | Supabase dashboard, per project | yes | no |
| Push / signing (APNs key, FCM, Play service account, Apple .p8) | EAS credentials + store consoles | shared | no |
| Master copy of all real secrets | **your password manager** (`meche-prod`, `meche-staging`) | yes | no |

Never hand-edit schema in a dashboard — **every schema change is a migration** in
`supabase/migrations`, replayed identically on both projects so they never drift.

## Daily commands

### Ship a JS-only change (90% of changes)
```bash
./scripts/ota-staging.sh "what changed"   # → preview channel, staging backend
# test on your TestFlight / Play-internal build, then:
./scripts/ota-prod.sh "what changed"      # → production channel, prod backend (real users)
```
The scripts read the right `EXPO_PUBLIC_*` from `eas.json` automatically — you never touch keys.

### Native change / new version
```bash
cd apps/meche
eas build --profile preview    --platform all   # test build → TestFlight / Play internal
eas build --profile production  --platform all   # release build
eas submit  --profile production --platform ios
eas submit  --profile production --platform android
```

### Working on a project (migrations, secrets, functions)
Mental model: **link the project you're working on, then run everything** — all commands target the
linked project. Check which one you're on with `supabase projects list` (● = linked).

```bash
# Pick the target ONCE:
supabase link --project-ref hqhnvjjbohzktoapsytj   # PROD   (staging: vefxfjcdvstjwieasrbq)

# Then, all against that linked project:
supabase db push                                   # apply migrations from supabase/migrations/
supabase functions deploy generate
supabase functions deploy suggest
supabase functions deploy iap-webhook --no-verify-jwt
supabase secrets set KEY=value
```
Golden rule: **migrations always go staging first, then prod.** Before anything destructive, confirm
the linked project.

### Set a server secret (do it on BOTH projects, with each env's value)
```bash
supabase secrets set GEMINI_API_KEY=... --project-ref vefxfjcdvstjwieasrbq   # staging value
supabase secrets set GEMINI_API_KEY=... --project-ref hqhnvjjbohzktoapsytj    # prod value
```

## Setup status
- [x] `eas.json` split (production = prod placeholders, preview/development = staging)
- [x] OTA scripts (`scripts/ota-staging.sh`, `scripts/ota-prod.sh`)
- [ ] Fill `eas.json` production `env` with real prod values (after PROD Supabase + prod RevenueCat exist)
- [ ] Push schema + seed to PROD Supabase
- [ ] Set edge-function secrets on PROD
- [ ] Configure PROD Auth (Apple/Google providers, Resend SMTP, redirect URLs)
- [ ] RevenueCat prod + webhook → PROD
- [ ] Store apps + IAP products (App Store Connect, Play Console)
- [ ] Push credentials (APNs, FCM) in EAS
- [ ] Privacy policy URL + in-app account deletion

(CI via GitHub Actions comes later — it will just automate these same commands.)
