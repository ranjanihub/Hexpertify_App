import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Client portal (/client and the client deep links). The build goes into the website's public folder
 * (apps/web/public): index.html + /assets, and a copy of index.html at /client/index.html.
 * In dev, /api is proxied to the website (apps/web, port 3000), which serves the API.
 */
const port = Number(process.env.PORT || 5173);
const webPublicDir = path.resolve(import.meta.dirname, '../web/public');
const apiTarget = process.env.API_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      // Only this app writes public/assets; clear the previous build's hashed files first
      name: 'clean-assets-dir',
      apply: 'build',
      buildStart() {
        fs.rmSync(path.join(webPublicDir, 'assets'), { recursive: true, force: true });
      },
    },
    {
      name: 'copy-client-index',
      apply: 'build',
      closeBundle() {
        fs.mkdirSync(path.join(webPublicDir, 'client'), { recursive: true });
        fs.copyFileSync(path.join(webPublicDir, 'index.html'), path.join(webPublicDir, 'client', 'index.html'));
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
    outDir: webPublicDir,
    // The website's own files live in the same folder
    emptyOutDir: false,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
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
