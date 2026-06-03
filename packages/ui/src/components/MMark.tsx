import React from 'react';
import { Text, View } from 'react-native';
import { FONTS, MPAL } from '@meche/core';

export type MarkColorway = 'ink' | 'caramel' | 'cream' | 'plum';

const COLORWAYS: Record<MarkColorway, { bg: string; fg: string; accent: string }> = {
  ink: { bg: MPAL.ink, fg: MPAL.bg, accent: MPAL.sable },
  caramel: { bg: MPAL.sable, fg: MPAL.bg, accent: MPAL.bg },
  cream: { bg: MPAL.bg, fg: MPAL.ink, accent: MPAL.sable },
  plum: { bg: '#2A2520', fg: MPAL.bg, accent: MPAL.sable },
};

export interface MMarkProps {
  size?: number;
  colorway?: MarkColorway;
  /** Rounded-square tile (app-icon style) vs. bare glyph. */
  tile?: boolean;
}

/**
 * The Mèche mark: lowercase "m" with the caramel grave floating above it. App-icon / small
 * stand-in for the wordmark. Spec from Meche Brand Identity.html (.tile / .tile .accent):
 *   accent top 22% · left 34% · width 30% · height 5% · rotate 22° · origin left center.
 */
export function MMark({ size = 64, colorway = 'ink', tile = true }: MMarkProps) {
  const c = COLORWAYS[colorway];
  const w = 0.3 * size;
  const h = Math.max(2, 0.05 * size);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: tile ? size * 0.26 : 0,
        backgroundColor: tile ? c.bg : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text style={{ fontFamily: FONTS.serif, fontSize: size * 0.62, lineHeight: size * 0.62, color: c.fg, includeFontPadding: false }}>
        m
      </Text>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0.22 * size,
          left: 0.34 * size,
          width: w,
          height: h,
          backgroundColor: c.accent,
          borderRadius: 999,
          transform: [{ translateX: -w / 2 }, { rotate: '22deg' }, { translateX: w / 2 }],
        }}
      />
    </View>
  );
}
