import { Pressable, Share as RNShare, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIcon, MPAL, MText, MWordmark, MPortrait, type MIconName, useLang, useT, useToast } from '@meche/ui';

const LINK = 'https://mecheapp.com/r/AX72-9KQ4';

// B2C · Partage (19) — ready-to-post before/after card + social targets + copy link.
// Ported from MScreenShare.
const TARGETS: { ic: MIconName; label: string; bg?: string; gradient?: [string, string, string]; c: string }[] = [
  { ic: 'instagram', label: 'Story', gradient: ['#F58529', '#DD2A7B', '#8134AF'], c: '#fff' },
  { ic: 'instagram', label: 'Post', bg: MPAL.paper, c: MPAL.ink },
  { ic: 'tiktok', label: 'TikTok', bg: MPAL.ink, c: '#fff' },
  { ic: 'snap', label: 'Snap', bg: '#FFFC00', c: MPAL.ink },
];

export default function Share() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const toast = useToast();

  const onShare = async () => {
    try {
      await RNShare.share({ message: `${lang === 'fr' ? 'Mon nouveau look Mèche' : 'My new Mèche look'} ✦ ${LINK}` });
    } catch {
      toast(lang === 'fr' ? 'Partage indisponible ici.' : 'Sharing unavailable here.');
    }
  };

  const onCopy = async () => {
    try {
      await Clipboard.setStringAsync(LINK);
    } catch {
      // clipboard can be blocked (e.g. no focus / headless) — still confirm to the user
    }
    toast(lang === 'fr' ? 'Lien copié.' : 'Link copied.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: MPAL.bg, paddingTop: insets.top + 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          <MIcon name="chevronLeft" size={18} color={MPAL.ink} />
        </Pressable>
        <MText variant="serif" size={30} style={{ marginLeft: 8 }}>
          {t('share')}
        </MText>
      </View>

      <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', paddingHorizontal: 24, marginTop: 4 }}>
        {lang === 'fr' ? 'Carte prête à publier · Stories, posts, lien direct.' : 'Ready-to-post card · Stories, posts, direct link.'}
      </MText>

      {/* preview card */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 240, aspectRatio: 9 / 16, borderRadius: 22, overflow: 'hidden', backgroundColor: MPAL.ink, transform: [{ rotate: '-3deg' }], borderWidth: 6, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } }}>
          <View style={{ flexDirection: 'row', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <View style={{ flex: 1 }}>
              <MPortrait hair="medium" mood="warm" />
              <View style={{ position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.92)' }}>
                <MText variant="bodyBold" size={8} color={MPAL.ink} style={{ letterSpacing: 1.4 }}>
                  AVANT
                </MText>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <MPortrait hair="bob" mood="warm" tint={MPAL.ink} />
              <View style={{ position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: MPAL.sable }}>
                <MText variant="bodyBold" size={8} color="#fff" style={{ letterSpacing: 1.4 }}>
                  APRÈS
                </MText>
              </View>
            </View>
          </View>
          <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 30, paddingHorizontal: 14, paddingBottom: 12 }}>
            <MWordmark size={20} color="#fff" accent={MPAL.sable} />
            <MText size={9} color="rgba(255,255,255,0.75)" style={{ marginTop: 4 }}>
              Carré flou caramel · @camille.r
            </MText>
          </LinearGradient>
        </View>
      </View>

      {/* share targets */}
      <View style={{ paddingHorizontal: 18 }}>
        <MText variant="mono" size={10} color={MPAL.mute} style={{ letterSpacing: 1.4, marginBottom: 10 }}>
          {t('share_to').toUpperCase()}
        </MText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {TARGETS.map((o, i) => (
            <Pressable key={i} onPress={onShare} style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
              {o.gradient ? (
                <LinearGradient colors={o.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', gap: 6, paddingVertical: 14 }}>
                  <MIcon name={o.ic} size={22} color={o.c} />
                  <MText variant="bodySemibold" size={11} color={o.c}>
                    {o.label}
                  </MText>
                </LinearGradient>
              ) : (
                <View style={{ alignItems: 'center', gap: 6, paddingVertical: 14, backgroundColor: o.bg, borderWidth: o.bg === MPAL.paper ? 1 : 0, borderColor: MPAL.border }}>
                  <MIcon name={o.ic} size={22} color={o.c} />
                  <MText variant="bodySemibold" size={11} color={o.c}>
                    {o.label}
                  </MText>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* copy link */}
      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: MPAL.paper, borderWidth: 1, borderColor: MPAL.border }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: MPAL.subtle, alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name="link" size={18} color={MPAL.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <MText variant="bodySemibold" size={13}>
              {t('copy_link')}
            </MText>
            <MText variant="mono" size={10} color={MPAL.mute} numberOfLines={1} style={{ marginTop: 2 }}>
              mecheapp.com/r/AX72-9KQ4
            </MText>
          </View>
          <Pressable onPress={onCopy} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: MPAL.ink }}>
            <MText variant="bodySemibold" size={12} color="#fff">
              {lang === 'fr' ? 'Copier' : 'Copy'}
            </MText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
