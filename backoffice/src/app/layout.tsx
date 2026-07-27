import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { EnvBanner } from '@/components/EnvBanner';

export const metadata: Metadata = {
  title: 'Backoffice Mèche',
  description: 'Dashboard admin local, lecture seule.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <EnvBanner />
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
