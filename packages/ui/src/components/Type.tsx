import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { FONTS, MPAL } from '@meche/core';

type Variant = 'serif' | 'serifItalic' | 'body' | 'bodyMedium' | 'bodySemibold' | 'bodyBold' | 'mono';

const FAMILY: Record<Variant, string> = {
  serif: FONTS.serif,
  serifItalic: FONTS.serifItalic,
  body: FONTS.body,
  bodyMedium: FONTS.bodyMedium,
  bodySemibold: FONTS.bodySemibold,
  bodyBold: FONTS.bodyBold,
  mono: FONTS.mono,
};

export interface MTextProps extends TextProps {
  variant?: Variant;
  size?: number;
  color?: string;
  style?: TextStyle | TextStyle[];
}

/** Brand-aware Text. Defaults to Geist body at 15/ink. Mono variant uppercases + tracks wide. */
export function MText({ variant = 'body', size, color = MPAL.ink, style, children, ...rest }: MTextProps) {
  const base: TextStyle = { fontFamily: FAMILY[variant], color };
  if (size) base.fontSize = size;
  if (variant === 'serif' || variant === 'serifItalic') base.letterSpacing = (size ?? 28) * -0.02;
  if (variant === 'mono') {
    base.letterSpacing = (size ?? 10) * 0.14;
    base.textTransform = 'uppercase';
  }
  return (
    <Text style={[base, style as TextStyle]} {...rest}>
      {children}
    </Text>
  );
}
