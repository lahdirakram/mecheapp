'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Ligne de tableau cliquable. Un `<a>` ne peut pas envelopper des `<td>`, donc on navigue au clic,
 * avec le clavier en équivalent (tabIndex + Entrée) pour ne pas perdre l'accessibilité.
 */
export function ClickableRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className="row"
      tabIndex={0}
      role="link"
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </tr>
  );
}
