const fs = require('fs');
const { execSync } = require('child_process');

console.log('[Vercel Install] Current working directory:', process.cwd());

try {
  if (fs.existsSync('Live_Panel/package.json')) {
    console.log('[Vercel Install] Detected monorepo root. Installing root and Live_Panel...');
    execSync('npm install --include=dev', { stdio: 'inherit' });
    execSync('npm --prefix Live_Panel install --include=dev', { stdio: 'inherit' });
  } else if (fs.existsSync('src/index.ts') && fs.existsSync('package.json')) {
    console.log('[Vercel Install] Running inside Backend folder. Installing...');
    execSync('npm install --include=dev', { stdio: 'inherit' });
  } else {
    console.log('[Vercel Install] Standard install...');
    execSync('npm install', { stdio: 'inherit' });
  }
  console.log('[Vercel Install] Dependencies installed successfully.');
} catch (err) {
  console.error('[Vercel Install Error]', err);
  process.exit(1);
}
