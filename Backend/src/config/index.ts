import dotenv from 'dotenv';

// Standalone API only: inside the website (Next.js) the env files are already loaded by Next
if (!process.env.NEXT_RUNTIME) {
  dotenv.config({ override: true });
  // Local secrets (e.g. payment gateway keys) live in the git-ignored .env.local and take precedence
  dotenv.config({ path: '.env.local', override: true });
}

// Read after dotenv so a MONGODB_URI in the env files still applies
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mongodbUri, dbName } = require('./database') as typeof import('./database');

/** Public URL of this deployment (Vercel), used for absolute links such as gateway webhooks */
const deploymentUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri,
  dbName,
  ssoSecret: process.env.SSO_SECRET || 'hexpertify_enterprise_sso_secret_key_2026_secure',
  jwtSecret: process.env.JWT_SECRET || 'hexpertify_jwt_super_secret_key_2026',
  // Inside the website the same Google OAuth client is configured under the website's variable names
  googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.NEXT_GOOGLE_CLIENT_SECRET || '',
  // ID tokens from either sign-in button (panel login: GOOGLE_CLIENT_ID; website One Tap: NEXT_PUBLIC_GOOGLE_CLIENT_ID)
  googleAudiences: Array.from(new Set([process.env.GOOGLE_CLIENT_ID, process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID].filter(Boolean))) as string[],
  // Empty = derived from the request host (see googleRedirectUri in auth.controller)
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  liveSiteUrl: process.env.LIVE_SITE_URL || 'http://localhost:3000',
  // Empty = same origin: the website, the panels and the API are one deployment
  frontendUrl: process.env.FRONTEND_URL || '',
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  payment: {
    provider: (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase() as 'razorpay' | 'cashfree',
    currency: 'INR',
    defaultSessionFee: Number(process.env.DEFAULT_SESSION_FEE || 1500),
    pendingExpiryMinutes: Number(process.env.PAYMENT_PENDING_EXPIRY_MINUTES || 30),
    // Public base URL of this deployment, used for gateway notify/webhook URLs
    publicBaseUrl: process.env.BACKEND_PUBLIC_URL || deploymentUrl,
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
    },
    cashfree: {
      appId: process.env.CASHFREE_APP_ID || '',
      secretKey: process.env.CASHFREE_SECRET_KEY || '',
      env: (process.env.CASHFREE_ENV || 'sandbox').toLowerCase() as 'sandbox' | 'production',
      apiVersion: process.env.CASHFREE_API_VERSION || '2023-08-01'
    }
  },
  corsOrigins: [
    'http://localhost:5000', // Single Port Platform
    'http://localhost:5175', // Super Admin standalone
    'http://localhost:5173', // Client standalone
    'http://localhost:3000', // Live Web
    'http://localhost:5001',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ]
};
