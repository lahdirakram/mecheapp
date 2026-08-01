import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIcon, MPAL, MText, useT } from '@meche/ui';

// Squelette commun des écrans d'auth — « on lit en haut, on agit en bas » : le header (titre,
// contexte) reste en haut où vont les yeux, et TOUT l'interactif (champs, liens, CTA) vit dans
// `children`, un bloc unique ancré en bas de l'écran (zone du pouce) qui monte avec le clavier.
// Clavier : KeyboardAvoidingView en `padding` côté iOS — il RÉTRÉCIT la zone visible, donc le bloc
// ancré en bas remonte mécaniquement. `automaticallyAdjustKeyboardInsets` ne suffisait PAS : il
// n'ajoute que de l'inset de scroll, un contenu collé en bas reste sous le clavier (constaté sur
// device). Côté Android, edge-to-edge (imposé par le SDK) empêche la fenêtre de se redimensionner
// et KeyboardAvoidingView n'y fait rien (constaté sur device ici ET dans try/result.tsx) : on
// mesure donc la hauteur du clavier et on soulève le contenu à la main, comme try/result.tsx.
export function AuthScreen({ header, children, busy }: { header: ReactNode; children: ReactNode; busy?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [kb, setKb] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 26 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1, paddingBottom: kb }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 26, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {header}
          <View style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: insets.bottom + 20, gap: 10 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>

      {busy ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(252,248,244,0.86)', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator color={MPAL.ink} size="large" />
          <MText size={14} color={MPAL.mute}>
            Connexion…
          </MText>
        </View>
      ) : null}
    </View>
  );
}

export function SocialButton({ label, icon, filled, onPress }: { label: string; icon: 'apple' | 'google' | 'mail'; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 15,
        borderRadius: 999,
        backgroundColor: filled ? MPAL.ink : MPAL.paper,
        borderWidth: filled ? 0 : 1,
        borderColor: MPAL.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <MIcon name={icon} size={18} color={filled ? '#fff' : MPAL.ink} fill={icon === 'apple' && filled ? '#fff' : 'none'} stroke={icon === 'apple' && filled ? 0 : 1.7} />
      <MText variant="bodySemibold" size={15} color={filled ? MPAL.inkInv : MPAL.ink}>
        {label}
      </MText>
    </Pressable>
  );
}

export function OrDivider() {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
      <MText variant="mono" size={10} color={MPAL.mute}>
        {t('auth_or')}
      </MText>
      <View style={{ flex: 1, height: 1, backgroundColor: MPAL.border }} />
    </View>
  );
}

/** Trailing « VOIR / CACHER » d'un champ mot de passe. */
export function ShowHide({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <Pressable hitSlop={12} onPress={onToggle}>
      <MText variant="bodySemibold" size={11} color={MPAL.mute}>
        {shown ? t('pwd_hide') : t('pwd_show')}
      </MText>
    </Pressable>
  );
}
