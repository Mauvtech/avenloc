export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? '',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? '',
    // Durée du refresh token en secondes (30 jours)
    refreshTtlSeconds: 30 * 24 * 60 * 60,
  },

  google: {
    clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    callbackUrl:
      process.env['GOOGLE_CALLBACK_URL'] ??
      'http://localhost:3001/auth/google/callback',
  },

  stripe: {
    secretKey: process.env['STRIPE_SECRET_KEY'] ?? '',
    webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
  },

  features: {
    // Flags actifs au démarrage, ex. FEATURES="simulatePayments"
    initial: (process.env['FEATURES'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // Autorise PATCH /features (toggle à chaud). Actif hors production par défaut.
    adminEnabled:
      (process.env['FEATURES_ADMIN'] ??
        (process.env['NODE_ENV'] === 'production' ? 'false' : 'true')) === 'true',
  },

  storage: {
    // Dossier disque pour le stockage local (vide → <cwd>/uploads).
    dir: process.env['UPLOADS_DIR'] ?? '',
    // Base d'URL publique de l'API (pour construire les URLs des fichiers locaux).
    publicUrl:
      process.env['API_PUBLIC_URL'] ??
      `http://localhost:${parseInt(process.env['PORT'] ?? '3001', 10)}`,
  },

  s3: {
    endpoint: process.env['S3_ENDPOINT'] ?? '',
    region: process.env['S3_REGION'] ?? 'eu-west-3',
    bucket: process.env['S3_BUCKET'] ?? 'aven-media',
    accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
  },

  frontend: {
    url: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
