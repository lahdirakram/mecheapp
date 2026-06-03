import React from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { MPAL, type HairShape, type PortraitMood } from '@meche/core';
import { MText } from './Type';

// Lush gradient portrait placeholder — NO real faces. Replaced by real camera / generated
// images in Phase 4. Ported from meche-shared.jsx (MPortrait).

const MOODS: Record<PortraitMood, { a: string; b: string; c: string }> = {
  warm: { a: '#E8C9A0', b: '#B8765A', c: '#3D2A1E' },
  cool: { a: '#C6CFD3', b: '#7A88A0', c: '#1F2A38' },
  blush: { a: '#F0CFC5', b: '#C68B7C', c: '#3B2520' },
  olive: { a: '#C9CFA8', b: '#7A7E4F', c: '#2A2D1A' },
  night: { a: '#3D3A55', b: '#1F1A2E', c: '#0A0814' },
  sand: { a: '#E4D7B8', b: '#A78F60', c: '#3D311E' },
};

const HAIR_PATHS: Record<HairShape, string> = {
  short: 'M58 70 Q72 38 100 38 Q128 38 142 70 L146 110 Q120 95 100 95 Q80 95 54 110 Z',
  medium: 'M52 78 Q64 38 100 38 Q136 38 148 78 L152 140 Q132 122 100 122 Q68 122 48 140 Z',
  long: 'M48 80 Q58 36 100 36 Q142 36 152 80 L160 240 Q140 220 130 220 L70 220 Q60 220 40 240 Z',
  curly:
    'M44 92 Q34 50 100 36 Q166 50 156 92 Q150 64 130 60 Q140 50 120 50 Q125 42 100 46 Q75 42 80 50 Q60 50 70 60 Q50 64 44 92Z',
  pixie:
    'M62 64 Q78 36 100 36 Q124 36 142 60 Q138 78 130 80 Q120 70 100 70 Q80 70 70 80 Q62 76 62 64Z',
  bob: 'M52 78 Q64 38 100 38 Q136 38 148 78 L150 154 Q130 156 100 156 Q70 156 50 154 Z',
};

export interface MPortraitProps {
  hair?: HairShape;
  mood?: PortraitMood;
  tint?: string;
  label?: string;
  /** Border radius applied to the clipping container. */
  radius?: number;
  style?: object;
}

export function MPortrait({
  hair = 'medium',
  mood = 'warm',
  tint,
  label,
  radius = 0,
  style,
}: MPortraitProps) {
  const id = React.useId().replace(/[:]/g, '');
  const m = MOODS[mood] ?? MOODS.warm;
  const hp = HAIR_PATHS[hair] ?? HAIR_PATHS.medium;

  return (
    <View
      style={[
        { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: m.b, borderRadius: radius },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id={`${id}g`} cx="50%" cy="35%" r="80%">
            <Stop offset="0%" stopColor={m.a} stopOpacity={0.95} />
            <Stop offset="60%" stopColor={m.b} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={m.c} stopOpacity={0.95} />
          </RadialGradient>
        </Defs>
        <Rect width="200" height="280" fill={`url(#${id}g)`} />
        {/* neck / shoulders */}
        <Path d="M70 240 Q70 200 100 200 Q130 200 130 240 L200 240 L200 280 L0 280 L0 240 Z" fill="rgba(0,0,0,0.22)" />
        {/* face */}
        <Ellipse cx="100" cy="120" rx="42" ry="56" fill="rgba(0,0,0,0.18)" />
        <Ellipse cx="100" cy="118" rx="40" ry="54" fill="rgba(255,255,255,0.04)" />
        {/* hair */}
        <Path d={hp} fill={tint ?? 'rgba(0,0,0,0.5)'} opacity={0.85} />
      </Svg>
      {label ? (
        <MText
          variant="mono"
          size={9}
          style={{ position: 'absolute', left: 10, bottom: 8, color: 'rgba(255,255,255,0.85)' }}
        >
          {label}
        </MText>
      ) : null}
    </View>
  );
}
