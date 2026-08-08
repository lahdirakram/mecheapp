import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@meche/api-client';
import { MIcon, MPAL, MText, useLangStore } from '@meche/ui';
import { openLegal } from '../lib/legal';
import { recordConsent, setAdConsent, shouldPromptConsent } from '../lib/consent';
import { replayAfterGrant, startMarketing } from '../lib/marketing';

// Ad-measurement consent as a CMP-style purposes screen: an "always active" row for what the app
// needs to work, a real unticked checkbox for ad measurement, the CGU/privacy links, and the
// familiar "Tout accepter" / "Continuer" pair. Tied to AUTH, not to app open: it shows once a
// session exists with no stored choice, so a new user meets it as the last step of signing up and
// an anonymous browser is never nagged (their iOS installs are still counted consent-free through
// SKAdNetwork, which is OS-level and aggregated; Android has no consent-free equivalent, which is
// exactly why the prompt sits this early in the funnel).
//
// Legal shape (do not "simplify"): the ad checkbox starts UNTICKED and is its own purpose, never
// merged with the CGU acceptance (GDPR wants SPECIFIC consent; bundled consent is invalid, art. 7
// / Planet49, and is what CNIL fines). Refusing = one tap on "Continuer" with the box unticked,
// the same single tap as "Tout accepter": the CNIL bar of refusal being as easy as acceptance.
//
// This component also boots marketing.ts on EVERY launch (startMarketing applies the stored
// choice), so it stays mounted even for users who answered long ago.
export function ConsentGate() {
  const insets = useSafeAreaInsets();
  const { lang } = useLangStore();
  const session = useSession();
  const [show, setShow] = useState(false);
  const [cguChecked, setCguChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [adsChecked, setAdsChecked] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    startMarketing();
  }, []);

  // DB-backed since 0040: the screen shows only when NEITHER the consent_events ledger NOR the
  // device has an answer. A pre-0040 device that already answered is backfilled into the ledger
  // silently (see shouldPromptConsent) — existing users never see this screen again.
  const uid = session?.user?.id ?? null;
  useEffect(() => {
    if (Platform.OS === 'web' || !uid) return;
    void shouldPromptConsent(uid).then((s) => {
      if (s) setShow(true);
    });
  }, [uid]);

  if (!show) return null;

  const fr = lang === 'fr';
  const user = session?.user;
  const canContinue = cguChecked && privacyChecked;

  const finish = (granted: boolean) => {
    setShow(false); // hide first: SDK inits behind setAdConsent must never block the tap
    // The DB proof (0040): CGU + privacy are necessarily accepted to get here ("Tout accepter"
    // covers them), ads carries the actual choice. Best-effort: a failed insert means the gate
    // shows again next launch and the proof is re-collected.
    if (uid)
      recordConsent(uid, 'gate', lang, [
        { purpose: 'terms', status: 'granted' },
        { purpose: 'privacy', status: 'granted' },
        { purpose: 'ads', status: granted ? 'granted' : 'denied' },
      ]);
    void setAdConsent(granted ? 'granted' : 'denied').then(() => {
      if (granted)
        // Sign-up fired seconds ago while the SDKs were still off: replay identify + Registration
        // so the ad platforms get their main acquisition signal.
        replayAfterGrant(user ? { id: user.id, email: user.email, createdAt: user.created_at } : null);
    });
  };

  return (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: MPAL.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <MText variant="serif" size={26} style={{ lineHeight: 32 }}>
          {fr ? 'Avant de continuer' : 'Before you continue'}
        </MText>
        <MText size={13} color={MPAL.mute} style={{ marginTop: 8, lineHeight: 19 }}>
          {fr
            ? 'Choisis ce que Mèche peut utiliser. Modifiable à tout moment dans ton profil.'
            : 'Choose what Mèche can use. You can change this anytime in your profile.'}
        </MText>

        <View style={{ marginTop: 20, borderRadius: 16, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
          {/* Always-active purpose: same checkbox as below, but checked and grayed out, not a
              choice (the app cannot work without it). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: MPAL.border,
                backgroundColor: MPAL.subtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MIcon name="check" size={14} color={MPAL.mute} />
            </View>
            <View style={{ flex: 1 }}>
              <MText variant="bodySemibold" size={13}>
                {fr ? 'Nécessaire au fonctionnement' : 'Required to work'}
              </MText>
              <MText size={11} color={MPAL.mute} style={{ marginTop: 2, lineHeight: 16 }}>
                {fr ? 'Ton compte, tes essais, tes achats.' : 'Your account, your tries, your purchases.'}
              </MText>
            </View>
          </View>

          {/* Mandatory acceptances: real checkboxes, both required before "Continuer" unlocks.
              The "Lire" link opens the document without toggling the box. */}
          {(
            [
              {
                checked: cguChecked,
                toggle: () => setCguChecked((v) => !v),
                title: fr ? "J'accepte les Conditions d'utilisation" : 'I accept the Terms of Service',
                read: fr ? 'Lire les CGU' : 'Read the Terms',
                doc: 'terms' as const,
              },
              {
                checked: privacyChecked,
                toggle: () => setPrivacyChecked((v) => !v),
                title: fr ? "J'accepte la Politique de confidentialité" : 'I accept the Privacy Policy',
                read: fr ? 'Lire la politique' : 'Read the policy',
                doc: 'privacy' as const,
              },
            ]
          ).map((row) => (
            <Pressable
              key={row.doc}
              onPress={row.toggle}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: MPAL.border }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: row.checked ? MPAL.ink : MPAL.border,
                  backgroundColor: row.checked ? MPAL.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {row.checked ? <MIcon name="check" size={14} color="#fff" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <MText variant="bodySemibold" size={13}>
                  {row.title}
                </MText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <MText size={11} color={MPAL.mute}>
                    {fr ? 'Obligatoire ·' : 'Required ·'}
                  </MText>
                  <Pressable onPress={() => openLegal(row.doc, lang)} hitSlop={8}>
                    <MText size={11} color={MPAL.mute} style={{ textDecorationLine: 'underline' }}>
                      {row.read}
                    </MText>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}

          {/* The actual ad consent: a real, unticked, OPTIONAL checkbox. */}
          <Pressable
            onPress={() => setAdsChecked((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: MPAL.border }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: adsChecked ? MPAL.ink : MPAL.border,
                backgroundColor: adsChecked ? MPAL.ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {adsChecked ? <MIcon name="check" size={14} color="#fff" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <MText variant="bodySemibold" size={13}>
                {fr ? 'Mesure publicitaire' : 'Ad measurement'}
              </MText>
              <MText size={11} color={MPAL.mute} style={{ marginTop: 2, lineHeight: 16 }}>
                {fr
                  ? 'Savoir quelles pubs font découvrir Mèche (Google, Meta, TikTok). Jamais tes photos ni tes essais.'
                  : 'Know which ads bring people to Mèche (Google, Meta, TikTok). Never your photos or your tries.'}
              </MText>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, gap: 8 }}>
        {/* "Tout accepter" covers the mandatory boxes too: one tap accepts everything. */}
        <Pressable onPress={() => finish(true)} style={{ paddingVertical: 15, borderRadius: 999, backgroundColor: MPAL.ink, alignItems: 'center' }}>
          <MText variant="bodySemibold" size={15} color="#fff">
            {fr ? 'Tout accepter' : 'Accept all'}
          </MText>
        </Pressable>
        {/* Applies the selection as-is (ads box unticked = refusal, same single tap as accepting).
            Locked until both mandatory boxes are ticked. */}
        <Pressable
          disabled={!canContinue}
          onPress={() => finish(adsChecked)}
          style={{
            paddingVertical: 15,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: MPAL.border,
            backgroundColor: MPAL.paper,
            alignItems: 'center',
            opacity: canContinue ? 1 : 0.4,
          }}
        >
          <MText variant="bodySemibold" size={14}>
            {fr ? 'Continuer' : 'Continue'}
          </MText>
        </Pressable>
      </View>
    </View>
  );
}
