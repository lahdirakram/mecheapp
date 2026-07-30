// Réduction du selfie AVANT l'envoi au serveur.
//
// Pourquoi 1024 : `gemini-2.5-flash-image` GÉNÈRE au maximum 1024px de côté long (vérifié sur la
// doc Google, entrée plafonnée à 7 Mo/image). Tout pixel au-delà est jeté par le modèle avant même
// qu'il ne dessine : envoyer 4032x3024 ne peut donc pas produire un résultat plus détaillé qu'un
// 1024. C'est ce qui lève la tension avec la règle « ne jamais dégrader `modelB64` » de CLAUDE.md,
// qui reste valable pour tout ce qui se situe SOUS ce plafond.
//
// Ce que ça corrige vraiment : `expo-camera` et `expo-image-picker` ne savent pas redimensionner,
// ils n'exposent qu'une qualité JPEG. On envoyait donc la pleine résolution du capteur. Côté
// serveur, imagescript décode en bitmap BRUT pour produire la vignette : 12 Mpx = 49 Mo, 48 Mpx =
// 195 Mo, contre ~256 Mo par isolate Edge. Au-delà, le worker est TUÉ (pas d'exception, donc aucun
// catch ne s'exécute). C'est ce qui a fait perdre son crédit unique à cinq nouveaux utilisateurs en
// prod avant 0030. 0030 rend cette mort inoffensive pour le portefeuille ; ceci l'évite tout court.
// Bonus non négligeable : ~1,5-3 Mo -> ~150-250 Ko, soit un upload ~10x plus court en 4G, sur
// l'écran exact où ces utilisateurs abandonnaient.
//
// NOTE: `manipulateAsync` est DÉPRÉCIÉ en SDK 56. L'API courante est contextuelle et chaînée
// (`ImageManipulator.manipulate(...).resize(...).renderAsync()`), voir
// https://docs.expo.dev/versions/v56.0.0/sdk/imagemanipulator/
//
// Copie jumelle dans apps/meche/lib/selfie.ts. Les deux DOIVENT rester identiques : c'est le
// même modèle derrière, donc le même plafond. Si elles divergent, sortir le helper dans packages/
// (pas dans `@meche/core`, qui s'interdit tout import React Native).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Côté long maximum envoyé au serveur. = la résolution de sortie du modèle, donc sans perte utile. */
export const SELFIE_MAX_EDGE = 1024;

/** Haute qualité : on vient de retirer les pixels inutiles, ce n'est pas le moment d'ajouter du bruit. */
const SELFIE_COMPRESS = 0.9;

export type Selfie = { base64: string; mime: string };

/**
 * Ramène `uri` à {@link SELFIE_MAX_EDGE} sur son côté long et renvoie le JPEG en base64.
 *
 * `width`/`height` viennent de l'appelant (`takePictureAsync` et `ImagePicker` les fournissent
 * tous les deux) : ils servent à savoir QUEL côté contraindre. Passer `width: 1024` sur un portrait
 * donnerait 1024 de large et ~1365 de haut, donc au-dessus du plafond. L'autre côté est laissé à
 * `null` pour que le ratio soit conservé.
 *
 * Ne redimensionne JAMAIS vers le haut : une photo déjà sous le plafond est seulement ré-encodée.
 * Dimensions inconnues -> pas de redimensionnement (on ne peut pas savoir si on agrandirait) ; le
 * plafond serveur de 7 Mo reste le filet.
 */
export async function shrinkSelfie(uri: string, width?: number, height?: number): Promise<Selfie> {
  const ctx = ImageManipulator.manipulate(uri);
  const w = width ?? 0;
  const h = height ?? 0;
  if (Math.max(w, h) > SELFIE_MAX_EDGE) {
    ctx.resize(w >= h ? { width: SELFIE_MAX_EDGE, height: null } : { width: null, height: SELFIE_MAX_EDGE });
  }
  const out = await (await ctx.renderAsync()).saveAsync({
    format: SaveFormat.JPEG,
    compress: SELFIE_COMPRESS,
    base64: true,
  });
  if (!out.base64) throw new Error('shrinkSelfie: no base64');
  return { base64: out.base64, mime: 'image/jpeg' };
}
