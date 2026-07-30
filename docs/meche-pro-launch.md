# Mèche Pro — état de la mise en production (vérifié le 2026-07-29)

État constaté **dans les consoles**, pas déduit du repo. Les docs `revenuecat.md` et
`play-console-setup.md` ne couvrent que le B2C ; ce fichier couvre le Pro.

> **La leçon de la session** : les docs du repo décrivaient le Pro comme « tout à faire » côté
> stores alors que l'abonnement Apple était déjà complet (prix sur 175 pays, localisations, capture
> de review). **Le check** avant de planifier un chantier store : ouvrir la console. Un runbook
> dans le repo dit ce qu'on avait l'intention de faire, jamais ce qui a été fait.

## Identifiants
| Chose | Valeur |
|---|---|
| App Store Connect | app `6788159734` (prod), `6788159943` (staging) |
| Groupe d'abonnements Apple | `meche_pro` → id `22213501` |
| Abonnement Apple | `meche_pro_monthly`, id Apple `6788160691` |
| RevenueCat | projet **unique** `meche` = `74247777` (le Pro vit dedans, pas dans un projet séparé) |
| Play Console | compte `6297267223607545702` (personnel), app `4973290807210273929` (`com.mechepro.app`) |

## ✅ Terminé
- **Apple, produit** : `meche_pro_monthly`, 1 mois, 29,99 € sur 175 pays, descriptions FR + EN,
  capture de review chargée, imposition alignée sur l'app parente, disponibilité mondiale.
- **Apple, groupe** : localisations FR (« Mèche Pro - Le Studio ») et EN (« Mèche Pro - The
  Studio »), option « nom de l'app » conservée.
- **RevenueCat** : les 4 apps existent (meche iOS/Android, Mèche Pro iOS/Android), le produit
  `meche_pro_monthly` est rattaché à l'entitlement du même nom, webhook **Active** au niveau projet
  (donc le Pro en hérite, rien à reconfigurer), intégration Firebase active.

- **Apple, fiche App Store** : nom, sous-titre, texte promotionnel, description, mots-clés, URL
  d'assistance et marketing, copyright, saisis **en FR et EN** depuis `store/listing.md`. Catégorie
  principale = **Économie et entreprise** (outil de travail vendu par abonnement, catégorie moins
  encombrée que Style de vie, et cohérente avec le « réservé aux professionnels » des notes de
  review). Le nom porte un suffixe ASO, `Mèche Pro : essai coiffure` : seul le nom de la **fiche**
  est indexé par Apple, le nom sous l'icône reste `Mèche Pro` (celui du binaire).

## ✅ Terminé (suite, session du 29/07 soir)
- **Builds preview vérifiés sur device réel** : iOS (`115cbd4a`, iPhone XR) et Android (`5d763958`),
  commit `c118b6b` (restore purchases + liens légaux). Apple et Google Sign-In confirmés fonctionnels
  sur les deux. Note en cours de route : un premier build iOS (`9994b32e`) avait échoué avec
  `--non-interactive`, EAS ne pouvant pas s'authentifier auprès d'Apple pour régénérer le profil de
  provisioning ; la capacité Sign In with Apple était en fait déjà active des deux côtés (staging et
  prod), simple faux positif d'une lecture de page trop précoce. **Toujours lancer les builds store
  en interactif**, jamais `--non-interactive`, pour laisser EAS gérer les credentials Apple lui-même.
- **Compte de démo Apple créé sur PROD** : `apple-review@mecheapp.com`, uid
  `d5637552-1b03-439f-8217-6aa70c0eed0d`, role `pro`, e-mail confirmé par SQL. Salon "Atelier Mèche"
  (Paris, tél., bio, horaires) + 2 services + 1 styliste insérés directement en SQL (pas de vraie
  photo/réalisation : générer un essai IA réel aurait un coût, et le compte a de toute façon ses 3
  essais offerts intacts pour que le reviewer puisse tester la génération lui-même). Mot de passe à
  transmettre à Apple dans « Informations utiles à la vérification ».
- **Permission Play Console accordée** au compte de service EAS existant
  (`eas-468@perfect-response-saas.iam.gserviceaccount.com`, déjà utilisé pour Mèche B2C) :
  « Déplo­yer les applications sur des canaux de test » sur l'app Mèche Pro. Ça permet à
  `eas submit` de pousser l'AAB directement sans upload manuel dans le navigateur.

## ⛔️ Bloqué, et par quoi
- **Play attend son premier build.** Play Console exige un **App Bundle (.aab)**, pas l'APK que
  produit le profil `preview` (`buildType: apk`) : c'est le profil `production` (sans override
  Android dans `eas.json`, donc bundle par défaut) qu'il faut soumettre. `eas submit` est la voie
  choisie plutôt que l'upload navigateur : un `.aab` dépasse largement les 10 Mo que l'outil de
  dépôt de fichier du navigateur accepte.
- **Compte développeur personnel** ⇒ Google impose un **test fermé (12 testeurs, 14 jours)** avant
  d'accorder l'accès production. C'est le vrai chemin critique du lancement Android, pas la config.
  Le 1er upload (tests internes) ne déclenche pas ce compte à rebours à lui seul : il faudra ensuite
  passer par l'onglet **Tests fermés** et y ajouter réellement 12 testeurs.
- **Apple : la fiche App Store 1.0 est remplie (texte), mais sans captures ni build.** Nom, sous-titre,
  texte promo, description, mots-clés, URL, copyright et catégorie sont saisis en FR + EN. Il reste
  les captures d'écran (voir `store/listing.md` section 9a) et l'upload du build lui-même.
- L'abonnement Apple restera en « Finaliser avant soumission » quoi qu'on fasse : Apple exige que le
  **premier** abonnement d'une app soit soumis **avec un binaire**. Ce n'est pas une erreur de
  configuration, ne pas chercher à la corriger.

## Pièges relevés
- **Statut de commerçant DSA : déclaré « non-commerçant », et pas seulement sur Mèche Pro —
  MIS EN PAUSE le 29/07, décision utilisateur, à reprendre plus tard.**
  Vérifié le 29/07 : **Mèche B2C (6777728552), déjà en prod et vendant des crédits payants, a
  exactement la même déclaration.** La case est **par app** (« Ce développeur s'est identifié comme
  non-commerçant **pour cette app** »), pas globale au compte développeur : le compte a bien une
  ligne « DSA Active » depuis le 8 juin, mais elle ne suffit pas, chaque app doit repasser par son
  propre « Commencer » (Informations sur l'app → Réglementations et autorisations de l'App Store).
  **Vérifié : ce formulaire ne demande PAS de numéro de TVA** (aucun champ TVA/SIREN sur l'écran
  « Validation des coordonnées », juste adresse, téléphone, e-mail) — un auto-entrepreneur en
  franchise en base peut donc le remplir sans en avoir. Le blocage réel : ces coordonnées sont
  **affichées publiquement** dans l'App Store de certains pays UE, et l'utilisateur ne veut pas y
  mettre son numéro personnel. Solution retenue : obtenir un numéro professionnel/virtuel (ex.
  iGoFlex ~5€/mois, Flexip, Keyyo) avant de reprendre ce point, e-mail déjà réglé
  (`support@mecheapp.com`). **Rien n'a été soumis**, le formulaire vu était vide, aucune donnée
  personnelle n'est partie vers Apple au-delà de ce qui y était déjà (nom/adresse de compte,
  actifs depuis juin, antérieurs à cette session).
- Restent aussi à faire côté Apple, non couverts ici : classifications par âge, questionnaire App
  Privacy, droits relatifs au contenu.
- **L'offering RevenueCat du Pro a pour identifiant littéral `current`** (nom d'affichage « Mèche Pro
  - Le Studio »), alors que `current` est aussi le nom du *statut* d'une offering, et que c'est
  `default` (les packs de crédits B2C) qui porte ce statut.
  **CE PIÈGE A CASSÉ L'ACHAT PRO EN PROD (30/07), et ce doc affirmait le contraire.** La version
  précédente disait « sans conséquence tant que le code achète par identifiant de produit
  (`purchaseProduct(PRO_PRODUCT_ID)`) » : c'était une **déduction, pas une vérification**, et elle
  était fausse. `purchaseProduct` lit `offerings.current`, donc le SDK renvoyait l'offering au
  *statut* current (`default` = crédits B2C), y cherchait `meche_pro_monthly`, ne le trouvait
  jamais, et renvoyait `product_not_found`. Symptôme : « Achat impossible, réessaie. »
  Correctif appliqué **dans le code** : `lib/purchases.ts` cherche désormais le produit dans
  **toutes** les offerings (`offerings.all`, helper `allPackages`), pour `purchaseProduct` comme
  pour `getStorePrices`. Avantage : ça ne dépend plus d'un réglage de dashboard.
  **L'identifiant `current` de cette offering est DÉFINITIF** : le champ est grisé dans RevenueCat
  (« Used to access the offering via the SDK, cannot be changed later »). Ne pas perdre de temps à
  vouloir le renommer, ce n'est pas possible. Il faut vivre avec la collision de noms.
  **Correction d'une analyse fausse faite le 30/07** : on a d'abord cru que consolider le produit
  Pro dans `default` casserait le B2C, au motif que StoreKit ne peut pas résoudre un produit d'un
  autre bundle. **C'est faux.** Un package RevenueCat mappe **un produit par app** (« You can only
  select one product per app ») : le package Pro affiche « No product » pour `meche (App Store)` et
  `meche (Play Store)`, donc l'app B2C ne le voit simplement pas. Consolider serait donc
  techniquement viable. Ça n'a pas été fait, non par risque technique mais parce que le correctif
  code suffit.
  **La leçon** : un `offerings.current` dans du code partagé entre deux apps qui vendent des
  produits différents est un bug en attente. Chercher par identifiant de produit dans `all`.
  **Le même helper a été porté dans `apps/meche/lib/purchases.ts` (B2C) le 30/07.** Le B2C n'était
  pas cassé : ses packs vivent dans l'offering qui porte le statut `current`, donc il marchait par
  chance, pas par construction. Il suffisait de basculer le statut sur une autre offering, ou d'y
  déplacer un pack, pour casser en prod le chemin d'achat de l'app qui a de vrais payeurs. Vérifié
  au passage : les deux écrans qui consomment `getStorePrices` (`recharge.tsx`, `UnlockSheet.tsx`)
  lisent la map par `product_id` et ne l'itèrent jamais, donc élargir la recherche à toutes les
  offerings ne peut pas leur faire afficher un pack étranger.
- **Le produit Play n'était pas rattaché au package de l'offering Pro** (découvert le 30/07 en
  ouvrant l'écran d'édition). `meche_pro_monthly:monthly` existait bien dans le catalogue et était
  attaché à l'**entitlement**, mais le package `$rc_monthly` avait « No product » pour
  `Mèche Pro (Play Store)` : l'achat Android aurait échoué en `product_not_found` exactement comme
  iOS, correctif code ou pas. Rattaché depuis. **Le check** quand un achat échoue sur une seule
  plateforme : ouvrir l'offering en **édition**, la vue lecture seule ne montre que les produits
  déjà rattachés, donc un trou y est invisible.
- **Un toast déclenché depuis un écran en `presentation: 'modal'` est invisible sur iOS.** Le
  `FeedbackProvider` rend son overlay à la racine de l'arbre, or un modal natif iOS est un autre
  contrôleur de vue : l'overlay passe *derrière*. `packages/ui/src/feedback.tsx` documentait déjà la
  contrainte pour l'action sheet, pas pour le toast, et le paywall est tombé dedans (le message
  d'erreur existait, personne ne le voyait). `app/paywall.tsx` utilise donc `Alert.alert` pour tout
  message affiché *pendant* que le modal est ouvert, et garde le toast pour le seul cas de succès,
  puisque `router.back()` referme le modal juste après.
- **La landing `mecheapp.com` annonce encore « Mèche Pro · Bientôt »** alors qu'elle sert d'URL
  marketing dans la fiche. À corriger avant soumission, sinon la page publique contredit la fiche.

## ✅ Terminé (suite, 29-30/07)
- **Android soumis** : AAB versionCode 3 poussé via `eas submit` sur la piste Tests internes.
  Abonnement `meche_pro_monthly` créé dans Play Console, **29,99 € en France** (prix net saisi à
  24,99 € puis converti TTC par Play, pour matcher exactement le prix Apple — Play calcule les prix
  régionaux hors taxe par défaut, contrairement à Apple qui prend un prix TTC direct : à refaire
  pareil si le prix change un jour). Importé dans RevenueCat côté Play Store, attaché à
  l'entitlement `meche_pro_monthly` (même nom des deux côtés).
- **Fiche Play Store (texte)** : nom, descriptions courte/longue, catégorie « Professionnel »
  (équivalent Play du « Économie et entreprise » d'Apple), coordonnées de contact (e-mail, site).
  Ne manquent que les visuels (icône, captures, bannière 1024×500) : upload manuel navigateur, même
  blocage que pour les captures Apple.
- **Toutes les déclarations de conformité Play faites** : règles de confidentialité, informations
  de connexion (compte démo prod réutilisé), annonces (aucune), classification du contenu IARC
  (catégorie « tous les autres types », contenu généré par IA signalé honnêtement), cible (18 ans et
  plus), sécurité des données (voir détail ci-dessous), applis gouvernementales (non), fonctionnalités
  financières (aucune), santé (aucune).
- **Sécurité des données Play** : nom + e-mail + téléphone (salon, optionnel) + photos (collectées
  **et partagées**, car envoyées à Gemini pour la génération, un vrai tiers au sens de ce formulaire)
  + chiffrement en transit confirmé. Lien de suppression : `mecheapp.com/fr/delete-account`.
  **Point non traité, mineur** : le push token (`devices.expo_push_token`) aurait dû être coché en
  « ID de l'appareil ou autres ID » à l'étape Types de données ; la case cliquée ne s'est pas
  enregistrée avant validation et je ne l'ai pas repris. À corriger un jour en repassant par
  Sécurité des données → Types de données.
- **Test fermé** : un canal « Tests fermés - Alpha » existait déjà (177 pays, une liste de diffusion
  « Testeurs fermés » avec **16 utilisateurs**, au-dessus des 12 exigés par Google) mais sans build
  attaché, donc rien n'avait jamais réellement roulé. Le build versionCode 3 y a été ajouté et
  enregistré. **Il reste à cliquer « Envoyer pour examen »** sur ce canal pour que le compte à rebours
  de 14 jours démarre réellement : tant que ce n'est pas fait, aucun jour ne s'écoule.
- **Identifiant publicitaire (Play)** : déclaré « Oui, utilisé », motif **Analyse** uniquement — en
  anticipation de l'ajout de GA4/Firebase Analytics (même schéma que B2C, voir mémoire
  `conversion-tracking`). Pas de case « Publicité ou marketing » ni « Fonctionnement de l'appli » :
  pas de SDK ads, pas de fonctionnalité coeur qui dépend de l'ad ID.

## ✅ Terminé (suite, 30/07)
- **iOS build `production` réussi** : `ddec3726` (appBuildVersion 4), lancé en interactif par
  l'utilisateur, `eas build --profile production --platform ios`. Précédent essai `762312ea`
  (06/07) avait ERROR, `1bef4ac9` (06/07, build 3) avait FINISHED mais jamais poussé vers TestFlight.
- **`eas submit` iOS réussi** (interactif, après avoir fixé `ascAppId: "6788159734"` dans
  `eas.json` → `submit.production.ios`, sinon `eas submit --non-interactive` échoue en demandant
  soit ce champ, soit une clé API App Store Connect qui ne peut pas se créer en non-interactif).
  Traitement Apple terminé (~15 min), build **1.0.0 (4)** visible dans TestFlight, statut
  « Prêt à soumettre ». **Attaché à la fiche App Store Version 1.0** (section Build) et enregistré.
- **Tous les blocages « Impossible d'ajouter pour vérification » levés** :
  - **Droits relatifs au contenu** : Non (pas de contenu tiers).
  - **Classifications par âge** : questionnaire complet (7 étapes), tout à « Aucun/Non »,
    résultat **4+** sur 172 pays, exceptions Brésil/Corée/Vietnam automatiques.
  - **Confidentialité de l'app** (nutrition label) : politique de confidentialité renseignée en
    FR et EN (`mecheapp.com/{fr,en}/privacy`), 7 types de données déclarés (Nom, e-mail, téléphone,
    photos, identifiant appareil, achats, interaction produit) chacun avec finalité + lien à
    l'identité + suivi (tracking = Non partout), **publié**.
  - **Tarification** : app gratuite (le revenu vient de l'abonnement `meche_pro_monthly`, pas d'un
    prix de téléchargement).
  - Documents de chiffrement : non nécessaires (chiffrement standard HTTPS/TLS uniquement).
  - **Reste seul blocage réel** : le statut commerçant DSA, volontairement en pause (voir plus bas).
- **« Informations utiles à la vérification » remplies** dans App Store Connect (app iOS Version 1.0) :
  identifiants de connexion (`apple-review@mecheapp.com` / mot de passe du compte de démo prod),
  coordonnées de contact reviewer (champ privé, jamais publié — à ne pas confondre avec la fiche DSA
  publique), et remarques expliquant le compte démo (salon prérempli, 3 essais gratuits intacts,
  abonnement `meche_pro_monthly`).

## ✅ Chaîne IAP prouvée de bout en bout sur PROD (30/07)
Premier achat sandbox réussi depuis TestFlight, **toute la chaîne vérifiée maillon par maillon** :
feuille d'achat Apple à 29,99 € → événement RevenueCat `INITIAL_PURCHASE` (`environment: SANDBOX`)
→ webhook « Supabase iap webhook production » **Sent** → ligne `subscriptions` écrite sur le projet
prod (`owner_id`, `rc_product_id = meche_pro_monthly`, `status = active`) → l'app affiche
l'abonnement actif. C'est le vrai jalon : le webhook, l'entitlement et le quota serveur fonctionnent.

- **« Renouvellement demain » en sandbox est NORMAL, ne pas chercher de bug dans le code.** Apple a
  renvoyé `expiration_at_ms` à **+24 h** pour un produit mensuel (`event_timestamp_ms` 1785412722638
  → `expiration_at_ms` 1785499118000, soit 23 h 59 min). `functions/iap-webhook` stocke cette valeur
  **verbatim** (aucun calcul, aucun défaut : voir `index.ts`, `current_period_end`), RevenueCat
  affiche lui-même « renews in 1 day », et l'app ne fait que lire la ligne. Les trois maillons sont
  donc fidèles : la durée artificielle vient d'Apple. En prod, le produit est mensuel, un vrai
  abonné verra +1 mois.
  **Non expliqué (constaté, pas élucidé)** : les deux comptes sandbox sont réglés sur « Renouvellement
  mensuel toutes les 5 minutes » (App Store Connect → Utilisateurs et accès → Sandbox → compte), ce
  qui aurait dû donner +5 min, pas +24 h. Le réglage n'a donc pas été respecté pour cet achat. Sans
  impact sur la prod, **ne pas en faire un sujet** : aucune durée sandbox n'est représentative.
  **À exploiter en revanche** : la compression du temps permet de tester le RENOUVELLEMENT (événement
  `RENEWAL` → `current_period_end` qui avance) sans attendre un mois. C'est le seul moyen de valider
  ce chemin avant la mise en vente.

- **Résiliation : aucune app ne peut annuler un abonnement, seul le store le fait.** Ni StoreKit ni
  Play Billing n'exposent d'API d'annulation, donc le seul « résilier » honnête est un lien sortant.
  `lib/subscription.ts` construit l'URL (`apps.apple.com/account/subscriptions` sur iOS,
  `play.google.com/store/account/subscriptions` sur Android). **Le package Android est lu à
  l'exécution** via `Constants.expoConfig?.android?.package`, jamais codé en dur : il diffère entre
  staging (`com.mechepro.app.staging`) et prod, et un mauvais package ouvre une page cassée — d'où
  le repli sur l'écran générique quand il est indéterminé. Le lien vit à DEUX endroits, et les deux
  comptent : une ligne « Gérer mon abonnement » dans les réglages Salon (visible **seulement si
  abonné**, c'est là qu'on va pour résilier) et un lien cliquable sur le paywall (c'est là que
  regarde le reviewer Apple). Avant le 30/07 il n'y avait qu'un texte statique non cliquable sur le
  paywall, invisible pour un abonné qui n'a plus aucune raison d'ouvrir cet écran.
- **`PRO_PRODUCT_ID` vit dans `lib/subscription.ts`, pas dans la route paywall**, pour qu'un autre
  écran puisse l'utiliser sans importer un module de route. Même chaîne sur les deux stores : c'est
  l'id produit App Store ET l'id d'abonnement Play (le suffixe `:monthly` du base plan n'existe que
  dans l'id composite RevenueCat, jamais dans ce lien).

## Ordre de bataille (mis à jour)
1. Android : uploader icône + captures + bannière sur la fiche Play Store → envoyer le canal
   « Tests fermés - Alpha » pour examen (démarre les 14 jours) → une fois approuvé et le délai passé,
   demander l'accès production.
2. iOS : build `production` (fait, `ddec3726`) → build attaché à la version 1.0 (fait) → tous les
   questionnaires (âge, contenu, confidentialité, tarification) faits (fait) → (en pause) régler le
   statut de commerçant DSA → cliquer « Créer une nouvelle soumission » / « Ajouter pour
   vérification » pour soumettre **app et abonnement ensemble**. C'est le seul clic qui reste côté
   iOS une fois le DSA réglé.
