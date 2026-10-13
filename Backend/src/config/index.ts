import dotenv from 'dotenv';

dotenv.config({ override: true });
// Local secrets (e.g. payment gateway keys) live in the git-ignored .env.local and take precedence
dotenv.config({ path: '.env.local', override: true });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority',
  dbName: process.env.DB_NAME || 'hexpertify',
  ssoSecret: process.env.SSO_SECRET || 'hexpertify_enterprise_sso_secret_key_2026_secure',
  jwtSecret: process.env.JWT_SECRET || 'hexpertify_jwt_super_secret_key_2026',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || (process.env.VERCEL ? 'https://hexpertify-backend.vercel.app/api/auth/google/callback' : 'http://localhost:5000/api/auth/google/callback'),
  liveSiteUrl: process.env.LIVE_SITE_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || (process.env.VERCEL ? 'https://hexpertify-app.vercel.app' : ''),
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  payment: {
    provider: (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase() as 'razorpay' | 'cashfree',
    currency: 'INR',
    defaultSessionFee: Number(process.env.DEFAULT_SESSION_FEE || 1500),
    pendingExpiryMinutes: Number(process.env.PAYMENT_PENDING_EXPIRY_MINUTES || 30),
    // Public base URL of this backend, used for gateway notify/webhook URLs (e.g. https://hexpertify-backend.vercel.app)
    publicBaseUrl: process.env.BACKEND_PUBLIC_URL || '',
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
