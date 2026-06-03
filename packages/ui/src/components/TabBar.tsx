import React from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MPAL } from '@meche/core';
import { MIcon, type MIconName } from './MIcon';
import { MText } from './Type';
import { useT } from '../i18n';

export type B2CTab = 'explore' | 'wardrobe' | 'salons' | 'profile';

export interface TabBarProps {
  active: B2CTab;
  onChange: (tab: B2CTab) => void;
  /** Central caramel button — launches the selfie → hub try-on flow. */
  onPressCenter: () => void;
  dark?: boolean;
}

const LEFT: { id: B2CTab; icon: MIconName; key: 'explore' | 'wardrobe' }[] = [
  { id: 'explore', icon: 'compass', key: 'explore' },
  { id: 'wardrobe', icon: 'bookmark', key: 'wardrobe' },
];
const RIGHT: { id: B2CTab; icon: MIconName; key: 'salons' | 'profile' }[] = [
  { id: 'salons', icon: 'pin', key: 'salons' },
  { id: 'profile', icon: 'user', key: 'profile' },
];

/** Floating glass tab bar: 4 tabs + an elevated central caramel "Mèche" action button. */
export function TabBar({ active, onChange, onPressCenter, dark = false }: TabBarProps) {
  const t = useT();
  const onColor = dark ? MPAL.inkInv : MPAL.ink;
  const offColor = dark ? 'rgba(255,255,255,0.55)' : MPAL.mute;

  const renderTab = (it: { id: B2CTab; icon: MIconName; key: 'explore' | 'wardrobe' | 'salons' | 'profile' }) => {
    const on = active === it.id;
    return (
      <Pressable
        key={it.id}
        onPress={() => onChange(it.id)}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 }}
      >
        <MIcon name={it.icon} size={20} color={on ? onColor : offColor} fill={on ? onColor : 'none'} stroke={on ? 0 : 1.7} />
        <MText variant="bodySemibold" size={10} color={on ? onColor : offColor}>
          {t(it.key)}
        </MText>
      </Pressable>
    );
  };

  return (
    <View style={{ position: 'absolute', bottom: 22, left: 14, right: 14, zIndex: 30 }}>
      <BlurView
        intensity={dark ? 40 : 60}
        tint={dark ? 'dark' : 'light'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 28,
          paddingHorizontal: 8,
          paddingVertical: 8,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: dark ? 'rgba(20,18,16,0.55)' : 'rgba(255,253,249,0.6)',
        }}
      >
        <View style={{ flexDirection: 'row', flex: 1 }}>{LEFT.map(renderTab)}</View>
        <View style={{ width: 64 }} />
        <View style={{ flexDirection: 'row', flex: 1 }}>{RIGHT.map(renderTab)}</View>
      </BlurView>

      {/* central elevated caramel action button + "Essayer" label.
          box-none: this full-width overlay must NOT swallow taps meant for the tabs below it. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: -16, alignItems: 'center' }}>
        <Pressable
          onPress={onPressCenter}
          accessibilityLabel={t('use_meche')}
          style={({ pressed }) => ({
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: MPAL.sable,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
            shadowColor: MPAL.sable,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          })}
        >
          <View style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 26, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }} />
          <MIcon name="sparkle" size={26} color="#fff" fill="#fff" stroke={0} />
        </Pressable>
        <MText variant="bodyBold" size={10} color={dark ? MPAL.inkInv : MPAL.ink} style={{ marginTop: 2 }}>
          {t('try_on')}
        </MText>
      </View>
    </View>
  );
}
