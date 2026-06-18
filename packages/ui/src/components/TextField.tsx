import React, { useRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { FONTS, MPAL, RADIUS } from '@meche/core';
import { MText } from './Type';
import { MIcon, type MIconName } from './MIcon';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: MIconName;
  trailing?: React.ReactNode;
}

/** Labeled input: uppercase mono label + rounded card with a leading icon. The whole row is a
 *  tap target that focuses the input (≥48pt min height), so taps don't miss on small screens. */
export function TextField({ label, icon, trailing, ...input }: TextFieldProps) {
  const ref = useRef<TextInput>(null);
  return (
    <View>
      {label ? (
        <MText variant="bodySemibold" size={11} color={MPAL.mute} style={{ letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </MText>
      ) : null}
      <Pressable
        onPress={() => ref.current?.focus()}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          minHeight: 52,
          borderRadius: RADIUS.card,
          backgroundColor: MPAL.paper,
          borderWidth: 1,
          borderColor: MPAL.border,
        }}
      >
        {icon ? <MIcon name={icon} size={17} color={MPAL.mute} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={MPAL.mute}
          style={{ flex: 1, fontFamily: FONTS.body, fontSize: 15, color: MPAL.ink, paddingVertical: 2 }}
          {...input}
        />
        {trailing}
      </Pressable>
    </View>
  );
}
