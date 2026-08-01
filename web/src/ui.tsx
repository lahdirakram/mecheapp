import type { ReactNode } from 'react';

export function Wordmark() {
  return (
    <span className="wm">
      M<span className="gw">è</span>che{' '}
      <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', color: '#B07F3C' }}>
        Studio
      </span>
    </span>
  );
}

/** The numbered rail. Screens 5 and 6 both sit under step 4: the paywall is not a step of its own,
 *  it is the result you have not paid for yet. */
const LABELS = ['Portrait', 'Look', 'Compte', 'Résultat'] as const;

export function Steps({ active }: { active: 1 | 2 | 3 | 4 }) {
  return (
    <nav className="m-steps" aria-label="Étapes">
      {LABELS.map((label, i) => {
        const n = i + 1;
        const state = n < active ? 'done' : n === active ? 'now' : 'todo';
        return (
          <span key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className="sep">/</span>}
            {/* Le libellé est dans son propre span pour que le mobile puisse ne garder que celui de
                l'étape courante : à quatre libellés le rail passe à deux lignes et coûte 81px de
                hauteur (mesuré), sur un écran où c'est justement ce qui manque. */}
            <span className="m-step" data-state={state} aria-current={state === 'now' ? 'step' : undefined}>
              <span className="n">0{n}</span> <span className="lb">{label}</span>
            </span>
          </span>
        );
      })}
    </nav>
  );
}

/**
 * The site footer, kept identical to the one in legal/public/index.html so /studio does not feel
 * like a different website. Same markup and the same class names, so the CSS ported into styles.css
 * stays diffable against the landing page.
 *
 * Links are absolute paths on the same origin: the studio is served from /studio by the very server
 * that serves these pages, so they resolve without any base-path juggling.
 */
export function SiteFooter() {
  return (
    <footer className="site">
      <div className="foot-inner">
        <div className="foot-top">
          <div>
            <a href="/" className="wm" aria-label="Mèche">
              m<span className="gw">e</span>che
            </a>
            <p className="tag">Vois-toi avant. Change après. Paris vers partout.</p>
          </div>
          <div className="foot-col">
            <h5>Produit</h5>
            <a href="/#paths">Try-on</a>
            <a href="/#how">Comment ça marche</a>
            <a href="/#why">Pourquoi Mèche</a>
            <a href="/#download">Télécharger</a>
          </div>
          <div className="foot-col">
            <h5>Coiffeurs</h5>
            <span className="soon">
              Mèche Pro <span className="badge">Bientôt</span>
            </span>
            <span className="soon">
              Rejoindre <span className="badge">Bientôt</span>
            </span>
            <span className="soon">
              Tarification <span className="badge">Bientôt</span>
            </span>
          </div>
          <div className="foot-col">
            <h5>Mèche</h5>
            <a href="/support">Assistance</a>
            <a href="/delete-account">Suppression de compte</a>
            <a href="/privacy">Confidentialité</a>
            <a href="/terms">CGU</a>
            <a href="/mentions-legales">Mentions légales</a>
          </div>
        </div>
        <div className="foot-bot">
          <span>© 2026 Mèche · Paris</span>
          <span>
            <a href="/mentions-legales">Mentions légales</a> · <a href="/terms">CGU</a> ·{' '}
            <a href="/privacy">Confidentialité</a> · <a href="/privacy">Cookies</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="m-note">
      <span className="ic" aria-hidden="true">
        ✓
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="m-alert" role="alert">
      <span className="ic" aria-hidden="true">
        !
      </span>
      <span>{children}</span>
    </div>
  );
}

/* Provider marks. Both are trademarks and their sign-in guidelines require the official glyph, so
   these are the standard paths rather than a house-styled lookalike. */

export function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function AppleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.05 12.79c-.03-2.7 2.2-3.99 2.3-4.05-1.25-1.83-3.2-2.08-3.89-2.11-1.66-.17-3.24.97-4.08.97-.84 0-2.14-.95-3.52-.92-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.08 1.35 10.72.9 1.29 1.97 2.74 3.38 2.69 1.36-.06 1.87-.88 3.51-.88 1.64 0 2.1.88 3.53.85 1.46-.03 2.38-1.32 3.27-2.61 1.03-1.5 1.46-2.95 1.48-3.03-.03-.01-2.84-1.09-2.87-4.3zM14.4 4.9c.74-.9 1.24-2.15 1.11-3.4-1.07.04-2.37.71-3.14 1.61-.69.79-1.29 2.06-1.13 3.28 1.19.09 2.41-.61 3.16-1.49z" />
    </svg>
  );
}

/** Porte de sortie. Sous 620px l'icône remplace le libellé, d'où l'`aria-label` porté par le bouton
 *  qui l'utilise : sans lui le bouton n'aurait plus de nom accessible du tout. */
export function ExitMark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function Arrow() {
  return (
    <span className="arw" aria-hidden="true">
      →
    </span>
  );
}
