import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The studio is served under a PATH, not a subdomain: meche.<tld>/studio (see docs/web-studio.md).
// `base` must therefore be '/studio/' so the built asset URLs resolve. Getting this wrong yields a
// blank page with 404s on /assets/*, which looks like a build failure but is only a base-path
// mistake. server.js serves dist/ at that same prefix; the two must stay in agreement.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Vite inlines VITE_* AT BUILD TIME. A production build with them missing succeeds, ships a bundle
  // that cannot reach Supabase, and Railway reports a perfectly green deploy. Fail here instead, so
  // a misconfigured service breaks at build with a message that says what to set.
  if (command === 'build') {
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k]);
    if (missing.length) {
      throw new Error(
        `Build impossible : ${missing.join(', ')} manquant(s).\n` +
          `En local : copier web/.env.example vers web/.env.local et remplir.\n` +
          `Sur Railway : les définir comme variables du service (ce sont des variables de BUILD, ` +
          `donc un changement impose un redéploiement, pas un restart).`,
      );
    }
  }

  return {
    base: '/studio/',
    plugins: [react()],
    // The hand-written landing and legal pages live in site/ and are served directly by server.js.
    // Vite must not treat anything as a public dir and copy it into dist/ alongside the SPA.
    publicDir: false,
    build: {
      outDir: 'dist',
      // The funnel is one page; a single bundle beats waterfalled chunks on a cold visit.
      chunkSizeWarningLimit: 700,
    },
    server: {
      port: 5180,
    },
  };
});
