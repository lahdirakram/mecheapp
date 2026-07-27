import type { NextConfig } from 'next';

// Outil interne : pas d'optimisation d'images (les photos passent par notre proxy /api/img,
// qui streame depuis un bucket prive), et aucune dependance au workspace pnpm.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `pg` doit rester en require Node cote serveur, jamais bundle.
  serverExternalPackages: ['pg'],
};

export default nextConfig;
