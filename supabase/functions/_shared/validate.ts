// Server-side validation of a base64 image before we decode / store it / send it to a paid model.
// Rejects oversized payloads, disallowed MIME types and obviously-invalid base64, so a malformed or
// abusive request can't burn memory or AI budget.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Gemini's own per-image input limit is 7 MB, so anything above it is a payload we would pay to
// receive, encode and upload only for the model to reject it. Was 12 MB, i.e. the app accepted
// images the model never would. This is a floor of defence, not the real fix: the ceiling that
// matters is pixel COUNT (imagescript decodes to raw RGBA, so a 48 Mpx photo is a 195 MB bitmap and
// kills the worker regardless of how well it compressed), and that is capped client-side at 1024px
// on the long edge — the size Gemini generates at, so nothing that reaches the result is lost.
// Keep this server-side cap anyway: an old bundle still sends full-resolution photos.
const MAX_BYTES = 7 * 1024 * 1024;

export type ImageInput = { base64: string; mimeType: string };

// Strips a `data:<mime>;base64,` prefix, validates, and returns clean base64 + mime.
// Throws Error('invalid_image:<reason>') on bad input — callers should answer 400.
export function parseImageInput(rawB64: string | undefined, rawMime: string | undefined): ImageInput {
  if (!rawB64) throw new Error('invalid_image:missing');
  let b64 = rawB64;
  let mime = (rawMime || 'image/jpeg').toLowerCase();
  const pfx = b64.match(/^data:(.+?);base64,/);
  if (pfx) {
    mime = pfx[1].toLowerCase();
    b64 = b64.slice(pfx[0].length);
  }
  if (!ALLOWED_MIME.has(mime)) throw new Error('invalid_image:mime');
  if (b64.length < 16 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error('invalid_image:base64');
  const bytes = Math.floor((b64.length * 3) / 4); // base64 → byte size
  if (bytes > MAX_BYTES) throw new Error('invalid_image:too_large');
  return { base64: b64, mimeType: mime };
}
