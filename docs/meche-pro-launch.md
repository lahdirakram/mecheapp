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
- **Statut de commerçant DSA : l'app est déclarée « non-commerçant »** dans Informations sur l'app,
  alors qu'elle vend un abonnement à 29,99 €/mois. Le statut « trader » conditionne la distribution
  dans l'UE et demande une vérification d'adresse et de TVA : c'est une déclaration légale, à faire
  par le propriétaire du compte, pas un champ de métadonnée. **À régler avant la soumission.**
- Restent aussi à faire côté Apple, non couverts ici : classifications par âge, questionnaire App
  Privacy, droits relatifs au contenu.
- **L'offering RevenueCat du Pro a pour identifiant littéral `current`** (nom d'affichage « Mèche Pro
  - Le Studio »), alors que `current` est aussi le nom du *statut* d'une offering, et que c'est
  `default` qui porte ce statut. Sans conséquence tant que le code achète par identifiant de produit
  (`purchaseProduct(PRO_PRODUCT_ID)`), mais ne pas s'y fier pour un futur `getOfferings()`.
- **La landing `mecheapp.com` annonce encore « Mèche Pro · Bientôt »** alors qu'elle sert d'URL
  marketing dans la fiche. À corriger avant soumission, sinon la page publique contredit la fiche.

## Ordre de bataille (mis à jour)
1. ~~Build `production` iOS + Android.~~ Preview vérifié sur device des deux côtés ; build
   `production` Android (AAB) lancé en tâche de fond le 29/07 au soir pour `eas submit`.
2. Android : `eas submit` pousse l'AAB dans Tests internes → créer l'abonnement `meche_pro_monthly`
   (29,99 €) dans Play Console (débloqué dès l'upload) → l'importer dans RevenueCat (app « Mèche Pro
   (Play Store) », aujourd'hui à zéro produit) → **passer en Tests fermés et y ajouter 12 testeurs**,
   c'est ce qui démarre réellement le compte à rebours de 14 jours.
3. iOS : build `production` → upload TestFlight → captures d'écran (`store/listing.md` 9a) →
   renseigner le compte de démo dans « Informations utiles à la vérification » → régler le statut
   de commerçant DSA → soumettre **app et abonnement ensemble**.
