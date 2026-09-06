const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autonome pour l'image Docker (.next/standalone).
  output: 'standalone',
  // Monorepo : trace les dépendances depuis la racine du workspace.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    // Le lint n'est pas configuré dans ce projet — ne pas bloquer le build.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
