import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  databaseSsl: boolean;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  sendgridApiKey: string;
  sendgridFromEmail: string;
  sendgridFromName: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceStarter: string;
  stripePriceGrowth: string;
  stripePricePro: string;
  frontendUrl: string;
  apiUrl: string;
  sessionSecret: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.warn(`WARNING: Environment variable ${key} is not set. Using placeholder.`);
    return `placeholder-${key.toLowerCase()}`;
  }
  return value;
}

export const env: EnvConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: getEnvVar('DATABASE_URL', 'postgresql://localhost:5432/hvac_renewiq'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtAccessSecret: getEnvVar('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  googleClientId: getEnvVar('GOOGLE_CLIENT_ID'),
  googleClientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
  googleCallbackUrl: getEnvVar('GOOGLE_CALLBACK_URL', 'http://localhost:3000/api/auth/google/callback'),
  sendgridApiKey: getEnvVar('SENDGRID_API_KEY'),
  sendgridFromEmail: getEnvVar('SENDGRID_FROM_EMAIL', 'noreply@hvacrenevq.com'),
  sendgridFromName: getEnvVar('SENDGRID_FROM_NAME', 'HVAC RenewIQ'),
  stripeSecretKey: getEnvVar('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),
  stripePriceStarter: getEnvVar('STRIPE_PRICE_STARTER'),
  stripePriceGrowth: getEnvVar('STRIPE_PRICE_GROWTH'),
  stripePricePro: getEnvVar('STRIPE_PRICE_PRO'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  sessionSecret: getEnvVar('SESSION_SECRET'),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};