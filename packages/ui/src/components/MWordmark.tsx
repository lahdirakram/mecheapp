import React from 'react';
import { Text, View } from 'react-native';
import { FONTS, MPAL } from '@meche/core';

export interface MWordmarkProps {
  size?: number;
  color?: string;
  /** The è-accent stroke color — caramel by default. The grave is sacred: never recolor it
   *  outside the palette, never tilt it the other way (Brand Identity §07). */
  accent?: string;
  italic?: boolean;
}

/**
 * The "mèche" wordmark. The è is NOT a real character — it's a plain "e" plus a caramel
 * stroke. Exact spec from Meche Brand Identity.html (.wm .gw::after):
 *   top 0.18em · left 0.18em · width 0.5em · height 0.07em (0.09em ≤16px) · rotate 22°
 *   · transform-origin: left center · border-radius 999.
 * Fraunces 400, letter-spacing -0.045em, line-height 1.
 */
export function MWordmark({ size = 32, color = MPAL.ink, accent = MPAL.sable, italic = false }: MWordmarkProps) {
  const fs = size;
  const family = italic ? FONTS.serifItalic : FONTS.serif;
  const letter = {
    fontFamily: family,
    fontSize: fs,
    lineHeight: fs,
    letterSpacing: fs <= 16 ? -0.02 * fs : -0.045 * fs,
    color,
    includeFontPadding: false,
  } as const;

  const w = 0.5 * fs;
  const h = Math.max(2, (fs <= 16 ? 0.09 : 0.07) * fs);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <Text style={letter}>m</Text>
      <View style={{ position: 'relative' }}>
        <Text style={letter}>e</Text>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0.18 * fs,
            left: 0.18 * fs,
            width: w,
            height: h,
            backgroundColor: accent,
            borderRadius: 999,
            // Replicate CSS transform-origin: left center — pivot the rotation about the
            // stroke's left edge instead of RN's default center.
            transform: [{ translateX: -w / 2 }, { rotate: '22deg' }, { translateX: w / 2 }],
          }}
        />
      </View>
      <Text style={letter}>che</Text>
    </View>
  );
}
