// Typography — three families (loaded via @expo-google-fonts in packages/ui).
//   Fraunces      → editorial serif titles (.serif), letter-spacing -0.02em, line-height ~1.05
//   Geist         → body / UI, weights 300–700 (default body font)
//   Geist Mono    → technical labels (.mono): 9–11px, UPPERCASE, letter-spacing .12–.18em
// Source: README §4.2.

export const FONTS = {
  serif: 'Fraunces_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',
  serifSemibold: 'Fraunces_600SemiBold',
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodySemibold: 'Geist_600SemiBold',
  bodyBold: 'Geist_700Bold',
  bodyLight: 'Geist_300Light',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

// Observed serif title scale: 22 / 24 / 28–30 / 32–34. Body 12–15. Mono labels 9–11.
export const TYPE = {
  serif: { tiny: 22, sm: 24, md: 28, lg: 30, xl: 32, xxl: 34 },
  body: { xs: 12, sm: 13, md: 14, lg: 15, xl: 16 },
  mono: { xs: 9, sm: 10, md: 11 },
} as const;

export const RADIUS = {
  pill: 999,
  card: 14,
  tile: 10,
  result: 22,
  screen: 32,
} as const;
