// Turn a picked File into the base64 JPEG that `generate` expects.
//
// Two things are always true of what we send: it is JPEG, and it is small.
//
// ALWAYS JPEG. Whatever the visitor picks (HEIC-turned-PNG from a Mac, a 20 MB PNG screenshot) is
// re-encoded here. PNG is the pathological case: a phone-resolution PNG is many megabytes for the
// same picture, and it is the single easiest way to blow the server's payload ceiling.
//
// ALWAYS SMALL. `generate` caps the DECODED payload (7 MB), and base64 inflates by a third on the
// wire, so an untouched phone photo is both a likely rejection and a pointless upload on mobile
// data. A 1600px JPEG at q0.9 lands around 0.3-1.5 MB, an order of magnitude under the cap.
// SAFE_BYTES below is a belt-and-braces guard for the rare very noisy image.
//
// 1600px is deliberate, not arbitrary: this is the image Gemini actually sees, and the repo's rule
// is that the STORED selfie may be shrunk but the MODEL INPUT may not. Lowering it degrades the
// product itself.
const MAX_EDGE = 1600;
const QUALITY = 0.9;
/** Comfortably under the server's decoded cap, leaving room for base64 inflation. */
const SAFE_BYTES = 4 * 1024 * 1024;
/** Tried in order if the first encode somehow lands above SAFE_BYTES. */
const FALLBACK_QUALITY = [0.75, 0.6];

/** Same allowlist as the server, so a bad pick fails here instead of after an upload. */
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type PreparedSelfie = {
  /** Bare base64, no data: prefix — what `generate` wants in `selfieBase64`. */
  base64: string;
  mimeType: 'image/jpeg';
  /** Object URL for showing the "before" locally. Caller must revokeObjectURL when done. */
  previewUrl: string;
  /** The prepared bytes, kept so the draft store can persist them across an OAuth redirect. */
  blob: Blob;
};

export class ImageError extends Error {}

export async function prepareSelfie(file: File): Promise<PreparedSelfie> {
  if (!ALLOWED.has(file.type)) {
    throw new ImageError('Format non reconnu. Choisis un JPG, un PNG ou un WebP.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError("Cette image n'a pas pu être ouverte. Essaie une autre photo.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError("Ton navigateur n'a pas pu préparer l'image.");
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const encode = (q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', q));

  let blob = await encode(QUALITY);
  if (!blob) throw new ImageError("Ton navigateur n'a pas pu préparer l'image.");
  // Only ever runs for an unusually noisy image; normal photos clear SAFE_BYTES on the first pass.
  for (const q of FALLBACK_QUALITY) {
    if (blob.size <= SAFE_BYTES) break;
    const smaller = await encode(q);
    if (smaller) blob = smaller;
  }

  return selfieFromBlob(blob);
}

/**
 * Rebuild a PreparedSelfie from bytes that were ALREADY prepared (a restored draft).
 * Deliberately does not re-encode: a second downscale-and-JPEG pass would soften the image the model
 * sees, for nothing.
 */
export async function selfieFromBlob(blob: Blob): Promise<PreparedSelfie> {
  return {
    base64: await blobToBase64(blob),
    mimeType: 'image/jpeg',
    previewUrl: URL.createObjectURL(blob),
    blob,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ImageError("La lecture de l'image a échoué."));
    reader.onload = () => {
      const url = String(reader.result);
      const comma = url.indexOf(',');
      // Strip the `data:image/jpeg;base64,` prefix. The server tolerates it, but sending bare
      // base64 keeps the payload honest about its own size.
      resolve(comma === -1 ? url : url.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}
