// Image renditions written at generation time. Everything a device downloads is produced here, and
// the guiding rule is that egress is paid per byte while CPU in this function is not: it is always
// cheaper to encode once, well, than to serve a heavy file to every reader.
//
// Gemini returns PNG (~2.1 MB for a portrait). PNG is a format for flat colour and text; on a photo
// it costs about 11x its JPEG equivalent at the SAME resolution for no visible gain (measured on
// production-shaped images). So nothing is ever stored as PNG: the full result is re-encoded, and a
// small thumbnail is written alongside it for grids, which would otherwise pull the full image into
// a 180px box.
//
// ── makeTeaser: the preview delivered for a LOCKED result ────────────────────────────────────────
// It is blurred HERE, on the server, and the clear image never leaves the vault bucket, so the only
// thing that ever reaches a device is this file.
//
// Why the blur is server-side: a client-side blurRadius is a display effect. Anyone able to read the
// app's image cache gets the file underneath it, so delivering a sharp thumbnail and blurring it on
// screen protects nothing. Blur is also destructive in a way downscaling is not: a resize can be
// partly undone by an AI upscaler, an averaged pixel neighbourhood cannot be recovered.
//
// Three lossy steps, in order, each irreversible: downscale to 160px, box blur, JPEG at quality 50.
// The result (~2.6 KB) still shows hair volume, colour and silhouette, which is the whole sales
// pitch ("it worked, look"), while the actual cut and the face detail are gone.
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

const MAX_EDGE = 160;
const BLUR_RADIUS = 5; // at 160px: hides the cut, keeps the silhouette. 8 already kills the hook.
const BLUR_PASSES = 3; // three box passes approximate a gaussian
const JPEG_QUALITY = 50;

/** Full result: the thing the customer paid for, so quality stays high. ~10x lighter than the PNG. */
export const FULL_QUALITY = 88;
/** Grid thumbnail: displayed in boxes 100-180px wide, so 420px covers even a 3x screen. ~18 KB. */
export const THUMB_EDGE = 420;
export const THUMB_QUALITY = 78;
/** Stored selfie: only ever shown as the "before" on a phone screen. Never applied to model input. */
export const SELFIE_EDGE = 1080;
export const SELFIE_QUALITY = 82;

// Decode, optionally downscale to fit `maxEdge`, re-encode as JPEG. Used for both renditions.
export async function encodeJpeg(bytes: Uint8Array, opts: { maxEdge?: number; quality: number }): Promise<Uint8Array> {
  const img = (await Image.decode(bytes)) as Image;
  if (opts.maxEdge) {
    const scale = opts.maxEdge / Math.max(img.width, img.height);
    if (scale < 1) img.resize(Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)));
  }
  return (await img.encodeJPEG(opts.quality)) as Uint8Array;
}

// One separable pass: each pixel becomes the average of its neighbours along a single axis, edges
// clamped. Running it horizontally then vertically, three times over, is the standard cheap
// gaussian approximation (~20 ms at this size).
function blurPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number, vertical: boolean) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = vertical ? x : Math.min(w - 1, Math.max(0, x + k));
        const yy = vertical ? Math.min(h - 1, Math.max(0, y + k)) : y;
        const i = (yy * w + xx) * 4;
        sr += src[i];
        sg += src[i + 1];
        sb += src[i + 2];
        n++;
      }
      const o = (y * w + x) * 4;
      dst[o] = sr / n;
      dst[o + 1] = sg / n;
      dst[o + 2] = sb / n;
      dst[o + 3] = 255;
    }
  }
}

export async function makeTeaser(bytes: Uint8Array): Promise<Uint8Array> {
  const img = (await Image.decode(bytes)) as Image;
  const scale = MAX_EDGE / Math.max(img.width, img.height);
  if (scale < 1) {
    img.resize(Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)));
  }
  const w = img.width;
  const h = img.height;
  const a = img.bitmap as unknown as Uint8ClampedArray;
  const b = new Uint8ClampedArray(a.length);
  for (let p = 0; p < BLUR_PASSES; p++) {
    blurPass(a, b, w, h, BLUR_RADIUS, false);
    blurPass(b, a, w, h, BLUR_RADIUS, true);
  }
  return (await img.encodeJPEG(JPEG_QUALITY)) as Uint8Array;
}
