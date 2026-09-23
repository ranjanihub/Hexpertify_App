import express, { Express, Request, Response } from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { connectToDatabase, closeDatabase } from './db/mongodb';
import { corsMiddleware } from './middlewares/cors.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import router from './routes';

const app: Express = express();

// Global Middlewares
app.use(corsMiddleware);
app.use(compression({
  threshold: 1024,
  level: 6
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logger
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Auto DB Connection Middleware for Serverless & Long-running
app.use(async (_req, _res, next) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('[DB Middleware] Auto-connect error:', err);
  }
  next();
});

// 1. Mount Central Backend REST API
app.use('/api', router);

// 2. Static Assets for Unified Frontend & Panels
const candidateDirs = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
  path.resolve(__dirname, 'public'),
  path.resolve(process.cwd(), 'Backend/public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'dist/public')
];
const publicDir = candidateDirs.find((d) => fs.existsSync(d)) || path.resolve(process.cwd(), 'Backend/public');

const unifiedIndexPath = path.join(publicDir, 'index.html');
const adminIndexPath = path.join(publicDir, 'admin', 'index.html');
const consultantIndexPath = path.join(publicDir, 'consultant', 'index.html');

// Serve static assets with explicit route bindings
app.use('/assets', express.static(path.join(publicDir, 'assets'), {
  immutable: true,
  maxAge: '1y'
}));
app.use('/admin/assets', express.static(path.join(publicDir, 'admin/assets'), {
  immutable: true,
  maxAge: '1y'
}));
app.use('/consultant/assets', express.static(path.join(publicDir, 'consultant/assets'), {
  immutable: true,
  maxAge: '1y'
}));
app.use(express.static(publicDir, { index: false }));
app.use('/admin', express.static(path.join(publicDir, 'admin'), { index: false }));
app.use('/consultant', express.static(path.join(publicDir, 'consultant'), { index: false }));

// Direct asset resolution fallback
app.get(['/assets/*', '/admin/assets/*', '/consultant/assets/*'], (req: Request, res: Response) => {
  const targetPath = path.join(publicDir, req.path);
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  res.status(404).send('Asset Not Found');
});

// 3. Central Login Redirects (Enforcing http://localhost:5000/login as the ONLY login gateway)
app.get(['/admin/login', '/consultant/login', '/client/login', '/signin', '/auth/login'], (req: Request, res: Response) => {
  if (req.path.startsWith('/admin')) return res.redirect('/login?role=admin');
  if (req.path.startsWith('/consultant')) return res.redirect('/login?role=therapist');
  if (req.path.startsWith('/client')) return res.redirect('/login?role=client');
  return res.redirect('/login');
});

// 3a. Super Admin Panel (/admin, /admin/*)
app.get(['/admin', '/admin/*'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (fs.existsSync(adminIndexPath)) {
    res.sendFile(adminIndexPath);
  } else if (fs.existsSync(unifiedIndexPath)) {
    res.sendFile(unifiedIndexPath);
  } else {
    res.status(404).send('<h3>Hexpertify Super Admin build not found. Run "npm run build" to generate bundles.</h3>');
  }
});

// 3b. Consultant / Therapist Suite (/consultant, /consultant/*)
app.get(['/consultant', '/consultant/*'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (fs.existsSync(consultantIndexPath)) {
    res.sendFile(consultantIndexPath);
  } else if (fs.existsSync(unifiedIndexPath)) {
    res.sendFile(unifiedIndexPath);
  } else {
    res.status(404).send('<h3>Hexpertify Consultant Suite build not found. Run "npm run build" to generate bundles.</h3>');
  }
});

// 3c. Client Care Portal & Platform Hub (/, /login, /client, etc.)
app.get([
  '/', 
  '/login', 
  '/signin', 
  '/auth/login',
  '/client', 
  '/client/*',
  '/therapist',
  '/sessions',
  '/messages',
  '/activities',
  '/assessments',
  '/progress',
  '/resources',
  '/profile'
], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (fs.existsSync(unifiedIndexPath)) {
    res.sendFile(unifiedIndexPath);
  } else {
    res.status(404).send('<h3>Hexpertify Client Portal build not found. Run "npm run build" to generate bundles.</h3>');
  }
});

// SPA Catch-All Fallback for deep links (excluding /api and static files with extensions)
app.get('*', (req: Request, res: Response, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  // If the request is for a missing static file with an extension, return 404 instead of index.html
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
    return res.status(404).send('File Not Found');
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (req.path.startsWith('/admin') && fs.existsSync(adminIndexPath)) {
    return res.sendFile(adminIndexPath);
  }
  if (req.path.startsWith('/consultant') && fs.existsSync(consultantIndexPath)) {
    return res.sendFile(consultantIndexPath);
  }
  if (fs.existsSync(unifiedIndexPath)) {
    return res.sendFile(unifiedIndexPath);
  }
  next();
});

// Global Error Handler
app.use(errorMiddleware);

// Start Server & Connect Database
async function startServer() {
  try {
    console.log('====================================================');
    console.log('       HEXPERTIFY UNIFIED SINGLE-PORT PLATFORM      ');
    console.log('====================================================');

    await connectToDatabase();

    const server = app.listen(config.port, () => {
      console.log(`⚡ [Platform Hub] http://localhost:${config.port}/`);
      console.log(`🛡️ [Super Admin]  http://localhost:${config.port}/admin`);
      console.log(`🩺 [Consultant]   http://localhost:${config.port}/consultant`);
      console.log(`👤 [Client Portal] http://localhost:${config.port}/client`);
      console.log(`🍃 [Central API]  http://localhost:${config.port}/api/health`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await closeDatabase();
        console.log('[Server] Shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
