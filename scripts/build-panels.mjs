/**
 * Builds the three React panels into the website's public folder (apps/web/public):
 *   apps/client     → public/index.html, public/assets, public/client/index.html
 *   apps/consultant → public/consultant
 *   apps/admin      → public/admin
 * Runs before `next build` (apps/web "build" script), locally and on Vercel.
 * Installs a panel's packages first when they are missing (always on CI).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const panels = ['client', 'consultant', 'admin'];
const isCI = Boolean(process.env.CI || process.env.VERCEL);

for (const name of panels) {
  const dir = path.join(root, 'apps', name);
  const run = (cmd) => execSync(cmd, { cwd: dir, stdio: 'inherit' });
  console.log(`\n[build-panels] ${name}`);
  if (isCI || !existsSync(path.join(dir, 'node_modules'))) {
    run('npm ci --include=dev --no-audit --no-fund');
  }
  run('npm run build');
}
console.log('\n[build-panels] done');
