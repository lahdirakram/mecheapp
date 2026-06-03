import React from 'react';
import { View } from 'react-native';
import { FONTS, MPAL } from '@meche/core';
import { MText } from './Type';
import { MWordmark, type MWordmarkProps } from './MWordmark';

/**
 * Pro wordmark: the "mèche" wordmark + a PRO badge (Geist Mono, ink fill, white text,
 * radius 4, wide tracking, nudged up). Ported from meche-pro-shared.jsx (PWordmark).
 */
export function PWordmark({ size = 28, color = MPAL.ink, accent = MPAL.sable, italic }: MWordmarkProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      <MWordmark size={size} color={color} accent={accent} italic={italic} />
      <View
        style={{
          marginTop: size * 0.06,
          backgroundColor: MPAL.ink,
          borderRadius: 4,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}
      >
        <MText
          style={{
            fontFamily: FONTS.monoMedium,
            fontSize: Math.max(8, size * 0.3),
            letterSpacing: size * 0.05,
            color: MPAL.inkInv,
          }}
        >
          PRO
        </MText>
      </View>
    </View>
  );
}
