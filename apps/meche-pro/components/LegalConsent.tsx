import { MPAL, MText, useLang } from '@meche/ui';
import { openLegal } from '../lib/legal';

// The "by continuing you agree to the Terms and Privacy Policy" line, with both documents as
// tappable links (App Store / Play require the user to be able to reach them).
export function LegalConsent() {
  const lang = useLang();
  const Link = ({ doc, children }: { doc: 'privacy' | 'terms'; children: string }) => (
    <MText size={11} color={MPAL.ink} variant="bodySemibold" onPress={() => openLegal(doc, lang)} style={{ textDecorationLine: 'underline' }}>
      {children}
    </MText>
  );
  return (
    <MText size={11} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 16, maxWidth: 320, alignSelf: 'center' }}>
      {lang === 'fr' ? 'En continuant, tu acceptes les ' : 'By continuing, you agree to the '}
      <Link doc="terms">{lang === 'fr' ? 'CGU' : 'Terms'}</Link>
      {lang === 'fr' ? ' et la ' : ' and '}
      <Link doc="privacy">{lang === 'fr' ? 'politique de confidentialité' : 'Privacy Policy'}</Link>
      {'.'}
    </MText>
  );
}
