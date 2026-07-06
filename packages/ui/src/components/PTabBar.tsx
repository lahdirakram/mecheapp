import React from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MPAL } from '@meche/core';
import { MIcon, type MIconName } from './MIcon';
import { MText } from './Type';
import { useLang } from '../i18n';

// V1 pro nav: Studio, Essais | (Essayer) | Salon. Demandes/Agenda return with the marketplace
// phases (the right side has a free slot for Demandes).
export type ProTab = 'studio' | 'essais' | 'salon';

const LABELS: Record<ProTab | 'try', { fr: string; en: string }> = {
  studio: { fr: 'Studio', en: 'Studio' },
  essais: { fr: 'Essais', en: 'Try-ons' },
  salon: { fr: 'Salon', en: 'Salon' },
  try: { fr: 'Essayer', en: 'Try on' },
};

export interface PTabBarProps {
  active: ProTab;
  onChange: (tab: ProTab) => void;
  /** Central caramel button — launches "Essai Mèche au fauteuil". */
  onPressCenter: () => void;
}

const LEFT: { id: ProTab; icon: MIconName }[] = [
  { id: 'studio', icon: 'flame' },
  { id: 'essais', icon: 'bookmark' },
];
const RIGHT: { id: ProTab; icon: MIconName }[] = [{ id: 'salon', icon: 'user' }];

/** Pro floating glass tab bar — same visual language as B2C. */
export function PTabBar({ active, onChange, onPressCenter }: PTabBarProps) {
  const lang = useLang();
  const onColor = MPAL.ink;
  const offColor = MPAL.mute;

  const renderTab = (it: { id: ProTab; icon: MIconName }) => {
    const on = active === it.id;
    return (
      <Pressable key={it.id} onPress={() => onChange(it.id)} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 }}>
        <MIcon name={it.icon} size={20} color={on ? onColor : offColor} fill={on ? onColor : 'none'} stroke={on ? 0 : 1.7} />
        <MText variant="bodySemibold" size={10} color={on ? onColor : offColor}>
          {LABELS[it.id][lang]}
        </MText>
      </Pressable>
    );
  };

  return (
    <View style={{ position: 'absolute', bottom: 22, left: 14, right: 14, zIndex: 30 }}>
      <BlurView
        intensity={60}
        tint="light"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 28,
          paddingHorizontal: 8,
          paddingVertical: 8,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.06)',
          backgroundColor: 'rgba(255,253,249,0.6)',
        }}
      >
        <View style={{ flexDirection: 'row', flex: 1 }}>{LEFT.map(renderTab)}</View>
        <View style={{ width: 64 }} />
        <View style={{ flexDirection: 'row', flex: 1 }}>{RIGHT.map(renderTab)}</View>
      </BlurView>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: -16, alignItems: 'center' }}>
        <Pressable
          onPress={onPressCenter}
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
        <MText variant="bodyBold" size={10} color={MPAL.ink} style={{ marginTop: 2 }}>
          {LABELS.try[lang]}
        </MText>
      </View>
    </View>
  );
}
