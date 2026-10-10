"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const mongodb_1 = require("./db/mongodb");
const cors_middleware_1 = require("./middlewares/cors.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Global Middlewares
app.use(cors_middleware_1.corsMiddleware);
app.use((0, compression_1.default)({
    threshold: 1024,
    level: 6
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Request Logger
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});
// Auto DB Connection Middleware for Serverless & Long-running
app.use(async (_req, _res, next) => {
    try {
        await (0, mongodb_1.connectToDatabase)();
    }
    catch (err) {
        console.error('[DB Middleware] Auto-connect error:', err);
    }
    next();
});
// 1. Mount Central Backend REST API
app.use('/api', routes_1.default);
// 2. Static Assets for Unified Frontend & Panels (Standalone / Local Mode only; Vercel CDN handles static assets in production)
if (!process.env.VERCEL) {
    const candidateDirs = [
        path_1.default.resolve(__dirname, '../public'),
        path_1.default.resolve(__dirname, '../../public'),
        path_1.default.resolve(__dirname, 'public'),
        path_1.default.resolve(process.cwd(), 'Backend/public'),
        path_1.default.resolve(process.cwd(), 'public'),
        path_1.default.resolve(process.cwd(), 'dist/public')
    ];
    const publicDir = candidateDirs.find((d) => fs_1.default.existsSync(d)) || path_1.default.resolve(process.cwd(), 'Backend/public');
    const unifiedIndexPath = path_1.default.join(publicDir, 'index.html');
    const adminIndexPath = path_1.default.join(publicDir, 'admin', 'index.html');
    const consultantIndexPath = path_1.default.join(publicDir, 'consultant', 'index.html');
    // Serve static assets with explicit route bindings
    app.use('/assets', express_1.default.static(path_1.default.join(publicDir, 'assets'), {
        immutable: true,
        maxAge: '1y'
    }));
    app.use('/admin/assets', express_1.default.static(path_1.default.join(publicDir, 'admin/assets'), {
        immutable: true,
        maxAge: '1y'
    }));
    app.use('/consultant/assets', express_1.default.static(path_1.default.join(publicDir, 'consultant/assets'), {
        immutable: true,
        maxAge: '1y'
    }));
    app.use(express_1.default.static(publicDir, { index: false }));
    app.use('/admin', express_1.default.static(path_1.default.join(publicDir, 'admin'), { index: false }));
    app.use('/consultant', express_1.default.static(path_1.default.join(publicDir, 'consultant'), { index: false }));
    // Direct asset resolution fallback
    app.get(['/assets/*', '/admin/assets/*', '/consultant/assets/*'], (req, res) => {
        const targetPath = path_1.default.join(publicDir, req.path);
        if (fs_1.default.existsSync(targetPath)) {
            return res.sendFile(targetPath);
        }
        res.status(404).send('Asset Not Found');
    });
    // 3. Central Login Redirects (Enforcing http://localhost:5000/login as the ONLY login gateway)
    app.get(['/admin/login', '/consultant/login', '/client/login', '/signin', '/auth/login'], (req, res) => {
        if (req.path.startsWith('/admin'))
            return res.redirect('/login?role=admin');
        if (req.path.startsWith('/consultant'))
            return res.redirect('/login?role=therapist');
        if (req.path.startsWith('/client'))
            return res.redirect('/login?role=client');
        return res.redirect('/login');
    });
    // 3a. Super Admin Panel (/admin, /admin/*)
    app.get(['/admin', '/admin/*'], (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        if (fs_1.default.existsSync(adminIndexPath)) {
            res.sendFile(adminIndexPath);
        }
        else if (fs_1.default.existsSync(unifiedIndexPath)) {
            res.sendFile(unifiedIndexPath);
        }
        else {
            res.status(404).send('<h3>Hexpertify Super Admin build not found. Run "npm run build" to generate bundles.</h3>');
        }
    });
    // 3b. Consultant / Therapist Suite (/consultant, /consultant/*)
    app.get(['/consultant', '/consultant/*'], (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        if (fs_1.default.existsSync(unifiedIndexPath)) {
            res.sendFile(unifiedIndexPath);
        }
        else if (fs_1.default.existsSync(consultantIndexPath)) {
            res.sendFile(consultantIndexPath);
        }
        else {
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
    ], (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        if (fs_1.default.existsSync(unifiedIndexPath)) {
            res.sendFile(unifiedIndexPath);
        }
        else {
            res.status(404).send('<h3>Hexpertify Client Portal build not found. Run "npm run build" to generate bundles.</h3>');
        }
    });
    // SPA Catch-All Fallback for deep links (excluding /api and static files with extensions)
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        // If the request is for a missing static file with an extension, return 404 instead of index.html
        if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
            return res.status(404).send('File Not Found');
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        if (req.path.startsWith('/admin') && fs_1.default.existsSync(adminIndexPath)) {
            return res.sendFile(adminIndexPath);
        }
        if (req.path.startsWith('/consultant') && fs_1.default.existsSync(consultantIndexPath)) {
            return res.sendFile(consultantIndexPath);
        }
        if (fs_1.default.existsSync(unifiedIndexPath)) {
            return res.sendFile(unifiedIndexPath);
        }
        next();
    });
}
// Global Error Handler
app.use(error_middleware_1.errorMiddleware);
// Start Server & Connect Database
async function startServer() {
    try {
        console.log('====================================================');
        console.log('       HEXPERTIFY UNIFIED SINGLE-PORT PLATFORM      ');
        console.log('====================================================');
        await (0, mongodb_1.connectToDatabase)();
        const server = app.listen(config_1.config.port, () => {
            console.log(`⚡ [Platform Hub] http://localhost:${config_1.config.port}/`);
            console.log(`🛡️ [Super Admin]  http://localhost:${config_1.config.port}/admin`);
            console.log(`🩺 [Consultant]   http://localhost:${config_1.config.port}/consultant`);
            console.log(`👤 [Client Portal] http://localhost:${config_1.config.port}/client`);
            console.log(`🍃 [Central API]  http://localhost:${config_1.config.port}/api/health`);
            console.log('====================================================');
        });
        // Graceful Shutdown
        const shutdown = async (signal) => {
            console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
            server.close(async () => {
                await (0, mongodb_1.closeDatabase)();
                console.log('[Server] Shutdown complete.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('Fatal startup error:', error);
        process.exit(1);
    }
}
if (!process.env.VERCEL) {
    startServer();
}
exports.default = app;
