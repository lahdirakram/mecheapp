/** Construit une query string en repartant des paramètres courants. Pur : serveur et client. */
export function withParams(
  current: Record<string, string>,
  overrides: Record<string, string | number | undefined | null>,
): string {
  const sp = new URLSearchParams(current);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === null || v === '') sp.delete(k);
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Aplatit les searchParams de Next (string | string[] | undefined) en Record<string, string>. */
export function flatten(sp: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined) out[k] = val;
  }
  return out;
}

export function readInt(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(v ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
