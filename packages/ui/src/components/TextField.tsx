import React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { FONTS, MPAL, RADIUS } from '@meche/core';
import { MText } from './Type';
import { MIcon, type MIconName } from './MIcon';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: MIconName;
  trailing?: React.ReactNode;
}

/** Labeled input: uppercase mono label + rounded card with a leading icon. */
export function TextField({ label, icon, trailing, ...input }: TextFieldProps) {
  return (
    <View>
      {label ? (
        <MText variant="bodySemibold" size={11} color={MPAL.mute} style={{ letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </MText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: RADIUS.card,
          backgroundColor: MPAL.paper,
          borderWidth: 1,
          borderColor: MPAL.border,
        }}
      >
        {icon ? <MIcon name={icon} size={17} color={MPAL.mute} /> : null}
        <TextInput
          placeholderTextColor={MPAL.mute}
          style={{ flex: 1, fontFamily: FONTS.body, fontSize: 15, color: MPAL.ink, paddingVertical: 2 }}
          {...input}
        />
        {trailing}
      </View>
    </View>
  );
}
