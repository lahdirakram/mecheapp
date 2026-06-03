// Brand palette — identity v2: warm black & white + a single caramel accent.
// Source of truth: design_handoff_meche/meche-shared.jsx (MPAL) + meche-pro-shared.jsx (PPAL).
// RULE: actions are ink (black). Caramel `sable` is the ONLY accent (central action button,
// wordmark accent stroke, highlights). `salon` (green) / `community` (blue) carry MEANING
// (real-salon vs user-generated), never decoration.

export const MPAL = {
  bg: '#FCF8F4', // blush white — app background
  paper: '#FFFFFF', // pure white card
  ink: '#15110E', // the ONE true black — text, actions, primary buttons
  ink2: '#3D342B', // secondary warm ink — body copy, captions
  mute: '#8E8580', // tertiary text, mono labels
  border: '#EEE5DE',
  subtle: '#F4ECE6', // light warm fill
  soft: '#F6E8E0', // soft blush tint
  inkInv: '#FCF8F4', // light text on ink
  accent: '#15110E', // editorial: actions = ink/black
  accent2: '#2A2520',
  sable: '#B07F3C', // caramel — the single highlight/accent touch
  sableInk: '#15110E', // text on sable
  bezel: '#15110E',
  // Semantic source colors — meaning, not decoration.
  salon: '#1F8A5B', // green = real / trusted salon result
  community: '#4A88E0', // blue = community / user-generated
} as const;

// Pro palette extends MPAL: Pro signature = ink (unified system), plus status colors.
export const PPAL = {
  ...MPAL,
  pro: '#15110E', // Pro signature = ink
  proSoft: '#F2ECE6',
  ok: '#1F8A5B',
  warn: '#B5482F',
  gold: '#B07F3C', // caramel
} as const;

/**
 * Relative luminance of a #RRGGBB hex (0–255 scale, perceptual weights).
 */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * On a dark surface, a too-dark accent (e.g. ink) is invisible — fall back to caramel.
 * Mirrors `pOnDark` from meche-pro-shared.jsx.
 */
export function pOnDark(accent: string): string {
  return luminance(accent) < 90 ? PPAL.gold : accent;
}

export type Palette = typeof MPAL;
