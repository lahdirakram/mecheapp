import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { MSALONS } from '@meche/core';
import { MIcon, MPAL, MText, TopBar, useLang, useSheet, useT, useToast } from '@meche/ui';

type SortKey = 'match' | 'rating' | 'dist';

// B2C · Coiffeurs (18) — find the stylist (not the salon). Mini-map + match-ranked list.
// Ported from MScreenSalons. Match % is computed against the generated cut in Phase 5; the
// demo values come from the seed data.
const ROADS = ['M0 60 L360 70', 'M0 110 L360 100', 'M80 0 L70 160', 'M180 0 L190 160', 'M280 0 L270 160'];
const BLOCKS: [number, number, number, number][] = [[20, 12, 50, 40], [100, 18, 50, 30], [160, 75, 40, 30], [210, 15, 50, 38], [290, 68, 30, 40], [100, 115, 60, 30], [200, 115, 50, 30]];
const PINS = [{ x: 90, y: 70 }, { x: 200, y: 95 }, { x: 280, y: 60 }, { x: 140, y: 130 }];

export default function Salons() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const sheet = useSheet();
  const [sortBy, setSortBy] = useState<SortKey>('match');

  const km = (d: string) => parseFloat(d) || 0;
  const list = [...MSALONS].sort((a, b) => (sortBy === 'rating' ? b.rating - a.rating : sortBy === 'dist' ? km(a.dist) - km(b.dist) : b.match - a.match));

  const openSort = () =>
    sheet({
      title: lang === 'fr' ? 'Trier les coiffeurs' : 'Sort stylists',
      options: [
        { label: lang === 'fr' ? 'Compatibilité' : 'Match', onPress: () => setSortBy('match') },
        { label: lang === 'fr' ? 'Note' : 'Rating', onPress: () => setSortBy('rating') },
        { label: lang === 'fr' ? 'Distance' : 'Distance', onPress: () => setSortBy('dist') },
        { label: lang === 'fr' ? 'Annuler' : 'Cancel', cancel: true },
      ],
    });

  const book = (name: string) =>
    toast(lang === 'fr' ? `La réservation chez ${name} arrive bientôt.` : `Booking at ${name} is coming soon.`, { icon: 'sparkle' });

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top }}>
      <TopBar
        title={t('salons')}
        big
        right={
          <Pressable hitSlop={8} onPress={openSort} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
            <MIcon name="settings" size={18} color={MPAL.ink} />
          </Pressable>
        }
      />

      {/* mini-map */}
      <View style={{ marginHorizontal: 16, marginBottom: 14, height: 160, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: MPAL.border }}>
        <Svg width="100%" height="100%" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice">
          <Rect width="360" height="160" fill="#D2C6AC" />
          {ROADS.map((d, i) => (
            <Path key={`r${i}`} d={d} stroke="rgba(255,255,255,0.7)" strokeWidth={2} fill="none" />
          ))}
          {BLOCKS.map(([x, y, w, h], i) => (
            <Rect key={`b${i}`} x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.06)" rx={2} />
          ))}
          {PINS.map((p, i) => (
            <Path key={`p${i}`} d={`M${p.x} ${p.y - 16} A8 8 0 1 1 ${p.x + 0.01} ${p.y - 16} L${p.x} ${p.y} Z`} fill={i === 0 ? MPAL.sable : MPAL.ink} />
          ))}
          {PINS.map((p, i) => (
            <Circle key={`pc${i}`} cx={p.x} cy={p.y - 14} r={3.5} fill="#fff" />
          ))}
          <Circle cx={180} cy={80} r={18} fill={MPAL.community} opacity={0.18} />
          <Circle cx={180} cy={80} r={6} fill={MPAL.community} stroke="#fff" strokeWidth={2} />
        </Svg>
        <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: MPAL.sable }} />
          <MText variant="bodySemibold" size={11} color={MPAL.ink}>
            {lang === 'fr' ? 'Salons compatibles' : 'Matching salons'}
          </MText>
        </View>
        <View style={{ position: 'absolute', bottom: 10, right: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <MText variant="bodySemibold" size={11} color={MPAL.ink}>
            {t('near_me')}
          </MText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 18, paddingBottom: 6 }}>
        <MText variant="bodySemibold" size={11} color={MPAL.mute} style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {lang === 'fr' ? 'Avec cette coupe' : 'With this cut'}
        </MText>
        <MText variant="mono" size={10} color={MPAL.mute}>
          {MSALONS.length} SALONS
        </MText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130, gap: 10 }} showsVerticalScrollIndicator={false}>
        {list.map((s, i) => {
          const top = i === 0;
          return (
            <Pressable key={s.id} onPress={() => book(s.name)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
              <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: MPAL.subtle, alignItems: 'center', justifyContent: 'center' }}>
                <MText variant="serifItalic" size={22} color={MPAL.ink}>
                  {s.name[0]}
                </MText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MText variant="bodySemibold" size={14} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {s.name}
                  </MText>
                  {s.open ? (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: MPAL.salon }}>
                      <MText variant="bodyBold" size={9} color="#fff" style={{ letterSpacing: 0.5 }}>
                        OUVERT
                      </MText>
                    </View>
                  ) : null}
                </View>
                <MText size={11} color={MPAL.mute} style={{ marginTop: 2 }}>
                  {s.area} · {s.dist}
                </MText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <MIcon name="star" size={11} color={MPAL.sable} fill={MPAL.sable} stroke={0} />
                    <MText variant="bodySemibold" size={11} color={MPAL.ink}>
                      {s.rating}
                    </MText>
                    <MText size={11} color={MPAL.mute}>
                      ({s.reviews})
                    </MText>
                  </View>
                  <MText size={11} color={MPAL.mute}>
                    {s.price}
                  </MText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <MIcon name="flame" size={11} color={top ? MPAL.sable : MPAL.mute} fill={top ? MPAL.sable : 'none'} stroke={top ? 0 : 1.7} />
                    <MText variant="bodySemibold" size={11} color={top ? MPAL.sable : MPAL.mute}>
                      {s.match}%
                    </MText>
                  </View>
                </View>
              </View>
              <Pressable onPress={() => book(s.name)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: top ? MPAL.ink : 'transparent', borderWidth: top ? 0 : 1, borderColor: MPAL.border }}>
                <MText variant="bodySemibold" size={12} color={top ? '#fff' : MPAL.ink}>
                  {t('book')}
                </MText>
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
