import express, { Express } from 'express';
import { connectToDatabase } from './db/mongodb';
import { corsMiddleware } from './middlewares/cors.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import router from './routes';

/**
 * The Hexpertify REST API (/api/*) as one Express app. The website (Live_Panel, Next.js) serves it on its
 * own domain from pages/api/core/[[...path]].ts, so the site, the panels and the API run as one deployment.
 * src/index.ts wraps it for standalone local runs (port 5000, with the panel bundles).
 */
const apiApp: Express = express();

apiApp.disable('x-powered-by');
apiApp.use(corsMiddleware);
// Payment gateway webhooks need the exact raw body for signature verification (must precede express.json)
apiApp.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }));
apiApp.use(express.json({ limit: '50mb' }));
apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logger
apiApp.use((req, _res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Auto DB Connection Middleware for Serverless & Long-running
apiApp.use(async (_req, _res, next) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('[DB Middleware] Auto-connect error:', err);
  }
  next();
});

apiApp.use('/api', router);

// API errors end here (a sub-app's error handler keeps them out of the host app)
apiApp.use(errorMiddleware);

export default apiApp;
