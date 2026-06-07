# In-app purchases (RevenueCat) — setup runbook

Credit packs are **consumable IAP**. The client opens the store sheet; RevenueCat validates the
receipt and calls our webhook, which is the only thing that grants credits.

## Status
- ✅ Backend webhook `iap-webhook` — deployed (`--no-verify-jwt`), tested live (auth, routing,
  grant, idempotent retry).
- ✅ DB — `credit_packs.product_id` maps packs to store SKUs; `credit_transactions.external_id`
  (unique) makes grants idempotent.
- ✅ Client — `lib/purchases.ts` + `lib/PurchasesSync.tsx`, recharge screen buys + polls balance.
  Dormant until the SDK keys are set in `eas.json`.
- ⛔️ Blocked on: Apple Developer account ($99/yr) + Google Play Console ($25 once), then a
  sandbox-purchase test on a real build.

## Fixed values
| Thing | Value |
|---|---|
| Bundle id / package | `com.meche.app` |
| Webhook URL | `https://vefxfjcdvstjwieasrbq.supabase.co/functions/v1/iap-webhook` |
| Webhook auth header | the value stored as Supabase secret `RC_WEBHOOK_SECRET` |
| Product IDs | `meche_credits_taste` (0,99 €/5), `meche_credits_star` (2,99 €/20), `meche_credits_pro` (5,99 €/50) |

## Steps
### A. Store products (consumables) — same 3 IDs on both stores
- **App Store Connect:** sign the Paid Apps Agreement; app record `com.meche.app`; create 3
  Consumable IAPs (table above) with display name + review screenshot; add a Sandbox Tester.
- **Google Play Console:** app record `com.meche.app` with a build on a testing track; create the
  3 in-app products (same IDs/prices) and Activate; add a License tester.

### B. RevenueCat
1. New Project.
2. Add App Store app (`com.meche.app`) + App Store Connect API key for receipt validation.
3. Add Play Store app (`com.meche.app`) + Play service-account JSON.
4. Import the 3 product IDs.
5. Offering `default` with 3 packages, one product each.
6. Copy the public SDK keys: Apple `appl_…`, Google `goog_…`.
7. Integrations → Webhooks → URL + Authorization header (values above).

### C. Wire keys + test
1. Put `appl_…` / `goog_…` into `eas.json` → `EXPO_PUBLIC_RC_IOS_API_KEY` /
   `EXPO_PUBLIC_RC_ANDROID_API_KEY` (these are publishable client keys, safe to commit like the
   anon key).
2. Build a dev build, run on device, buy a pack with the sandbox/license tester.
3. Expect: store sheet → purchase → webhook grants → balance updates → success toast.

## Manual webhook test (no app needed)
```
curl -s -X POST "$URL" -H "Authorization: $RC_WEBHOOK_SECRET" -H "Content-Type: application/json" \
  -d '{"event":{"type":"NON_RENEWING_PURCHASE","id":"evt_x","app_user_id":"<uuid>","product_id":"meche_credits_pro"}}'
```
Re-sending the same `id` is a no-op (idempotent).
