import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MPAL, MText, PWordmark, PrimaryButton } from '@meche/ui';

// Onboarding · Welcome Pro (Pro screen 1). Positioning: "les clients qui savent".
// Real flow lands in Phase 3 — also the Pro-side wiring check.
export default function WelcomePro() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 }}>
        <PWordmark size={48} />
        <MText variant="serif" size={30} style={{ textAlign: 'center' }}>
          Les clients qui savent.
        </MText>
        <MText variant="body" size={15} color={MPAL.ink2} style={{ textAlign: 'center', lineHeight: 22 }}>
          Reçois des idées déjà générées, montre le résultat au fauteuil, et coupe en confiance.
        </MText>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
        <PrimaryButton label="Créer mon salon" icon="arrowRight" />
        <MText variant="bodyMedium" size={14} color={MPAL.mute} style={{ textAlign: 'center' }}>
          J'ai déjà un compte
        </MText>
      </View>
    </View>
  );
}
