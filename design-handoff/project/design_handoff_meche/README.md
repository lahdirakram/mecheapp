# Handoff — Mèche & Mèche Pro

> Package de contexte pour implémenter les deux apps dans une vraie codebase via Claude Code.
> Tout le document est en français (langue produit). L'app est bilingue FR / EN — voir « i18n ».

---

## 1. L'idée en une phrase

**Mèche** est une marketplace à deux faces autour de la coiffure : les client·es **voient la coupe avant la coupe** (essayage IA sur leur selfie) puis **trouvent le coiffeur — pas le salon — qui sait la faire**. Les coiffeurs reçoivent ces idées déjà générées, valident, proposent un créneau et montrent le résultat dans le miroir avant de couper.

Le slogan : **« Sois de la mèche »** (*In on it*). Être de mèche = savoir qui coupe.

### Le pont B2B ↔ B2C (c'est le cœur du produit)
La photo qu'une cliente envoie à un coiffeur est **générée dans l'app grand public Mèche**. Côté Pro, cette photo arrive dans une **inbox** avec un **score de match %** et un **dossier automatique** (longueur actuelle, couleur de base, couleur cible, budget estimé). La boucle :

```
B2C : Compte → Découvre (feed) → Essaie (selfie → IA, 1 crédit) → Garde (mèches) → Réserve un coiffeur
                                                   │
                                                   ▼  (envoi de la photo générée + brief)
B2B : Inbox demande → valide → propose un créneau → Essai Mèche au fauteuil → coupe → portfolio
```

### Deux apps, deux modèles économiques
| | **Mèche** (B2C) | **Mèche Pro** (B2B) |
|---|---|---|
| Cible | Client·es | Coiffeurs / salons |
| Modèle | **Crédits IA rechargeables, sans abonnement** — packs 10 / 25 / 60 (4,99 € / 9,99 € / 19,99 €). 1 essai offert. | **Abonnement mensuel** — Solo 49 € · Salon 89 € · Maison 149 € |
| Killer feature | Essayage IA depuis un selfie | **Essai Mèche au fauteuil** (essais illimités, inclus) |
| Plateforme | iOS (vertical, 402 × 874) | iOS (vertical, 402 × 874) |

---

## 2. À propos des fichiers de design

Les fichiers `.jsx` / `.html` joints **sont des références de design** — des prototypes React (via Babel in-browser) qui montrent l'apparence et le comportement voulus. **Ce ne sont PAS des fichiers de production à copier tels quels.**

La tâche est de **recréer ces designs dans l'environnement cible** (React Native / Expo, SwiftUI, Flutter… selon ce qui existe ou ce qui convient le mieux pour une app iOS), en suivant les patterns et la librairie de composants de cette codebase. Si aucun environnement n'existe encore, **React Native + Expo** est le choix recommandé (app mobile cross-platform, proche du JSX fourni).

Les écrans sont disposés sur un **canvas de design** (composant `DesignCanvas` / `DCSection` / `DCArtboard`) à seule fin de présentation — ce chrome n'est pas à reproduire. De même `ios-frame.jsx` (le cadre d'iPhone) et `tweaks-panel.jsx` (panneau de réglages de la démo) sont des outils de présentation, **pas** des éléments du produit.

## 3. Fidélité

**Hi-fi.** Couleurs, typographie, espacements et interactions sont définitifs. Recréer l'UI au pixel près avec les composants de la codebase cible. Seule exception : les **portraits** sont des placeholders dégradés (composant `MPortrait`, aucun vrai visage) — à remplacer par la vraie caméra / les vraies photos générées.

---

## 4. Design system

### 4.1 Palette (source : `meche-shared.jsx` → `MPAL`)
Identité v2 : **noir & blanc chaleureux + une touche caramel**. Saturation très basse, blancs et noirs légèrement teintés (chauds).

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#FCF8F4` | Fond app (blush white) |
| `paper` | `#FFFFFF` | Carte blanche pure |
| `ink` | `#15110E` | **Le seul vrai noir** — texte, actions, boutons primaires |
| `ink2` | `#3D342B` | Texte secondaire chaud, légendes |
| `mute` | `#8E8580` | Texte tertiaire, captions, mono labels |
| `border` | `#EEE5DE` | Bordures |
| `subtle` | `#F4ECE6` | Remplissage clair chaud |
| `soft` | `#F6E8E0` | Teinte blush douce |
| `inkInv` | `#FCF8F4` | Texte clair sur fond ink |
| `sable` | `#B07F3C` | **Caramel** — la SEULE touche d'accent (highlight, bouton central, trait du logo) |
| `salon` | `#1F8A5B` | Vert sémantique = résultat salon réel / de confiance |
| `community` | `#4A88E0` | Bleu sémantique = contenu communauté / user-generated |

> **Règle accent :** les actions sont en **ink (noir)**, pas en couleur. Le **caramel `#B07F3C`** est réservé au bouton d'action central de la tab bar, au trait de l'accent grave du logo, et aux highlights. Vert et bleu portent un **sens** (source réelle vs communauté) — ne jamais les utiliser en décoration.
>
> Côté Pro, `PPAL` étend `MPAL` : `pro = #15110E` (signature Pro = ink, système unifié), `proSoft = #F2ECE6`, `ok = #1F8A5B`, `warn = #B5482F`, `gold = #B07F3C`.
>
> Helper `pOnDark(accent)` : si l'accent choisi est trop sombre (luminance < 90) sur surface noire, on bascule sur le caramel pour rester lisible.

### 4.2 Typographie
Trois familles (Google Fonts) :

| Rôle | Police | Détails |
|---|---|---|
| **Titres / serif éditorial** | **Fraunces** (B2C+Pro) — *Instrument Serif* dans l'ancien `index.html` | `letter-spacing: -0.02em`, `line-height ~1.05`. Italique pour les accents (« *feed* », « *brief* »). Classe `.serif`. |
| **Corps / UI** | **Geist** | poids 300–700. Police par défaut du `body`. |
| **Labels techniques** | **Geist Mono** | `font-size 9–11px`, `letter-spacing .12–.18em`, UPPERCASE. Classe `.mono`. Sert aux eyebrows, statuts, métadonnées. |

Échelle de titres serif observée : 22 / 24 / 28–30 / 32–34 px. Corps : 12–15 px. Labels mono : 9–11 px.

`::selection { background:#B07F3C; color:#FCF8F4 }`

### 4.3 Le wordmark « Mèche »
Composant `MWordmark` : le mot **mèche** en Fraunces, où l'**accent grave du « è »** est dessiné comme un **petit trait caramel** (`#B07F3C`) incliné à 22°, positionné en absolu sur le « e ». Paramètres : `size`, `color`, `accent`, `italic`. Ne pas utiliser un vrai caractère « è » — c'est un « e » + trait.

Version Pro `PWordmark` : le wordmark + un **badge `PRO`** (Geist Mono, fond ink `#15110E`, texte blanc, `border-radius 4`, `letter-spacing .16em`, légèrement remonté).

### 4.4 Formes & profondeur
- **Border-radius :** boutons & pills `999px` ; cartes `14px` ; tuiles `8–12px` ; grandes images résultat `22px` ; écran dans le cadre `32px`.
- **Tab bar flottante (glass) :** `position:absolute; bottom:18–22; left/right:12–14`, fond `rgba(255,253,249,0.78–0.82)`, `backdrop-filter: blur(24px) saturate(160%)`, bordure `1px rgba(0,0,0,0.06)`, `border-radius:28–30`, ombre `0 8–12px 30–36px rgba(0,0,0,0.12–0.15)`.
- **Ombres :** cartes/images `0 12px 30px rgba(26,18,22,0.18)` ; bouton central caramel `0 10px 24px #B07F3C66, 0 2px 6px rgba(0,0,0,0.25)`.
- **Boutons primaires :** pill plein ink (ou caramel pour l'action « générer »), `padding:14px 22px`, `font-size:15`, `font-weight:600`, texte blanc, icône optionnelle à droite, `gap:8`.

### 4.5 Icônes
Set custom SVG, stroke `1.7`, `viewBox 0 0 24 24`, `linecap/linejoin round` (composant `MIcon`, voir `meche-shared.jsx` pour la liste : heart, bookmark, share, sparkle, compass, home, pin, user, chevrons, plus, check, star, flame, grid, mic, cam, flip, settings, crown, x, arrows, instagram, tiktok, snap, link, calendar, apple, google, mail, lock, zap, coin…). À mapper sur l'icon-set de la codebase (Lucide ≈ équivalent direct pour la plupart).

### 4.6 Tab bars (navigation principale)
**B2C — 4 onglets + bouton central :** `Découvrir` (compass) · `Mes mèches` (bookmark) · **[bouton Mèche central caramel, sparkle, surélevé, label « Essayer » SOUS le bouton]** · `Coiffeurs` (pin) · `Profil` (user). Le bouton central lance le flow selfie → hub.

**Pro — 5 onglets dont central :** `Aujourd'hui` (flame) · `Demandes` (mail, badge non-lus) · **[`Essayer` central caramel, sparkle, surélevé]** · `Agenda` (calendar) · `Salon` (user). Même langage visuel que la B2C (bouton caramel surélevé, label dessous).

---

## 5. Écrans — Mèche (B2C)

402 × 874 px. Source : `meche-app.jsx` (liste + ordre), `meche-screens.jsx`, `meche-inspire.jsx`, `meche-auth.jsx`.

### Onboarding (5 écrans)
1. **Welcome** — wordmark, tagline « Sois de la mèche », sous-titre « Vois la coupe avant la coupe — et trouve qui te la fait », CTA « Entrer » + « J'ai déjà un compte ».
2. **Compte (choix)** — Continuer avec Apple / Google / email. Sans compte, pas de mèches sauvegardées. Mentions CGU.
3. **Email (form)** — champ email + mot de passe (8 car. min), « Créer mon compte ».
4. **Vérif. email** — « Vérifie ta boîte mail », lien envoyé à l'adresse, « J'ai cliqué sur le lien » / renvoyer / changer.
5. **Selfie** *(écran sombre)* — viseur caméra plein écran, masque ovale en pointillés caramel, hint « Lumière naturelle, cheveux dégagés », bouton de capture, flip caméra, grille, « Passer pour l'instant ». (Aussi relançable via le bouton Mèche central.)

### Inspiration — bouton Mèche (selfie → hub) + feed × 3 sources (8 écrans)
6. **Hub Mèche** — après le selfie, « Par où commencer ? · 5 façons de trouver ta prochaine coupe » : Le feed · La galerie · Dis-le (texte/voix) · Règle à la main · L'IA te propose (recommandé). Body réutilisable exposé en `window.MInspireHubBody`.
7. **Feed — Studio** *(sombre)* — feed plein écran façon swipe. Source **Studio Mèche** (éditorial). Carte : nom de coupe, tag (TENDANCE/NOUVEAU…), love count, description, actions like/garder/essayer.
8. **Feed — Salon partenaire** *(sombre)* — même feed, source **salon** (vert), avec **match %** et lieu (« CHEZ ATELIER BONAPARTE · Saint-Germain · Paris 6 »).
9. **Feed — Communauté** *(sombre)* — source **user** (bleu), « @léa.dpt · A essayé · gardé en mèche ».
10. **Galerie** — catalogue par style, filtres : Toutes / Courtes / Mi-longues / Longues / Couleurs / Tendances.
11. **Prompt (txt/voix)** — décrire la coupe en texte, ou dicter (mode écoute « Mèche t'écoute… »).
12. **L'IA propose** — suggestion personnalisée + « Pourquoi ça », « Essayer ça » / « Une autre ».
13. **Réglages manuels** — curseurs Longueur / Couleur / Frange / Mood.

### Aperçu IA + recharge (3 écrans)
14. **Génération** *(sombre)* — loader : portrait scanné, ligne de scan caramel, étapes (ANALYSE DU VISAGE → LECTURE DE L'IDÉE → COMPOSITION → FINALISATION), %, « Mèche s'en occupe… ».
15. **Avant / après** — slider de comparaison draggable (avant/après), nom de la coupe, % match, actions Garder / Partager / Réserver / Ajuster.
16. **Recharge (déclencheur)** — « Plus de crédits · Recharge pour continuer ». Toute action après l'essai gratuit déclenche cet écran.

### Conversion & rétention (5 écrans)
17. **Mes mèches** — grille des coupes gardées, tri Récents / Préférés / Pour cet été ; cœur = aimé, tags (été/audace/pro…).
18. **Coiffeurs** — finder : on trouve **un coiffeur, pas un salon**. Liste avec distance, note, avis, prix (€–€€€€), ouvert/fermé, **match %** calculé sur la coupe générée.
19. **Partage** — partager sur Instagram / TikTok / Snap / copier le lien.
20. **Profil & crédits** — nom, handle, membre depuis, **crédits restants** (ex. 7), dernier pack acheté.
21. **Recharge (depuis profil)** — 3 packs : Essai 10 cr. (4,99 € · 0,50 €/cr) · Star 25 cr. (9,99 € · 0,40 €/cr · « le plus populaire ») · Pro 60 cr. (19,99 € · 0,33 €/cr · « meilleur rapport »). Apple Pay / carte. **Pas d'abonnement.**

---

## 6. Écrans — Mèche Pro (B2B)

402 × 874 px. Source : `meche-pro-app.jsx`, `meche-pro-screens.jsx`, `meche-pro-screens-2.jsx`, `meche-pro-live.jsx`.

### Onboarding Pro (4 écrans)
1. **Welcome Pro** — positionnement différent : « les clients qui savent ». Wordmark + badge PRO.
2. **Crée ton salon** — inscription salon.
3. **Photos & services** — photos du salon, services, horaires.
4. **Abonnement Pro** *(sombre)* — 3 plans : **Solo 49 €** (1 indépendant) · **Salon 89 €** (jusqu'à 5 coiffeurs, *populaire*) · **Maison 149 €** (multi-salons). Voir `PPLANS` pour les perks détaillés.

### Inbox des demandes (4 écrans) — le cœur de l'app
5. **Aujourd'hui** — dashboard : prochains RDV, demandes non lues, stats du jour.
6. **Demandes (inbox)** — liste des demandes : photo IA reçue de la cliente, nom/handle, extrait de message, **score de confiance %**, non-lu. (Données `PDEMANDES`.)
7. **Demande · détail** — la photo générée + **dossier Mèche auto** : longueur actuelle, couleur de base, couleur cible, budget estimé, confiance %.
8. **Réponse au client** — conversation : répondre + proposer un créneau.

### Essai Mèche au fauteuil — ★ KILLER FEATURE (1 écran, flow guidé)
9. **Essai Mèche** — flow interactif en **4 étapes** (détaillé §7). Essais **illimités**, inclus dans l'abo Pro.

### Agenda (2 écrans)
10. **Agenda du jour** — RDV confirmés / en cours (`live`) / en attente (`pending`), horaires, durée, service, coiffeur assigné. (Données `PBOOKINGS`.)
11. **Réservation · détail** — détail d'un RDV + dossier de la cliente.

### Salon (3 écrans) — onglet « Salon »
12. **Salon · accueil** — profil salon, abonnement, **stats** (RDV semaine, revenus, demandes entrantes, conversion, essais Studio du mois — voir `PSTATS`), réglages. Deux cartes mènent à ↓.
13. **Mes réalisations** — le **portfolio** du coiffeur (coupes, loves, nb de réservations générées). (Données `PPORTFOLIO`.)
14. **Page publique** — l'aperçu que voit la cliente côté B2C. Les sous-pages 13 & 14 se ferment pour revenir à l'accueil 12.

---

## 7. ★ Killer feature en détail — « Essai Mèche au fauteuil »

Source complète : `meche-pro-live.jsx` (composant `PScreenEssai`). Un seul écran, une machine à états `step ∈ {selfie, idea, adjust, result}` + overlay `gen` (loader). Header partagé `PStepHeader` : bouton retour, titre « Essai Mèche », compteur mono « ÉTAPE n/4 · NOM », et **4 segments de progression** (remplis en accent caramel jusqu'à l'étape courante). Bouton X = `restart` (retour étape 1).

**Accent du flow = caramel `#B07F3C`** (constante locale `ESS`), même esprit que la B2C.

1. **Étape 1 · Selfie** *(sombre)* — viseur caméra, masque ovale pointillé caramel, « Photo de la cliente · Visage dégagé, face au miroir ». Bouton capture → flash blanc 360 ms → étape 2. Lien « Importer depuis la galerie » saute aussi à l'étape 2.
2. **Étape 2 · Idée** — chip « SELFIE · OK » (check vert). Deux entrées combinables : **(1) prompt** texte (« ce qu'elle te dit ») avec bouton « Dicter » (mic), **(2) galerie** = pioche horizontale dans `PPORTFOLIO` (sélection encadrée caramel + check). « Continuer · réglages ».
3. **Étape 3 · Réglages** — carte avec 3 `PSlider` (Longueur / Volume / Frange, libellés 3 crans) + **5 pastilles couleur** (Noir / Châtain / Caramel / Miel / Blond). Chips « raccourcis » (+2 cm plus court, reflets caramel, frange rideau, −1 ton). CTA caramel « Générer l'aperçu » + « ~ 20 secondes · inclus dans Mèche Pro ».
4. **Loader** *(sombre)* — `PEssaiLoader` : portrait teinté en fond, ligne de scan caramel qui descend, brackets de coin, étapes (FACE ANALYSIS → READING IDEA → COMPOSITION → FINALISING), barre de % (~90 ms/tick), « Mèche s'en occupe… · Montre-lui dans le miroir dans un instant ». À 100 % → étape 4.
5. **Étape 4 · Aperçu** — **slider avant/après draggable** (poignée ronde centrale, labels AVANT/APRÈS, badge mono « GÉNÉRÉ PAR MÈCHE · 96 % MATCH »). Deux options : **Réajuster** (retour à l'étape Idée) · **Refaire** (relance le loader → nouvelle variante). CTA final caramel « Elle valide · on coupe ».

---

## 8. Interactions & comportements transversaux

- **Bouton Mèche central (B2C)** : ouvre un overlay plein écran `selfie → hub` (animation `mSheet` : fade + translateY 14px, 0.28s `cubic-bezier(.2,.8,.2,1)`). Capture = flash blanc 420 ms puis bascule au hub. Croix = ferme.
- **Slider avant/après** : drag souris/touch, position clampée 0.05–0.95, la moitié gauche révèle l'« après » via largeur + overflow hidden, trait blanc + poignée ronde.
- **Sliders de réglage** (`PSlider` / `MSlider`) : valeur 0–1, 3 crans de libellé (`<0.34`, `<0.67`, sinon), poignée ronde blanche avec anneau accent.
- **Loaders** : intervalle ~90 ms, progression non linéaire (ralentit après 80 %), libellé d'étape dérivé du %.
- **Onglet Salon (Pro)** : navigation maître-détail — l'accueil (12) ouvre 13 ou 14 ; ces sous-pages se ferment pour revenir à 12.
- **Modèle de déclenchement crédits (B2C)** : 1 essai offert ; toute action générative ensuite, sans crédit, route vers l'écran Recharge.
- **Statuts de RDV (Pro)** : `confirmed` / `live` (en cours) / `pending` — chacun avec son traitement visuel ; `live` porte un match %.

---

## 9. État (state) à prévoir

**B2C** : compte/auth (apple|google|email + confirmation), crédits restants (int), mèches gardées (liste), source de feed active (studio|salon|user), paramètres d'essai (longueur, couleur, frange, mood, prompt), résultat généré, salon/coiffeur sélectionné.

**Pro** : abonnement (solo|salon|maison), inbox de demandes (avec unread, confidence, dossier), bookings du jour (status), flow d'essai (`step` + `gen` + prompt + pick + 4 sliders + couleur), portfolio, profil/stats salon, badges de navigation (`PNOTIF`).

---

## 10. i18n

Bilingue **FR / EN**, switch par prop `lang`. Dictionnaires complets : `MI18N` (B2C, dans `meche-shared.jsx`) et libellés inline côté Pro. Helper `mt(lang, key)`. FR est la langue par défaut / de référence. Toujours prévoir les deux langues pour chaque chaîne.

---

## 11. Données de démo (à remplacer par l'API)

Toutes les données sont **mockées** dans les fichiers `*-shared.jsx`, à remplacer par de vrais endpoints :
- **B2C** (`meche-shared.jsx`) : `MFEED` (cartes feed multi-sources), `MSALONS` (coiffeurs + match%), `MWARDROBE` (mèches gardées), `MUSER` (profil + crédits), `MPACKS` (packs de recharge).
- **Pro** (`meche-pro-shared.jsx`) : `PDEMANDES` (demandes + dossier + confidence), `PBOOKINGS` (agenda), `PPORTFOLIO`, `PSTYLIST`, `PSALON`, `PPLANS` (abonnements), `PSTATS`, `PNOTIF`.

---

## 12. Fichiers du package

### Points d'entrée (ouvrir dans un navigateur pour voir les designs)
- **`Meche B2C.html`** — canvas des 21 écrans grand public.
- **`Meche Pro.html`** — canvas des 14 écrans coiffeur.
- **`Meche Brand Identity.html`** — système de marque complet (logo, palette, type).

### Code des écrans (références JSX)
| Fichier | Contenu |
|---|---|
| `meche-shared.jsx` | **B2C** : tokens `MPAL`, i18n `MI18N`/`mt`, icônes `MIcon`, `MPortrait`, `MWordmark`, `TopBar`, `TabBar`, données mock. |
| `meche-screens.jsx`, `meche-inspire.jsx`, `meche-auth.jsx` | Écrans B2C. |
| `meche-app.jsx` | Assemblage du canvas B2C (liste + ordre des écrans). |
| `meche-pro-shared.jsx` | **Pro** : `PPAL`, `PWordmark`, `PTabBar`, `PTopBar`, `PPrimary`, `pOnDark`, données mock Pro. |
| `meche-pro-screens.jsx`, `meche-pro-screens-2.jsx` | Écrans Pro. |
| `meche-pro-live.jsx` | **★ Killer feature** « Essai au fauteuil » (`PScreenEssai`). |
| `meche-pro-app.jsx` | Assemblage du canvas Pro. |

### À ignorer (outils de présentation, pas le produit)
`design-canvas.jsx`, `ios-frame.jsx`, `tweaks-panel.jsx` — chrome de démo. `index.html` + `screens.jsx` / `shared.jsx` / `main.jsx` / `screens.jsx` = ancienne itération « Reflet », non canonique.

---

## 13. Pour démarrer (ordre suggéré)

1. Mettre en place le **design system** (tokens couleur, 3 fonts Google, `Wordmark`, `MIcon`→icon-set, boutons, tab bars) comme primitives réutilisables.
2. B2C d'abord : **onboarding → selfie → hub → un chemin d'essai → loader → avant/après**. C'est la boucle de valeur la plus courte.
3. Pro ensuite : **inbox → détail demande → essai au fauteuil** (la killer feature). C'est ce qui différencie le produit.
4. Brancher le **pont** : la génération B2C produit la photo + le brief qui alimentent `PDEMANDES`.
5. Remplacer les `MPortrait` par la vraie caméra / les vraies images, et les mocks par l'API.

> Police, couleurs et copies sont définitives — s'y tenir. En cas de doute sur un écran précis, **ouvrir le `.html` correspondant** : il est interactif et fait foi.
