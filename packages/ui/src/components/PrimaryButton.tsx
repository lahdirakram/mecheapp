import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { FONTS, MPAL, RADIUS } from '@meche/core';
import { MText } from './Type';
import { MIcon, type MIconName } from './MIcon';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  /** ink (default) for normal actions; caramel for the "generate" action. */
  tone?: 'ink' | 'caramel';
  icon?: MIconName;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Filled pill primary button. padding 14×22, 15/600 white label, optional trailing icon. */
export function PrimaryButton({
  label,
  onPress,
  tone = 'ink',
  icon,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const bg = tone === 'caramel' ? MPAL.sable : MPAL.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: bg,
          borderRadius: RADIUS.pill,
          paddingVertical: 14,
          paddingHorizontal: 22,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style as ViewStyle,
      ]}
    >
      <MText style={{ fontFamily: FONTS.bodySemibold, fontSize: 15, color: MPAL.inkInv }}>{label}</MText>
      {icon ? (
        <View>
          <MIcon name={icon} size={18} color={MPAL.inkInv} />
        </View>
      ) : null}
    </Pressable>
  );
}
