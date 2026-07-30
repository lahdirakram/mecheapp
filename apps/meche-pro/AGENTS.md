# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Mèche Pro — app notes

B2B app for stylists. V1 = "le Studio au fauteuil": in-chair AI try-on + salon fiche + portfolio.
Demandes/chat (V2) and agenda (V3) are deliberately NOT in this app yet.

- **Nav**: 3 tabs + center button — Studio, Essais | ✨ Essayer | Salon (`PTabBar` in packages/ui).
  Essais = full try-on history with client search (client_name on looks, chips = recent clients
  only — search is the scalable path). Réalisations and the fiche are sub-screens of Salon.
  `try/` is a fullScreenModal stack (selfie → idea → generating → result), ported from apps/meche.
- **Identity**: prod `com.mechepro.app`, staging `com.mechepro.app.staging` (APP_ENV=staging in
  eas.json → app.config.js override, same pattern as apps/meche). EAS project
  `c64392b4-382f-4d90-9f8d-ef8e79c08f40` (@akram.lahdir/meche-pro).
- **Auth**: email + Apple + Google (`role: 'pro'` at signup — the DB trigger skips the B2C free
  credit). The per-bundle-id iOS OAuth clients now exist, one per profile in `eas.json`; the
  Google plugin is still added conditionally by `app.config.js` on `GOOGLE_IOS_REVERSED_CLIENT_ID`.
- **OTA**: `./scripts/ota-pro-staging.sh "msg"` then `./scripts/ota-pro-prod.sh "msg"` (the plain
  `ota-staging.sh` / `ota-prod.sh` ship the B2C app, NOT this one). `runtimeVersion.policy` is
  `appVersion` and `app.json` `version` is `1.0.0`, so a prod OTA lands on TestFlight build
  **1.0.0 (4)** — the binary attached to the pending App Store Version 1.0. **The Pro production
  channel is therefore what an Apple reviewer runs**, even though the app is not on sale: a screen
  that crashes there is a rejection, so validate on the staging build first.
- **Store launch state**: `docs/meche-pro-launch.md` (what is really done in App Store Connect,
  RevenueCat and Play, and what each remaining step is blocked by). Copy for the App Store listing
  is written and waiting in `store/listing.md`.
- **Quota (server-enforced in supabase/functions/generate)**: 3 lifetime free try-ons, then the
  `meche_pro_monthly` subscription (29,99 €) with 100 try-ons/month; refines count. Client display
  reads `my_pro_status()` rpc. Env overrides: PRO_FREE_TRIALS, PRO_MONTHLY_QUOTA.
- **Subscription**: RevenueCat → prod `iap-webhook` upserts `subscriptions` (one row per owner,
  product ids starting with `meche_pro`). No staging IAP, like B2C.
- **Réalisations = REAL photos only, never AI renders** (product rule). Added from the
  Réalisations screen (camera/gallery after the cut) into the public `portfolio` bucket under
  `<uid>/…` (owner write policy from migration 0016) + a `portfolio_items` row. There is
  deliberately NO "publish" action on the try-on result screen.
