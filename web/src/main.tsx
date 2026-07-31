import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root introuvable');

// config.ts throws when VITE_SUPABASE_* are missing, and a blank white page is the worst possible
// way to learn that. Import it dynamically so the failure can be rendered instead.
(async () => {
  try {
    const { App } = await import('./App');
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    createRoot(root).render(
      <div className="m-fatal">
        <h1>Le studio ne peut pas démarrer.</h1>
        <p>{msg}</p>
      </div>,
    );
  }
})();
