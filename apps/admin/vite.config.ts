import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/',
  // The project's one env file is at the repo root (only VITE_* variables reach the browser)
  envDir: path.resolve(__dirname, '../..'),
  plugins: [
    react(),
    {
      name: 'dev-redirect-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/admin' || req.url === '/') {
            res.writeHead(302, { Location: '/admin/' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  build: {
    // Into the website's public folder (apps/web/public/admin)
    outDir: path.resolve(__dirname, '../web/public/admin'),
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // The website (apps/web) serves the API
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
