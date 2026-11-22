import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Therapist panel (/consultant). The build goes into the website's public folder (apps/web/public/consultant).
 * In dev, /api is proxied to the website (apps/web, port 3000), which serves the API.
 */
const port = Number(process.env.PORT || 5174);
const apiTarget = process.env.API_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  base: process.env.BASE_PATH || '/consultant/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dev-redirect-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/consultant' || req.url === '/') {
            res.writeHead(302, { Location: '/consultant/' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@workspace/api-client-react': path.resolve(import.meta.dirname, 'src/api-client/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  // The project's one env file is at the repo root (only VITE_* variables reach the browser)
  envDir: path.resolve(import.meta.dirname, '../..'),
  build: {
    outDir: path.resolve(import.meta.dirname, '../web/public/consultant'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    hmr: { overlay: false },
    fs: { strict: true },
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
  },
});
