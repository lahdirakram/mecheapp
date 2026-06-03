# Icône menu Découvrir

_Started 2026-05-29 20:41 UTC_

---

## User

dans l'app b2c la partie decouvrir dans le menu en bas n'as pas de picto et est caché sur cetain ecran ou fond noir il faut corriger ça

## Assistant

_[tool: grep]_

Je vais regarder le fichier pour comprendre le problème.

_[tool: grep]_

_[tool: list_files]_

_[tool: grep]_

_[tool: read_file]_

The content is in JSX files. Let me search there.

_[tool: grep]_

_[tool: read_file]_

The TabBar for Meche B2C is in `meche-shared.jsx` at line 394. Let me read it.

_[tool: grep]_

The explore tab uses icon `sparkle`. Let me check whether `sparkle` is actually defined in `MIcon`.

_[tool: str_replace_edit]_

Found it. The `sparkle` icon is drawn entirely with **stroke lines** (no fillable area). But when a tab is active, `TabBar` renders the icon with `fill={accent}` and `stroke={0}` — which works for closed shapes like the bookmark/pin, but makes the stroke-only sparkle disappear completely. On the Discover/feed screen (dark background, explore active), it vanishes — exactly the bug you're seeing.

The clean fix is to make `sparkle` a closed, fillable star shape so it renders in both states.Now let me verify it renders correctly.

_[tool: done]_

_[tool: fork_verifier_agent]_

C'est corrigé. Le picto « Découvrir » était dessiné uniquement en traits (lignes), mais quand l'onglet est actif la barre le remplit et met l'épaisseur de trait à 0 — ce qui le faisait disparaître complètement, notamment sur l'écran Découvrir à fond noir où cet onglet est toujours actif. Je l'ai remplacé par une étoile pleine qui s'affiche correctement dans les deux états (contour quand inactif, plein quand actif).

## User

Verifier agent check completed

## Assistant

_[tool: grep]_

Good catch from the verifier — the active accent color is near-black ink, invisible on the dark bar. Let me check the palette and fix the active-on-dark color.

_[tool: str_replace_edit]_

I'll make the active color adapt to dark mode using `inkInv` (light) on dark bars.

_[tool: done]_

C'est corrigé en deux points :

1. **Le picto manquant** — l'icône « Découvrir » était dessinée en traits ; remplacée par une étoile pleine qui s'affiche dans les deux états.
2. **Caché sur fond noir** — l'onglet actif utilisait la couleur encre (quasi-noire), invisible sur la barre sombre de l'écran Découvrir. L'état actif passe désormais en clair (`inkInv`) sur fond sombre, donc le picto et le label sont bien lisibles.

