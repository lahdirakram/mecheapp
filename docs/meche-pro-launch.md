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

## ⛔️ Bloqué, et par quoi
- **Play : tout**, y compris la simple création de l'abonnement. Les deux écrans (Produits ponctuels
  et Abonnements) n'offrent que « Importer un nouveau APK » : **aucun produit Google ne peut exister
  avant l'upload d'un binaire avec la permission BILLING**. Inutile de planifier le paramétrage
  Google avant d'avoir buildé.
- **Compte développeur personnel** ⇒ Google impose un **test fermé (12 testeurs, 14 jours)** avant
  d'accorder l'accès production. C'est le vrai chemin critique du lancement Android, pas la config.
- **Apple : la fiche App Store 1.0 est vierge** (0 capture, description/mots-clés/URL vides, aucun
  build, aucun compte de démo). Le texte FR + EN est prêt dans `apps/meche-pro/store/listing.md`,
  il reste à le coller, à produire les captures et à créer le compte de démo.
- L'abonnement Apple restera en « Finaliser avant soumission » quoi qu'on fasse : Apple exige que le
  **premier** abonnement d'une app soit soumis **avec un binaire**. Ce n'est pas une erreur de
  configuration, ne pas chercher à la corriger.

## Pièges relevés
- **L'offering RevenueCat du Pro a pour identifiant littéral `current`** (nom d'affichage « Mèche Pro
  - Le Studio »), alors que `current` est aussi le nom du *statut* d'une offering, et que c'est
  `default` qui porte ce statut. Sans conséquence tant que le code achète par identifiant de produit
  (`purchaseProduct(PRO_PRODUCT_ID)`), mais ne pas s'y fier pour un futur `getOfferings()`.
- **Compte de démo obligatoire** : l'app est entièrement derrière un login e-mail. Sans identifiants
  de test, la review Apple rejette. À créer sur la **prod** (le build production tape sur prod), avec
  e-mail confirmé, fiche salon et historique d'essais remplis pour que le reviewer voie l'app pleine.
- **La landing `mecheapp.com` annonce encore « Mèche Pro · Bientôt »** alors qu'elle sert d'URL
  marketing dans la fiche. À corriger avant soumission, sinon la page publique contredit la fiche.

## Ordre de bataille
1. Build `production` iOS + Android (`eas build --profile production --platform all`).
2. iOS : upload → remplir la fiche depuis `store/listing.md` + captures + compte de démo →
   soumettre **app et abonnement ensemble**.
3. Android : upload de l'AAB → créer l'abonnement `meche_pro_monthly` (29,99 €) → l'importer dans
   RevenueCat (app « Mèche Pro (Play Store) », aujourd'hui à zéro produit) → lancer le test fermé.
