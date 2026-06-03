import React from 'react';
import { Pressable, View } from 'react-native';
import { MPAL } from '@meche/core';
import { MIcon } from './MIcon';
import { MText } from './Type';

export interface TopBarProps {
  title?: string;
  /** Large editorial serif title (30px) vs compact centered title (16px). */
  big?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}

/** Screen header with optional back button and a serif "big" title mode. Ported from TopBar. */
export function TopBar({ title, big = false, onBack, right, dark = false }: TopBarProps) {
  const c = dark ? '#fff' : MPAL.ink;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        paddingHorizontal: big ? 20 : 12,
        paddingTop: 6,
        paddingBottom: big ? 8 : 6,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <MIcon name="chevronLeft" size={18} color={c} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {title ? (
          big ? (
            <MText variant="serif" size={30} color={c}>
              {title}
            </MText>
          ) : (
            <MText variant="bodySemibold" size={16} color={c} style={{ textAlign: onBack ? 'left' : 'center' }}>
              {title}
            </MText>
          )
        ) : null}
      </View>
      {right}
    </View>
  );
}
