const fs = require('fs');
const { execSync } = require('child_process');

console.log('[Vercel Install] Current working directory:', process.cwd());

try {
  if (fs.existsSync('next.config.ts') || fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs')) {
    console.log('[Vercel Install] Detected Next.js app directory. Running npm install...');
    execSync('npm install', { stdio: 'inherit' });
  } else if (fs.existsSync('Backend/package.json')) {
    console.log('[Vercel Install] Found Backend/package.json in root. Installing root and Backend...');
    execSync('npm install --include=dev', { stdio: 'inherit' });
    execSync('npm --prefix Backend install --include=dev', { stdio: 'inherit' });
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
