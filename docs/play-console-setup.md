# Mèche — travail de mise en ligne à faire (Apple + Google + RevenueCat)

**But :** activer les **achats intégrés (IAP)** et pouvoir tester les achats. Pas besoin de
publier en production : un canal de **test** suffit. Les comptes (Apple Developer, Google Play,
RevenueCat) existent déjà.

**Infos fixes**
- Nom de l'app : **Mèche**
- Identifiant (bundle iOS / package Android) : **`com.meche.app`**
- Fichiers de build (`.aab` Android / build iOS) : fournis séparément
- Produits intégrés (**consommables**), **mêmes identifiants sur les deux stores** :
  | Identifiant | Prix | Libellé |
  |---|---|---|
  | `meche_credits_taste` | 0,99 € | Mèche 5 essais |
  | `meche_credits_star` | 2,99 € | Mèche 20 essais |
  | `meche_credits_pro` | 5,99 € | Mèche 50 essais |

> Ordre conseillé : **1) Apple** et **2) Google** (créer les produits), puis **3) RevenueCat**
> (qui lit les produits des deux stores). À la fin, **me transmettre les 2 clés SDK RevenueCat**.

---

# 1) Apple — App Store Connect

1. **Contrat « Applications payantes »** : App Store Connect → *Accords, taxes et services
   bancaires* → signer le contrat **Paid Apps** + renseigner les infos bancaires et fiscales.
   **Bloquant** : les IAP ne fonctionnent pas tant que ce n'est pas actif.
2. **Identifiant d'app** : *Certificates, Identifiers & Profiles* → Identifiers → + → App ID →
   `com.meche.app`, et **activer la capacité In-App Purchase**.
3. **Créer l'app** : App Store Connect → Apps → + → iOS, nom **Mèche**, bundle `com.meche.app`,
   langue principale **Français**, SKU libre (ex. `meche-001`).
4. **Créer les 3 achats intégrés (Consommables)** : App → *Monétisation → Achats intégrés* → + →
   **Consommable**, avec les identifiants/prix du tableau. Pour chacun : nom affiché, description,
   **capture d'écran de revue** (obligatoire), prix. État **« Prêt à envoyer »**.
5. **Clé API App Store Connect (pour RevenueCat)** : *Utilisateurs et accès → Intégrations →
   Clés API* → générer une clé (rôle **App Manager** / accès achats intégrés) → **télécharger le
   fichier `.p8`** et noter le **Key ID** + l'**Issuer ID**. (RevenueCat en a besoin pour valider
   les reçus Apple.)
6. **Testeur Sandbox** : *Utilisateurs et accès → Testeurs Sandbox* → créer un compte de test
   (une adresse e-mail **non liée** à un Apple ID existant). Sert à acheter gratuitement en test.

---

# 2) Google — Play Console

## 2a. Contenu de l'application
*Règles et programmes → Contenu de l'application* :
1. **Fonctionnalités financières** → « Mon appli ne propose aucune de ces fonctionnalités » (les
   crédits ne sont PAS des fonctionnalités financières ; ça vise banque/crédit/crypto).
2. **Santé** → aucune fonctionnalité de santé.
3. **Autorisations photos / vidéos** → l'app demande l'accès aux images car l'utilisateur peut
   **importer une photo de sa galerie pour essayer une coupe**. Décrire exactement ça.
4. **Politique de confidentialité** → coller l'**URL** d'une page (texte en annexe, à héberger).
5. **Accès à l'application** → l'app **nécessite une connexion** : fournir un **compte de test**
   (email + mot de passe).
6. **Publicités** → « Non, pas de publicités » (pour l'instant).
7. **Classification du contenu** → remplir le questionnaire (utilitaire / style de vie).
8. **Public cible** → adultes, **pas destiné aux enfants**.
9. **Sécurité des données** → déclarer : **Photos** (selfies/images, pour générer les coupes),
   **e-mail/identifiants** (authentification) ; chiffré en transit ; suppression possible.
10. **Appli d'actualités** → Non. **COVID-19** → Non.

## 2b. Fiche Play Store principale
*Développer la présence → Fiche Play Store principale* :
- **Nom** : Mèche
- **Description courte** (≤ 80) :
  > Essaie une nouvelle coupe sur ta photo grâce à l'IA, avant d'aller chez le coiffeur.
- **Description complète** :
  > Mèche te montre la coupe avant la coupe. Prends un selfie ou importe une photo, choisis un
  > style, et l'IA génère un aperçu réaliste sur ton propre visage. Garde tes essais préférés,
  > compare l'avant/après, et trouve le coiffeur qui peut le réaliser.
  >
  > • Des dizaines de coupes et de couleurs en quelques secondes
  > • Des aperçus réalistes générés par IA sur ta photo
  > • Sans abonnement : des crédits, seulement quand tu veux
  > • Tes photos restent privées
- **Graphismes** : icône **512×512**, image de présentation **1024×500**, **≥ 2 captures** de
  téléphone.

## 2c. Canal de test interne
*Tests → Test interne* :
1. **Créer une release** → importer le **`.aab`**.
2. Nom : `1.0.0 (2) – test interne`.
3. **Testeurs** → créer une liste d'emails (dont le tien). (Le test interne ne demande pas de
   pays/régions.)
4. **Publier** la release sur ce canal.

## 2d. Produits intégrés
*Monétiser → Produits → Produits intégrés* :
1. Créer les **3 produits** (identifiants/prix du tableau) et les **activer**.
2. *Configuration → Test de licence* → ajouter les comptes testeurs (achat gratuit en sandbox).
3. **Compte de service Google** : pour que RevenueCat valide les achats Android, créer/relier un
   compte de service (Google Cloud) avec accès aux données financières Play, et **télécharger son
   fichier JSON** (RevenueCat décrit la procédure). Le garder pour l'étape 3.

> Les produits intégrés n'apparaissent qu'une fois qu'une release existe sur un canal (faire 2c
> avant 2d).

---

# 3) RevenueCat

1. **Créer un projet** « Mèche ».
2. **+ New app → App Store** : bundle `com.meche.app` → **uploader la clé API App Store Connect**
   (le `.p8` + Key ID + Issuer ID de l'étape 1.5).
3. **+ New app → Play Store** : package `com.meche.app` → **uploader le JSON du compte de service**
   Google (étape 2d.3).
4. **Products** : importer / ajouter les 3 identifiants (`meche_credits_taste`,
   `meche_credits_star`, `meche_credits_pro`) côté iOS et Android.
5. **Offerings** : créer une offering **`default`** → **3 packages**, un produit chacun.
6. **API keys** (Project settings → API keys) : copier les **clés SDK publiques** :
   - Apple : **`appl_…`**
   - Google : **`goog_…`**
   → **à me transmettre.**
7. **Integrations → Webhooks → + New** :
   - **URL** : `https://hqhnvjjbohzktoapsytj.supabase.co/functions/v1/iap-webhook` (backend PROD)
   - **En-tête Authorization** : la valeur de `RC_WEBHOOK_SECRET` (jamais commitée — voir le
     gestionnaire de mots de passe). Définie côté serveur via
     `supabase secrets set RC_WEBHOOK_SECRET=… --project-ref hqhnvjjbohzktoapsytj`.
   - (Bouton « Send test event » → le webhook répond 200, c'est normal.)

---

# À me transmettre à la fin
- ✅ Clé RevenueCat **Apple** (`appl_…`)
- ✅ Clé RevenueCat **Google** (`goog_…`)
- ✅ Confirmation : produits **actifs** sur les 2 stores + **webhook** configuré

Avec ça je branche les clés dans l'app, on rebuild, et on teste un achat sandbox de bout en bout.

---

## Annexe — Politique de confidentialité (à héberger, puis fournir l'URL)

> **Politique de confidentialité — Mèche**
>
> Mèche propose un service d'essai de coiffures par intelligence artificielle.
>
> **Données traitées**
> - **Photos** prises ou importées, et images générées à partir de celles-ci, pour produire vos
>   aperçus de coupe.
> - **Adresse e-mail / identifiants de compte**, pour l'authentification.
>
> **Utilisation** — Vos photos servent uniquement à générer vos aperçus. Elles ne sont ni
> publiques ni vendues. Le traitement IA passe par nos prestataires techniques.
>
> **Conservation / suppression** — Vous pouvez supprimer vos essais à tout moment et demander la
> suppression de votre compte et de vos données.
>
> **Sécurité** — Données chiffrées en transit et stockées de manière privée.
>
> **Contact** — mohamedakram.lahdir@gmail.com — Dernière mise à jour : juin 2026.

(Hébergement simple : page Notion publique, GitHub Pages, ou Google Sites.)
