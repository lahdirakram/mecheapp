import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { MPAL } from '@meche/core';

// Custom icon set ported from meche-shared.jsx (MIcon). Stroke 1.7, viewBox 24, round caps.
// Most icons inherit stroke=color / fill from the <Svg>; `google` is multi-color (hardcoded).

export type MIconName =
  | 'heart' | 'bookmark' | 'share' | 'sparkle' | 'compass' | 'home' | 'pin' | 'user'
  | 'chevronLeft' | 'chevronRight' | 'plus' | 'check' | 'star' | 'flame' | 'grid' | 'mic'
  | 'cam' | 'flip' | 'settings' | 'crown' | 'x' | 'arrowUp' | 'arrowRight' | 'instagram'
  | 'tiktok' | 'snap' | 'link' | 'calendar' | 'apple' | 'google' | 'mail' | 'lock' | 'zap' | 'coin' | 'trash';

export interface MIconProps {
  name: MIconName;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: string;
}

function paths(name: MIconName): React.ReactNode {
  switch (name) {
    case 'heart':
      return <Path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />;
    case 'bookmark':
      return <Path d="M6 3h12v18l-6-4-6 4V3Z" />;
    case 'share':
      return (
        <G>
          <Circle cx="6" cy="12" r="2.5" />
          <Circle cx="18" cy="6" r="2.5" />
          <Circle cx="18" cy="18" r="2.5" />
          <Path d="M8 11 16 7M8 13l8 4" />
        </G>
      );
    case 'sparkle':
      return <Path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" />;
    case 'compass':
      return <Path fillRule="evenodd" clipRule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-5 2-2 5 5-2 2-5Z" />;
    case 'home':
      return <Path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z" />;
    case 'pin':
      return (
        <G>
          <Path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13Z" />
          <Circle cx="12" cy="9" r="2.5" />
        </G>
      );
    case 'user':
      return (
        <G>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 21a8 8 0 0 1 16 0" />
        </G>
      );
    case 'chevronLeft':
      return <Path d="m15 6-6 6 6 6" />;
    case 'chevronRight':
      return <Path d="m9 6 6 6-6 6" />;
    case 'plus':
      return <Path d="M12 5v14M5 12h14" />;
    case 'check':
      return <Path d="m5 12 5 5 9-11" />;
    case 'star':
      return <Path d="M12 2 14.8 8 21 9l-4.5 4.4 1.1 6.6L12 17l-5.6 3 1.1-6.6L3 9l6.2-1L12 2Z" />;
    case 'flame':
      return <Path d="M12 22a6 6 0 0 0 6-6c0-4-4-6-4-10 0 0-3 1-5 5-1 2-3 3-3 6a6 6 0 0 0 6 5Z" />;
    case 'grid':
      return (
        <G>
          <Rect x="3" y="3" width="8" height="8" rx="1.5" />
          <Rect x="13" y="3" width="8" height="8" rx="1.5" />
          <Rect x="3" y="13" width="8" height="8" rx="1.5" />
          <Rect x="13" y="13" width="8" height="8" rx="1.5" />
        </G>
      );
    case 'mic':
      return (
        <G>
          <Rect x="9" y="3" width="6" height="12" rx="3" />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </G>
      );
    case 'cam':
      return (
        <G>
          <Path d="M3 8a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
          <Circle cx="12" cy="13" r="3.5" />
        </G>
      );
    case 'flip':
      return (
        <G>
          <Path d="M4 6h12a4 4 0 0 1 4 4v2" />
          <Path d="m13 9 3-3-3-3" />
          <Path d="M20 18H8a4 4 0 0 1-4-4v-2" />
          <Path d="m11 15-3 3 3 3" />
        </G>
      );
    case 'settings':
      return (
        <G>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8M4.6 9a1.7 1.7 0 0 0-.3-1.8M15 4.6a1.7 1.7 0 0 0 1.8-.3M9 19.4a1.7 1.7 0 0 0-1.8.3" />
        </G>
      );
    case 'crown':
      return <Path d="m3 8 4 3 5-6 5 6 4-3v10H3V8Z" />;
    case 'x':
      return <Path d="M6 6l12 12M6 18 18 6" />;
    case 'arrowUp':
      return <Path d="M12 19V5M5 12l7-7 7 7" />;
    case 'arrowRight':
      return <Path d="M5 12h14M13 5l7 7-7 7" />;
    case 'instagram':
      return (
        <G>
          <Rect x="3" y="3" width="18" height="18" rx="5" />
          <Circle cx="12" cy="12" r="4" />
          <Circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </G>
      );
    case 'tiktok':
      return <Path d="M16 3v4a4 4 0 0 0 4 4M16 3v10.5a4.5 4.5 0 1 1-3-4.2" />;
    case 'snap':
      return <Path d="M12 3c4 0 5 4 5 7 1 0 2 1 2 2-1 1-3 1-3 3 0 0 1 3-4 4-1 0-2 1-2 1s-1-1-2-1c-5-1-4-4-4-4 0-2-2-2-3-3 0-1 1-2 2-2 0-3 1-7 5-7-1 1 0 0 2 0 1 0 2 0 2 0Z" />;
    case 'link':
      return (
        <G>
          <Path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
          <Path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
        </G>
      );
    case 'calendar':
      return (
        <G>
          <Rect x="3" y="5" width="18" height="16" rx="2" />
          <Path d="M3 10h18M8 3v4M16 3v4" />
        </G>
      );
    case 'apple':
      return <Path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.7-3.7M14 5.5c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.7-1.3" />;
    case 'google':
      return (
        <G>
          <Path d="M21.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.8 2.9-4.4 2.9-7.4Z" fill="#4285F4" stroke="none" />
          <Path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.2v2.6C4.8 19.9 8.1 22 12 22Z" fill="#34A853" stroke="none" />
          <Path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.2A10 10 0 0 0 2 12c0 1.6.4 3.2 1.2 4.6L6.4 14Z" fill="#FBBC05" stroke="none" />
          <Path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 3 14.7 2 12 2 8.1 2 4.8 4.1 3.2 7.4L6.4 10c.8-2.4 3-4 5.6-4Z" fill="#EA4335" stroke="none" />
        </G>
      );
    case 'mail':
      return (
        <G>
          <Rect x="3" y="5" width="18" height="14" rx="2" />
          <Path d="m3 7 9 6 9-6" />
        </G>
      );
    case 'lock':
      return (
        <G>
          <Rect x="5" y="11" width="14" height="10" rx="2" />
          <Path d="M8 11V8a4 4 0 1 1 8 0v3" />
        </G>
      );
    case 'zap':
      return <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />;
    case 'coin':
      return (
        <G>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M9 9h5a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9m3-12v2m0 10v2" />
        </G>
      );
    case 'trash':
      return (
        <G>
          <Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <Path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
          <Path d="M10 11v6M14 11v6" />
        </G>
      );
    default:
      return null;
  }
}

export function MIcon({
  name,
  size = 22,
  color = MPAL.ink,
  stroke = 1.7,
  fill = 'none',
}: MIconProps) {
  // `google` carries its own brand colors; everything else inherits stroke=color.
  const isMulticolor = name === 'google';
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      color={color}
      fill={isMulticolor ? 'none' : fill}
      stroke={isMulticolor ? undefined : color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths(name)}
    </Svg>
  );
}
