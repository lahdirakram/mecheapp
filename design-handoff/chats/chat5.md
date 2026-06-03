# Plateforme coiffeurs Mèche

_Started 2026-05-20 21:18 UTC_

---

## User

maintenant je veux que tu me design mèche pro qui est destiné au coiffeur ou ils créé leur salon dans l'app partage leur realisations recoivent des reservation et aussi et ça c'est la feature de ouf c'est qu'il peuvent faire lexperience mèche a leur client en direct dans le salon pour leur montrer a quoi ressemblerer la coupe qui leur propose une autre feature interessante c'est que avant de recevoir une reservation un coiffeur peut recevoir une photo genere par meche d'un client qui demande si c'est possible de le faire et le coiffeur reponds et puis le client reservepar example donc voila plein de features et tout ca sous forme d'abonnement payant mensuel qui est plus cher que l'abonnement client

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Now I have a strong sense of the visual language. Let me look at a few more screens to see the salons/profile patterns I'll need to mirror for the pro app.

_[tool: read_file]_

I have a clear picture. Now let me check the iOS frame and look at one more screen to confirm conventions.

_[tool: update_todos]_

I have everything I need. Let me plan and design Mèche Pro.

**Design plan:**
- Use existing Mèche tokens (paper/coral/Fraunces/Geist) but introduce **plum (#3D2A33)** as the "Pro" accent and a small `PRO` badge on the wordmark to differentiate the B2B app
- New 5-slot tab bar with a central **"Live"** button that triggers the killer in-salon try-on
- 14 screens grouped into 4 sections: Onboarding/Pro paywall · Inbox & booking flow · Live Mèche · Salon/Portfolio
- Tweakable accent + language to match B2C

_[tool: write_file]_

Now the screens — onboarding, paywall, inbox flow, agenda, and salon profile.

_[tool: write_file]_

Now the rest: live mode (killer feature), reply chat, agenda, booking detail, portfolio, public salon page, stats.

_[tool: write_file]_

Now the killer feature — Live Mèche in-salon (3 screens: launcher, AR mirror, library).

_[tool: write_file]_

## User

j'ai chargé des crédit

## Assistant

_[tool: write_file]_

Parfait — je continue avec la coque de l'app et le fichier HTML.

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

**Mèche Pro** — 16 écrans pour les coiffeurs, dans le même langage visuel que Mèche B2C.

**Le système :**
- Badge `PRO` ajouté au wordmark, accent **plum #3D2A33** réservé aux surfaces Pro (vs coral pour le grand public)
- Tab bar à 5 entrées avec **bouton LIVE central** surélevé — c'est l'action signature

**Les 4 sections du canvas :**
1. **Onboarding (4)** — welcome positionné "les clients qui savent", création salon, photos/services, paywall 3 plans (Solo 49€ · Salon 89€ · Maison 149€)
2. **Inbox des demandes (4)** ⭐ — Aujourd'hui, inbox des photos IA reçues, détail avec **Dossier Mèche** (confiance, base/cible, budget), conversation pour proposer un créneau
3. **Mèche en direct (3)** ⭐ killer — launcher avec checklist iPad/lumière + 5 looks pré-chargés, **miroir fullscreen** avec points d'ancrage IA, carrousel et sliders live, bilan post-séance
4. **Agenda & salon (5)** — agenda du jour avec ligne "now", détail RDV, portfolio (galerie + perf), page publique côté cliente, stats du salon

**Le pont B2B↔B2C :** chaque demande affiche un badge `· GÉNÉRÉ PAR MÈCHE` — c'est exactement la photo que la cliente a produite dans l'app grand public, avec son score de match et son brief.

Tweaks dispo : langue (FR/EN), accent, cadre iPhone on/off.

## User

j'ai pas compris meche en direct tu veux faire quoi ?

## Assistant

Bonne question — c'est l'écran que j'ai sans doute le moins bien rendu. Voilà mon idée :

## Le setup physique
La cliente est **assise dans le fauteuil**, devant le miroir du salon. Le/la coiffeur·euse tient son **iPad** (ou il est posé sur un trépied à côté du miroir). La caméra de l'iPad **filme la cliente en direct** — son vrai visage, ses vrais cheveux.

## Ce que fait l'app
L'IA Mèche **superpose en temps réel** différentes coupes sur la tête de la cliente (comme un filtre AR). La cliente se voit elle-même avec :
- la coupe qu'elle avait réservée
- 4 autres propositions du coiffeur
- des **ajustements live** : 2cm plus court, balayage plus chaud, frange rideau…

Le coiffeur swipe pour changer de coupe, la cliente voit le résultat avant qu'on touche aux ciseaux.

## Les 3 écrans
1. **Launcher** — checklist avant de lancer (iPad connecté, lumière, looks pré-chargés)
2. **Miroir live** — l'écran fullscreen avec le visage de la cliente + l'IA dessus + les contrôles
3. **Bilan** — quand elle dit "OK celle-là", on capture, on note les ajustements, on coupe

## Pourquoi ça vend l'abonnement
Le coiffeur **réduit massivement les regrets** ("tu m'avais dit que ça irait…"). La cliente arrive avec une demande, repart avec une coupe qu'elle a *vue* avant.

---

Le problème avec mon écran actuel : je l'ai dessiné comme un téléphone avec un portrait en arrière-plan, on ne sent pas le côté "AR live sur visage réel". 

**Tu veux que je refasse l'écran miroir** pour qu'on comprenne mieux que c'est :
- (a) une vue caméra en direct sur le visage de la cliente,
- (b) avec la coupe superposée en AR,
- (c) projetée aussi sur le grand miroir du salon ?

Ou peut-être un écran **avec le grand miroir du salon dessiné en contexte**, pour qu'on voie la scène entière (cliente + iPad + miroir) ?

## User

l'ar c'est pa ouf moi je voulais dire que dans cette option est faisable pour les client qui arrive chez le coifferu sasn avoir reservé via mèche et du coup le coifeir leur faire lexperience avant la coupe

## Assistant

_[tool: write_file]_

Ahhh ok je vois — beaucoup mieux comme idée. Donc :

- **Pas d'AR** (j'enlève les points sur le visage, le "miroir partagé", etc.)
- C'est **la même expérience que l'app B2C grand public** (selfie → essais IA)
- Sauf que c'est **le coiffeur qui la fait tourner sur sa tablette/son tel**, pour une cliente **qui débarque sans avoir réservé via Mèche**
- Use case : la cliente arrive, le coiffeur dit *"viens, on essaie 4-5 trucs avant de couper"*
- Les essais sont **illimités** sur l'abonnement Pro (c'est un argument de vente)

Je refais les 3 écrans dans ce sens.

_[tool: str_replace_edit]_

Et je relabellise la section pour que ça reflète bien le use case "walk-in".

_[tool: str_replace_edit]_

_[tool: done]_

Voilà, j'ai refait les 3 écrans dans le bon sens :

## Nouveau cadrage « Essai Mèche au fauteuil »

**Écran 1 — Setup** 
- Reframé : *« Elle débarque sans idée précise. Tu lui en montres 5. »*
- Choix : **nouvelle cliente walk-in** (sélectionné par défaut, en plum) vs. cliente existante
- La cam pour prendre la photo de la cliente (ovale de cadrage, pas de masque AR)
- Contexte facultatif en 2 mots ("changement radical", "mariage", etc.)
- Bandeau « ∞ inclus · essais illimités » pour bien vendre l'argument abonnement

**Écran 2 — Choix** (l'écran que le coiffeur tend à la cliente)
- Image plein écran de la **génération Mèche sur sa photo** (pas d'AR, c'est un portrait IA comme dans le B2C)
- Petit pavé en haut à gauche *« à partir du selfie · 14:32 »* — preuve que c'est bien elle
- Carrousel horizontal des **5 essais** en bas, le sélectionné en coral avec coche
- « Ajuster » + « On part sur celle-ci »
- J'ai viré tout le baratin AR (face dots, miroir partagé, sliders « + chaud »…)

**Écran 3 — Brief avant la coupe**
- Avant/après split de ce qu'elle a choisi
- Les 6 autres essais en mini-rouleau (pour le dossier)
- Brief texte qui devient l'instruction de coupe
- 3 actions : envoyer la photo à la cliente · créer sa fiche · ajouter au portfolio

Le pitch côté commercial est plus simple maintenant : **« 96% de tes clientes n'utilisent pas Mèche. Avec l'abo Pro, tu leur fais l'expérience quand même. »**

## User

pas sure en gros moi je voyais ca comme la version coté cleint mais qui est piloté par le coiffeur donc selfie prompt ou galerie (du coiffeur du coup) et puis ajustement manuel et puis generation

## Assistant

_[tool: grep]_

OK je comprends mieux — c'est littéralement le flow de l'app cliente (selfie → prompt/galerie → réglages → génération), mais sur la tablette du coiffeur, avec **la galerie du coiffeur** au lieu de la galerie publique. Je vais m'aligner sur les écrans de l'app B2C.

_[tool: read_file]_

_[tool: grep]_

_[tool: write_file]_

OK je rebuilds les 3 écrans dans ce flow : **selfie → entrée (prompt ou galerie coiffeur) → réglages → génération**.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

Voilà — exactement le flow de l'app cliente, version coiffeur :

**Écran 1 · Selfie + point de départ**
- Selfie de la cliente déjà cadrée en haut (refait si besoin)
- **Prompt** — zone "dis-le simplement", le coiffeur transcrit ce qu'elle raconte (curseur clignotant en plum)
- **Galerie du coiffeur** — les 24 looks du portfolio scrollables, sélection plum sur le 1er
- Lien discret « ou aller direct aux réglages »

**Écran 2 · Réglages manuels**
- Base = selfie + look choisi de la galerie (avec mini badges `SELFIE` + `GALERIE`)
- Bandeau « ce qu'elle t'a dit » (le prompt transcrit, avec bouton "ré-écouter")
- **4 sliders** comme dans la version cliente : longueur, volume, frange, couleur (5 swatches)
- **Presets coiffeur** en chips : "+ 2 cm plus court", "reflets caramel"…
- CTA dégradé coral→plum **« Générer l'aperçu »** + indication "inclus dans Mèche Pro"

**Écran 3 · Aperçu généré**
- Grand **slider avant/après** drag-and-drop (380px de haut)
- Chips d'itération : "une autre variante", "re-régler", "côté", "+ frange"
- CTA primaire **« Elle valide · on coupe »** puis envoyer à la cliente / garder
- Encart plum **brief avant la coupe** — devient l'instruction technique

C'est littéralement Mèche grand public dans les mains du coiffeur, avec sa propre galerie comme catalogue. Cohérent avec l'app cliente, et ça vend l'abonnement (essais illimités).

