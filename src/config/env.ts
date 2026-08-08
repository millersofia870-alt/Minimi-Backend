import dotenv from 'dotenv';
dotenv.config();

const parseCorsOrigins = (value?: string) => {
  if (!value || value.trim() === '') {
    return ['*'];
  }

  const origins = value.split(',').map((item) => item.trim()).filter(Boolean);
  return origins.length > 0 ? origins : ['*'];
};

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),

  databaseUrl: process.env.DATABASE_URL ?? '',

  mysqlHost: process.env.MYSQLHOST ?? '',
  mysqlPort: parseInt(process.env.MYSQLPORT ?? '3306', 10),
  mysqlUser: process.env.MYSQLUSER ?? '',
  mysqlPassword: process.env.MYSQLPASSWORD ?? '',
  mysqlDatabase: process.env.MYSQLDATABASE ?? '',

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',

  adminSeedUsername: process.env.ADMIN_SEED_USERNAME ?? 'admin',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD ?? 'change-me-now',

  otpExpiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES ?? '5', 10),

  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY ?? '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? '',
    shortcode: process.env.MPESA_SHORTCODE ?? '174379',
    passkey: process.env.MPESA_PASSKEY ?? '',
    callbackUrl: process.env.MPESA_CALLBACK_URL ?? '',
    isSandbox: (process.env.MPESA_ENV ?? 'sandbox') !== 'production',
    sandboxBaseUrl: process.env.MPESA_SANDBOX_BASE_URL ?? 'https://sandbox.safaricom.co.ke',
    productionBaseUrl: process.env.MPESA_PRODUCTION_BASE_URL ?? 'https://api.safaricom.co.ke',
    baseUrl:
      process.env.MPESA_BASE_URL ||
      ((process.env.MPESA_ENV ?? 'sandbox') === 'production'
        ? (process.env.MPESA_PRODUCTION_BASE_URL ?? 'https://api.safaricom.co.ke')
        : (process.env.MPESA_SANDBOX_BASE_URL ?? 'https://sandbox.safaricom.co.ke')),
  },

  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
};
