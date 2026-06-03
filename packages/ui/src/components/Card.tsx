import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { MPAL, RADIUS } from '@meche/core';

export interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/** White card: radius 14, hairline warm border. */
export function Card({ children, padded = true, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: MPAL.paper,
          borderRadius: RADIUS.card,
          borderWidth: 1,
          borderColor: MPAL.border,
          padding: padded ? 16 : 0,
          overflow: 'hidden',
        },
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}
