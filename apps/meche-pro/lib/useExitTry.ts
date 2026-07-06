import { useNavigation, useRouter, type Href } from 'expo-router';

// Cleanly leave the whole `try` flow.
//
// `try` is a nested Stack inside a fullScreenModal, which makes closing it from a deep screen tricky:
//   - router.dismissAll() runs POP_TO_TOP on the NESTED stack only — it lands on the first try screen
//     (the selfie/aperçu) and leaves the modal open.
//   - router.navigate('/(tabs)/x') overlaid the tab ON TOP of the still-open modal whenever the target
//     tab wasn't the one already underneath (e.g. "Voir d'autres" after a fresh generation).
//
// The reliable fix is to pop the `try` modal off the ROOT stack — the nested stack's parent — then
// select the destination tab once the pop has settled. Pass `to` to switch tabs (e.g. Mes mèches);
// omit it to simply land back on whichever tab the flow was opened from ("home").
export function useExitTry() {
  const router = useRouter();
  const navigation = useNavigation();
  return (to?: Href) => {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else if (router.canGoBack()) router.back();
    // Deferred a tick so the modal pop settles before the tab switch (mirrors the recharge handoff).
    if (to) setTimeout(() => router.navigate(to), 0);
  };
}
