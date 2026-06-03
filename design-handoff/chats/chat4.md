# Design système crédits IA

_Started 2026-05-19 21:22 UTC_

---

## User

il faudra adapté le design apres certaine decision 
- busines model basé sur des credit ia rechargable 
- ajout ecran de login creation de compte a lonboarding 
- apres premier essai si user veux des modif ou des action il est rediriger vers un ecran de recharge de credit ia avec les 3 options 
- la connection se fait sori avec google ou apple ou formulaire email classique il faudra neamoin confirmer l'email si formulaire

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: update_todos]_

Bien reçu. Je résume la nouvelle architecture avant de l'implémenter :

**Décisions à intégrer**
1. Business model basé sur des crédits IA rechargeables (plus de freemium illimité)
2. Onboarding élargi : Welcome → **Auth** (Google / Apple / Email) → **Email signup** + **Confirmation email** → Selfie
3. Après le premier aperçu, toute nouvelle action/modif → écran de **recharge crédits** avec 3 packs
4. Profil revu : balance de crédits + bouton recharge (plus de "premium 7,99€/mois")

Je rajoute un fichier `meche-auth.jsx` pour les nouveaux écrans, mets à jour le profil et le wiring du canvas, et garde la cohérence visuelle (Fraunces, coral, papier).

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Update MUSER to credits model:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now I need to add a few missing icons (apple, google, mail, lock) and create the new screens file:

_[tool: str_replace_edit]_

Now create the new screens file:

_[tool: write_file]_

Now update the profile screen to use the credit model (remove the Premium upsell, replace with credit balance + recharge button):

_[tool: str_replace_edit]_

Now update the customize screen footer text to use credits instead of "tries left this month":

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now wire the new screens into the canvas:

_[tool: str_replace_edit]_

Update section slicing to match new indices:Update the brand note section and add the auth/recharge script tag:

_[tool: str_replace_edit]_

Add the auth script tag to the HTML:

_[tool: str_replace_edit]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Voilà — le canvas Mèche B2C reflète maintenant les 4 décisions :

**Nouveau dans le flow**
- **01b · Compte (choix)** — Apple / Google / Email, avec preuve sociale (12 482 mèches cette semaine), CTA "Me connecter" pour les habitués
- **01c · Email (form)** — Email + mot de passe, jauge de force, CGU
- **01d · Vérification email** — Enveloppe Mèche illustrée, "j'ai cliqué", renvoyer, changer d'adresse
- **10b · Recharge (déclencheur)** — Même écran que la recharge profil mais en mode *low balance* : bandeau noir "Plus de crédits · Recharge pour continuer". C'est là qu'arrive l'utilisateur après son 1ᵉʳ essai s'il veut modifier
- **15 · Recharge (depuis profil)** — Même écran accessible depuis le profil, sans alerte

**Modèle crédit IA — 3 packs**
- Pack Essai · 5 crédits — 4,99 € (1,00 €/crédit)
- Pack Star · 20 crédits — 14,99 € (0,75 €/crédit) *Le plus populaire*
- Pack Pro · 60 crédits — 34,99 € (0,58 €/crédit) *Meilleur rapport*

Paiement Apple Pay (primaire) + carte (secondaire). Mentions "paiement unique · crédits sans expiration · sans abonnement" pour casser la peur de l'abo.

**Profil revu** — Carte sombre avec compteur géant "7 crédits restants" + bouton "Recharger" + grille mini-packs. Plus de Premium 7,99 €/mois.

**Customize** — Footer mis à jour : "Utilise 1 crédit · 7 crédits restants".

**Note de design** — Mis à jour pour mentionner Compte, modèle crédit, 19 écrans.

Prochaines décisions possibles à explorer si tu veux :
- Premier crédit offert vs. essai sans compte ?
- Comportement après partage (les destinataires ont-ils des crédits ?)
- Recharge inline (mini-modal) vs. full-screen — actuellement full-screen, on peut tester l'autre via un Tweak

## User

the tarifs are 4,99 pet 10 ai credits and then 9.99 gives 25 credits and 19.99 gives 60 credits

## Assistant

_[tool: str_replace_edit]_

Tarifs mis à jour :

| Pack | Crédits | Prix | Coût/crédit |
|---|---|---|---|
| Essai | 10 | 4,99 € | 0,50 € |
| Star · *populaire* | 25 | 9,99 € | 0,40 € |
| Pro · *meilleur rapport* | 60 | 19,99 € | 0,33 € |

Visible sur **10b · Recharge (déclencheur)**, **15 · Recharge (profil)** et la grille mini-packs du profil.

## User

pour le feed ai je le droit d'afficher des photo pinterest directement dans mon app est ce quil ya une api pinterest pour faire ça ou pa ?

## Assistant

_[tool: web_search]_

_[tool: web_search]_

Bonne question — réponse honnête, ça va te faire repenser le feed.

## Oui, l'API Pinterest existe — mais elle n'est PAS faite pour ton cas

L'API officielle Pinterest (v5) permet de construire des apps qui créent et gèrent du contenu (Pins, Boards) au nom d'un utilisateur Pinterest authentifié, ou de gérer campagnes pub et catalogues shopping. **Elle n'est pas conçue pour piocher dans le catalogue global de Pinterest et l'afficher comme ton propre feed d'inspiration.**

Et surtout, les règles sont strictes :

- Sauf pour les analytics de ton propre compte, tu ne peux pas stocker les informations obtenues via l'API — tu dois la rappeler à chaque fois
- Tu n'accèdes au compte de quelqu'un qu'avec son autorisation (access token), tu n'utilises ses infos que pour LUI rendre service, et tu ne combines pas ses données avec celles d'autres utilisateurs
- Tu ne peux pas créer de nouveau contenu à partir des Pins pour le distribuer dans ton app

Traduction : **non, tu ne peux pas légalement remplir le feed Mèche avec des photos Pinterest scrapées ou piochées depuis l'API.** Les scrapers non-officiels (genre Apify, GitHub ircham/Pinterest-API) existent, mais violent les ToS — risque de DMCA, blocage de tes serveurs, ou pire pour une vraie boîte avec des utilisateurs payants.

## Ce que tu peux faire à la place

**1. Pinterest "Connect" (légitime, recommandé si tu veux du Pinterest)**
- Bouton "Connecter mon Pinterest" dans l'onboarding ou les paramètres
- L'utilisateur s'authentifie via OAuth
- Tu affiches **ses propres tableaux** (ses inspirations coiffure déjà sauvegardées) dans un onglet dédié
- C'est puissant côté insight : tu sais déjà ce qu'elle aime
- Tu n'as pas le droit de stocker, donc appel API en live à chaque ouverture

**2. Pin embed (le plus simple)**
Si une utilisatrice partage un lien Pinterest, tu peux l'afficher via le widget officiel d'embed Pinterest. Pas d'API, pas d'auth. Mais ça reste un cas par cas, pas un feed.

**3. Pour le feed principal, tu devrais sourcer ailleurs**
- **Unsplash / Pexels API** — gratuit, libre de droits, beaucoup de portraits coiffure
- **Contenu éditorial Mèche** — tu shootes/curates toi-même 200-500 références ; c'est ce que fait Glamify, Hairfinder
- **Coiffeurs partenaires B2B** — chaque salon uploade 5-10 réalisations dans l'app pro → ça nourrit ton feed ET ça connecte direct coupe → coiffeur (cohérent avec ton positionnement "le coiffeur, pas le salon")
- **User-Generated** — tes utilisatrices partagent leurs résultats IA → ça devient le feed pour les suivantes
- **IA générative** — tu génères toi-même des références esthétiques

## Ma reco design pour Mèche

Le feed actuel mélange déjà inspiration et résultats. Je transformerais ça en **trois sources clairement labélisées** :
- `· STUDIO MÈCHE` → contenu éditorial
- `· CHEZ [NOM SALON]` → réalisations coiffeurs partenaires (ton pont B2B 💪)
- `· @camille.r` → résultats partagés par la commu

Ça renforce ton positionnement ("qui coupe, pas où") au lieu d'être un Pinterest-bis qui se ferait taper sur les doigts.

Tu veux que je mette à jour le feed pour refléter cette structure 3-sources ?

## User

donc dans un seul feed on aa 3 soruces (internet, salon, user) c'est ca ?

## Assistant

Exactement — **un seul feed unifié**, mais chaque carte porte un petit badge qui dit d'où ça vient. C'est ça qui fait la différence avec un Pinterest-bis.

**3 sources, 1 expérience :**

| Source | Badge | C'est quoi | Action |
|---|---|---|---|
| 🎨 **Studio Mèche** | `· STUDIO` | Contenu éditorial curé par ton équipe (shoot pro, IA, références mode) | "Essayer ce look" |
| ✂️ **Coiffeurs partenaires** | `· CHEZ [NOM]` | Vraies réalisations uploadées par les salons B2B | "Essayer ce look" + lien direct vers le salon (réservation 1 tap) |
| 👤 **Communauté** | `· @camille.r` | Résultats IA + photos après coupe partagés par les users | "Essayer ce look" + voir le profil |

**Pourquoi un seul feed et pas trois onglets séparés ?**
- L'utilisatrice ne pense pas "je veux du contenu salon vs user", elle pense "je veux m'inspirer"
- L'algo de reco peut mixer intelligemment selon ce qu'elle aime
- Ça crée une dynamique virtueuse : un coiffeur upload → des users essaient via IA → certaines réservent → elles repartagent → ça redonne du contenu au feed

**Les filtres en haut** (Pour toi / Suivis / Tendances) peuvent quand même filtrer par source si elle veut zoomer, par exemple :
- "Pour toi" = mix algorithmique des 3
- "Suivis" = uniquement salons et users qu'elle suit
- "Tendances" = ce qui cartonne cette semaine, toutes sources

Je le mets à jour dans le design ? Je modifie la carte feed pour afficher le badge source bien visible, et j'ajoute une variante avec un salon partenaire qui montre comment ça connecte au flux de résa.

## User

ok

## Assistant

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now register the variants and add them to the canvas:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: done]_

Voilà — un feed, trois sources, chacune distincte mais cohérente.

**Section "Inspiration" → 3 variantes du feed à comparer côte-à-côte :**

| Écran | Source | Signature visuelle | CTA secondaire |
|---|---|---|---|
| **04 · Feed — Studio** | `· STUDIO MÈCHE` + icône sparkle coral | Marque "Édition Été 26" | Bookmark |
| **04b · Feed — Salon** | `· CHEZ ATELIER BONAPARTE` + pin vert + badge **96% pour toi** | Quartier visible | **Réserver** (coral) — réservation directe |
| **04c · Feed — Commu** | `· @léa.dpt` + user bleu | "A essayé · gardé en mèche" | Voir profil |

**Mécaniques clés**
- **Pill source unifiée** : icône colorée + label mono + sous-titre contextuel. Même grammaire, 3 couleurs (coral / vert / bleu) pour reconnaître la source au premier coup d'œil
- **Filtres top** mis à jour : *Pour toi* (mix algo) · *Studio* · *Salons* · *Commu* — l'utilisatrice peut zoomer sur une source si elle veut
- **Le badge "% pour toi"** apparaît uniquement sur les cartes salon (basé sur la coupe générée → match algorithmique avec les coupes que ce coiffeur réalise)
- **CTA contextuel** : "Réserver" sur salon = la boucle vertueuse B2B → B2C en 1 tap

Note légale : zéro contenu Pinterest scrapé, tout est sourcé proprement (contenu propriétaire / partenaires B2B / UGC consenti) → safe pour App Store et conforme RGPD.

