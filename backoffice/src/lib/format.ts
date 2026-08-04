const INT = new Intl.NumberFormat('fr-FR');
const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const USD = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' });
const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });
const DATETIME = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export const fmtInt = (n: number | null | undefined) => INT.format(n ?? 0);

/** Les montants circulent en centimes jusqu'à l'affichage. */
export const fmtEurCents = (cents: number | null | undefined) => EUR.format((cents ?? 0) / 100);

/** Les coûts IA circulent en micro-USD (ai_calls.cost_micro_usd), la devise de la facture Google. */
export const fmtUsdMicro = (microUsd: number | null | undefined) => USD.format((microUsd ?? 0) / 1e6);

// Un appel isolé vaut quelques centièmes de cent : 2 décimales aplatiraient tout à « 0,04 $US ».
const USD_FINE = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Coût d'UN appel / d'UNE ligne d'activité : 4 décimales pour rester lisible à cette échelle. */
export const fmtUsdMicroFine = (microUsd: number | null | undefined) =>
  USD_FINE.format((microUsd ?? 0) / 1e6);

export const fmtPct = (num: number, den: number, digits = 1) =>
  den > 0 ? `${((num / den) * 100).toFixed(digits).replace('.', ',')} %` : '—';

export const fmtDate = (iso: string | Date | null | undefined) =>
  iso ? DATE.format(new Date(iso)) : '—';

export const fmtDateTime = (iso: string | Date | null | undefined) =>
  iso ? DATETIME.format(new Date(iso)) : '—';

/** « il y a 3 j », pour la colonne date du tableau. */
export function fmtAgo(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  const months = Math.round(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.round(months / 12)} an${months >= 24 ? 's' : ''}`;
}

/** Raccourci d'UUID pour les colonnes étroites. */
export const shortId = (id: string) => `${id.slice(0, 8)}…`;
