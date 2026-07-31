import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MPAL, MText, MWordmark, PrimaryButton, useLang } from '@meche/ui';
import { openStore, useUpdateRequired } from '../lib/updateGate';

// Copy lives here rather than in @meche/core's dictionary, like NotAClient: these strings are
// specific to the B2C gate, and the dictionary is shared with meche-pro, which has no gate.

/**
 * Blocks the whole app when this build is below `min_version` (app_config, 0032), and renders
 * `children` untouched in every other case, including every uncertain one. See lib/updateGate.ts
 * for why "uncertain" always means "let them through".
 *
 * Replaces the tree instead of overlaying it: an absolutely positioned overlay would sit UNDER any
 * natively presented modal (`try`, `recharge`, `share` in _layout), so it would not actually block.
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const required = useUpdateRequired();
  if (!required) return <>{children}</>;
  return <UpdateRequired />;
}

function UpdateRequired() {
  const insets = useSafeAreaInsets();
  const lang = useLang();
  // Article included, because it differs per store AND per language ("l’App Store", but "Google
  // Play" bare, and "the App Store" / "Google Play" in EN).
  const store = Platform.OS === 'ios' ? (lang === 'fr' ? 'l’App Store' : 'the App Store') : 'Google Play';
  const version = Constants.expoConfig?.version;

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
        <MWordmark size={34} />
        <MText variant="serif" size={26} style={{ textAlign: 'center', lineHeight: 30 }}>
          {lang === 'fr' ? 'Une nouvelle version t’attend.' : 'A new version is waiting.'}
        </MText>
        <MText size={14} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 21 }}>
          {lang === 'fr'
            ? `Cette version de Mèche n’est plus à jour. Installe la dernière depuis ${store} pour continuer, tes essais et tes crédits te suivent.`
            : `This version of Mèche is out of date. Install the latest one from ${store} to carry on, your looks and your credits come with you.`}
        </MText>
        {/* The installed version, so a user who is stuck can say which build they are on. */}
        {version ? (
          <MText size={12} color={MPAL.mute} style={{ textAlign: 'center' }} numberOfLines={1}>
            {`v${version}`}
          </MText>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <PrimaryButton label={lang === 'fr' ? 'Mettre à jour' : 'Update'} tone="ink" onPress={openStore} />
      </View>
    </View>
  );
}
