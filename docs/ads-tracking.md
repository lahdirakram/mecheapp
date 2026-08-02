# Mesure publicitaire (Google Ads, Meta, TikTok, Apple Ads)

État au 2026-08-01, embarqué dans le build 1.0.2 (B2C uniquement, meche-pro n'a rien de tout ça).

## Architecture

Quatre canaux, un seul interrupteur (le consentement) :

| Plateforme | Installs / attribution | Achats (conversion) | Événements funnel |
|---|---|---|---|
| Google Ads | GA4/Firebase (GAID Android, SKAN iOS) | RevenueCat → GA4 (app instance id) | GA4 (`sign_up`, `paywall_viewed`…) |
| Meta | Meta SDK (AEM + SKAN iOS, sans ATT) | RevenueCat → intégration Meta (`$fbAnonId`) | Meta SDK client (`lib/marketing.ts`) |
| TikTok | TikTok SDK (auto install/launch) | **client-side** `PURCHASE` (pas d'intégration RC) | TikTok SDK client (`lib/marketing.ts`) |
| Apple Ads | RevenueCat AdServices token | RevenueCat | n/a |

- **`apps/meche/lib/marketing.ts`** est le seul fichier qui parle aux SDKs pub. `analytics.ts`
  (GA4) lui forwarde chaque événement (`forwardEvent`), mapping et filtrage là-bas. Achat TikTok :
  `useBuyPack.ts` (prix réel du store). `identify` : `AnalyticsSync.tsx`.
- **Consentement** (`lib/consent.ts` + `components/ConsentGate.tsx` + ligne profil « Mesure et
  publicité ») : les SDKs Meta/TikTok ne sont PAS initialisés et Google Consent Mode reste
  `denied` (defaults natifs, `plugins/withAnalyticsConsentDefaults.js`) tant que l'utilisateur n'a
  pas accepté. Refus = l'app marche pareil, GA4 continue (analytics_storage on, signaux pub off).
- **Forme et timing de l'écran de consentement (décidés le 2026-08-01, après DEUX allers-retours,
  ne pas rejouer le débat)** : écran plein style CMP à finalités, lié à l'AUTH. Une ligne
  « Nécessaire au fonctionnement, toujours actif », une vraie case NON pré-cochée « Mesure
  publicitaire », les liens CGU + confidentialité, et la paire « Tout accepter » / « Continuer »
  (un tap chacun, la case décochée valant refus : la barre CNIL du refus aussi simple que
  l'acceptation). Il s'affiche dès qu'une **session existe sans choix stocké** : dernière étape
  du signup pour un nouveau compte, une seule fois au lancement pour un compte existant après la
  mise à jour ; un curieux sans compte n'est JAMAIS sollicité. Variantes essayées et rejetées le
  même jour : popup brut au premier lancement (hostile, tout le monde refuse) et différé « après
  le premier essai » (perdait le premier achat pour toutes les plateformes). Le rejeu
  `replayAfterGrant` (identify + Registration, compte < 7 jours) couvre le sign_up qui précède de
  quelques secondes l'acceptation, les installs existantes, et les acceptations tardives depuis
  la ligne profil. **Ne JAMAIS fusionner la case pub avec l'acceptation des CGU** : le RGPD exige
  un consentement spécifique, un consentement mêlé aux textes légaux est invalide (art. 7, arrêt
  Planet49) et c'est ce que la CNIL sanctionne ; une case DÉDIÉE à côté des CGU est la forme
  légale, c'est exactement ce que fait cet écran.
- **Installs sans consentement : iOS oui (SKAdNetwork), Android non.** SKAN est géré par l'OS,
  anonyme et agrégé, donc hors consentement ; l'enregistrement est implicite depuis iOS 15.4
  (l'ancien `registerAppForAdNetworkAttribution` est déprécié) et les IDs SKAN de Meta et TikTok
  sont dans app.json. Sans SDK initialisé le postback part sans valeur de conversion (déduit de
  la doc SKAN 4) : l'install est comptée campagne par campagne, sans détail post-install. Une
  fois le consentement donné, les SDKs enrichissent les valeurs de conversion. Android n'a aucun
  canal d'install sans consentement (le Play Install Referrer est lu par les SDKs), d'où
  l'importance de demander tôt dans le funnel (à l'auth).
- **Config 100% runtime, AUCUN id en dur dans le binaire** : les 4 clés ci-dessous sont lues par
  le JS au lancement. Vides = plateforme silencieusement éteinte. On peut donc les remplir APRÈS
  la sortie du build et les activer par simple OTA.

## Les 4 clés (remplies le 2026-08-01, dans les 3 profils eas.json)

```
EXPO_PUBLIC_FB_APP_ID        = 1054761336953574        (Meta app "Meche", business AML Technologies)
EXPO_PUBLIC_FB_CLIENT_TOKEN  = ce398dee70276f7d44a11194040a2148
EXPO_PUBLIC_TT_APP_ID        = 7669075190136635399      (TikTok, ads account "aml technologies")
EXPO_PUBLIC_TT_ACCESS_TOKEN  = TTDiAvf2U3c67KfuqiirhBWh0n16CXqH   (= "App Secret" côté TikTok UI)
```

Déjà dans `build.<profil>.env` des trois profils (development/preview/production). Vides =
plateforme éteinte, le JS no-ope — donc rien à rebuilder pour les activer : un OTA staging/prod
suffit une fois le prochain build (avec les SDKs natifs) installé sur les devices de test.

**Meta, fait** : app "Meche" créée sur developers.facebook.com, cas d'usage "App Ads", liée au
Business Manager AML Technologies. App ID + Client Token récupérés (Settings > Basic / Advanced).
**Intégration RevenueCat activée** (2026-08-01) : Integrations > Meta Ads > Conversions API,
Dataset ID `1798938241074799` (ensemble de données "meche app", PAS l'App ID ni l'ad account id —
piège vécu : l'URL Events Manager `list/app/<id>?act=<ad_account_id>` affiche un dataset dont l'ID
réel n'apparaît PAS dans l'URL ; le vrai Dataset ID est dans Business Settings > Sources de
données > Ensembles de données et pixels > Details). Token généré via Paramètres du dataset >
API Conversions > "Configurer une intégration directe" > **"Configurer sans Dataset Quality API"**
(ne jamais prendre l'option "Recommandée" avec Dataset Quality API : Meta prévient explicitement
que c'est irréversible — "il n'est plus possible de la désactiver"). Rempli aussi en Sandbox
(mêmes valeurs, car pas de staging IAP dans ce repo — tout achat sandbox ET réel passe par le
backend prod). `Non-Subscription Purchase` → `fb_mobile_purchase` (nos packs crédits, pas
d'abonnement B2C). "Send events when ATT consent is not authorized" laissé coché (pas d'ATT ici).
Le use case Meta ("Type d'app") ne s'est pas appliqué depuis l'assistant de création (bug/lenteur
Meta) : à vérifier dans Paramètres > Cas d'utilisation si le Gestionnaire de publicités ne voit
pas l'app plus tard — non bloquant pour le tracking d'événements.
**Complété le 2026-08-02 (le "je ne vois aucun événement" avait TROIS causes)** : (1) l'app Meta
était en mode DÉVELOPPEMENT → Meta ignore les événements des utilisateurs sans rôle sur l'app ;
passée en **Live** (ça exigeait privacy URL + catégorie, remplies : privacy/terms/suppression =
mecheapp.com, catégorie Style de vie). (2) Aucune plateforme déclarée → iOS ajoutée (bundle
com.meche.app, store id 6777728552). La plateforme Android est IMPOSSIBLE à déclarer tant que la
fiche Play n'est pas publique (Meta vérifie le package contre le store) : à faire à la sortie
Android. (3) Les DEUX toggles Meta « Référence automatiquement les achats » (iOS et Android) sont
désactivés et doivent LE RESTER : les achats arrivent par RevenueCat, l'auto-log du store les
compterait en double. (4) Côté TikTok : la connexion app est « Pending verification » jusqu'aux
premiers événements valides, qui ne peuvent venir QUE de l'app enregistrée (iOS 6777728552) ;
l'appId Android est hardcodé `com.meche.app` dans marketing.ts (un package staging inconnu =
événements silencieusement ignorés). Les vues d'ensemble des deux Events Managers ont 15 à 30 min
de latence : utiliser les onglets Test Events pour du temps réel.

**TikTok, fait** : app connectée dans Events Manager (compte "aml technologies") via TikTok SDK
(pas de MMP), store listing = App Store id 6777728552. TikTok App ID + App Secret récupérés à
l'étape "Initialize app" du guide SDK. L'app envoie tout côté client (installs auto par le SDK,
`Registration`, `CheckOut`, `SpendCredits`, `Purchase` avec valeur). **Reste à faire** : rien de
bloquant, l'intégration est autonome.

**Google Ads, fait** (vérifié 2026-08-01) : Firebase `mecheapp-prod` déjà lié au compte Google Ads
"FixMyText.AI" (450-372-3262, compte partagé entre projets du user — normal, pas une erreur).
Key events GA4 : `sign_up`, `paywall_viewed`, `try_on_completed` étaient déjà marqués ; `purchase`
est un Key event VERROUILLÉ (impossible à démarquer — comportement standard GA4 pour l'event
ecommerce standard, l'étoile paraît "creuse" dans l'UI mais le tooltip au clic confirme "Key event
can't be unmarked"). Confirmé côté Google Ads > Actions de conversion : `purchase`, `in_app_purchase`,
`sign_up`, `login`, `paywall_viewed` déjà importés pour Android ET iOS (source "Application mobile
(Firebase)", 19 actions au total). "Aucune conversion récente" partout = normal, aucune campagne
n'a encore tourné, pas une erreur de configuration.

**Play Console** : Data Safety à mettre à jour (le build collecte maintenant l'Advertising ID :
`withoutAdIdSupport` est passé à `false`, et Meta/TikTok déclarés en partage pour la pub).
**App Store Connect** : questionnaire confidentialité, ajouter « Identifiers / Usage Data » en
« used for advertising » selon la doc Meta/TikTok. Pas d'ATT : on ne lit pas l'IDFA, Meta mesure
via AEM/SKAN (les SKAdNetworkItems incluent Meta et TikTok, `238da6jt44` ajouté en 1.0.2).

## Vérifier que ça marche (avant d'acheter du trafic)

1. Build preview avec les clés remplies : l'écran de consentement s'affiche dès qu'on est
   connecté (juste après le signup pour un compte neuf). Une fois le choix fait il ne revient
   plus ; pour le re-tester, réinstaller l'app ou repasser par Profil > Mesure et publicité.
2. Meta Events Manager > Test events : l'app apparaît, `fb_mobile_complete_registration` à
   l'inscription. TikTok Events Manager > Test : `Registration`, puis `Purchase` (sandbox IAP =
   backend prod, cf. ENVIRONMENTS.md).
3. GA4 DebugView : `sign_up`, `paywall_viewed`, et l'état de consentement dans les propriétés.
4. RevenueCat > Customer > attributs : `$fbAnonId`, `$idfv`/`$gpsAdId` présents après consentement.

## Staging vs prod : séparé pour GA4, PAS pour Meta/TikTok (décision assumée)

- **GA4/Google Ads est déjà séparé, gratuitement.** Un build staging change `bundleIdentifier`
  (`com.meche.app.staging`) et `googleServicesFile` (`GoogleService-Info.staging.plist`) dans
  `app.config.js` → il parle au projet Firebase `mecheapp-staging`, PAS `mecheapp-prod`. Un test
  sur build preview n'apparaîtra donc jamais dans le Google Ads qu'on a vérifié (lié à
  `mecheapp-prod` uniquement) — il faut regarder le DebugView de `mecheapp-staging`, ou tester sur
  un build du canal `production`.
- **Meta et TikTok NE SONT PAS séparés : volontaire, décidé le 2026-08-01.** Les 4 clés
  (`EXPO_PUBLIC_FB_*`, `EXPO_PUBLIC_TT_*`) ont la MÊME valeur dans les 3 profils eas.json. Aucun
  des deux SDK ne vérifie le bundle id appelant au moment de logger un événement — un build
  preview installé sur un téléphone de test envoie donc de VRAIS événements dans le dataset Meta
  et l'app TikTok de prod, indiscernables du trafic réel. Idem pour les achats sandbox → Meta
  (cohérent avec « pas de staging IAP », déjà vrai pour RevenueCat avant ce chantier).
  **Pourquoi laissé tel quel** : c'est ce qui permet à la vérification ci-dessus de marcher (les
  Test Events de Meta/TikTok ne montrent quelque chose QUE parce qu'ils partagent le dataset réel).
  À séparer avant de dépenser du vrai budget pub : créer une 2e app Meta + un 2e app TikTok pour
  staging, gater les 4 clés par `APP_ENV` comme Supabase/Firebase le sont déjà.

## Pièges connus

- **Ne JAMAIS importer l'index de `react-native-fbsdk-next`, toujours les sous-modules**
  (`react-native-fbsdk-next/lib/module/FBSettings` et `.../FBAppEventsLogger`, voir `fb()` dans
  `marketing.ts`). L'index instancie le module natif `FBAccessToken`, dont le constructeur
  Android (`AccessTokenTracker`) exige un FacebookSdk DÉJÀ initialisé et tue l'app sinon
  (fatal `HostObject::get for prop 'FBAccessToken'`). Sur la nouvelle archi RN les modules natifs
  s'instancient paresseusement À L'ACCÈS, donc le crash part du simple `import()` JS, où qu'il
  soit. **Le check** sur un crash Android post-consentement : `adb logcat -b crash -d`, la stack
  nomme le module. Vécu deux fois le 2026-08-02 (une par site d'appel de `fb()`).
- **Ne jamais logger l'achat côté client pour Meta ou GA4** : RevenueCat les envoie server-side
  (double comptage sinon). TikTok est l'exception (pas d'intégration RC) et le SDK TikTok a son
  auto-payment-tracking DÉSACTIVÉ (`disablePaymentTracking: true`) pour la même raison : un seul
  chemin par plateforme.
- Le SDK Android TikTok vient de **JitPack** (`extraMavenRepos` dans app.json). Si un build EAS
  échoue sur `com.github.tiktok:tiktok-business-android-sdk`, c'est ce repo qui manque.
- **Le config plugin fbsdk est OBLIGATOIRE, mais avec tout l'automatique désactivé** (revirement
  du 2026-08-02, l'inverse de ce qui était écrit ici avant). L'init 100% runtime sans manifest
  marchait sur iOS mais CRASHAIT Android en dur à l'acceptation (FBSettingsModule n'a aucun
  try/catch, et le choix 'granted' déjà stocké transformait ça en crash-loop au lancement).
  Le plugin est ajouté dynamiquement dans `app.config.js` depuis `EXPO_PUBLIC_FB_APP_ID`/
  `EXPO_PUBLIC_FB_CLIENT_TOKEN`, avec `isAutoInitEnabled/autoLogAppEventsEnabled/
  advertiserIDCollectionEnabled: false` : le SDK reste inerte jusqu'à l'init de `marketing.ts`
  après consentement (le flux GDPR documenté du plugin). Un kill-switch temporaire
  `Platform.OS === 'android'` dans `startMeta()` protège les binaires d'AVANT ce plugin :
  le retirer (OTA) une fois les devices passés sur un build qui contient le manifest Meta.
- Les wrappers sont des packages communautaires (`react-native-tiktok-business-sdk` 1.7.1,
  `react-native-fbsdk-next` 13.4.3, versions exactes). Avant de les monter : vérifier qu'ils
  compilent toujours contre l'Expo épinglé du repo.
