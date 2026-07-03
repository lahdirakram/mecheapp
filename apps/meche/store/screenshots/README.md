# Captures App Store — Mèche (iOS)

Habillage marketing des captures iPhone -> PNG **1284×2778** (slot 6.7", accepté par App Store Connect).
Multi-langue : une langue = un `captions.<loc>.json` + un dossier `raw/<loc>/` -> `out/<loc>/`.

## Arborescence
```
store/screenshots/
  captions.fr.json   captions.en.json
  raw/fr/  raw/en/    <- dépose ici tes captures iPhone par langue
  out/fr/  out/en/    <- PNG finaux 1284x2778 par langue
  render.mjs
```

## Workflow
1. Capture chaque écran clé sur l'iPhone (build `preview`), dans la bonne langue d'app.
2. AirDrop vers le Mac, dépose dans `raw/fr/` ou `raw/en/`. Les noms doivent matcher le
   `raw` de `captions.<loc>.json` (sinon édite le JSON).
3. Lance le rendu :
   ```bash
   cd apps/meche/store/screenshots
   node render.mjs          # toutes les langues
   node render.mjs en       # anglais seulement
   node render.mjs fr 2 5   # slides 2 et 5 en français
   ```
4. Upload `out/fr/*` et `out/en/*` dans App Store Connect (un jeu par langue de la fiche).

## Personnaliser
- Textes, thème (light/dark), ordre : édite `captions.<loc>.json`.
- `{mot}` dans une accroche = mis en valeur (serif italique caramel).
- `SCREEN_W` dans `render.mjs` = taille du mockup (1020 par défaut ; baisser pour zéro upscaling).
- Une capture absente -> placeholder, pour valider le design sans bloquer.

Apple : 1 capture min, 10 max par langue. Le jeu 6.7" couvre toutes les tailles d'iPhone.
App Store Connect gère un jeu de captures distinct par langue de la fiche (FR, EN, ...).
