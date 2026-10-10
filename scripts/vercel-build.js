const fs = require('fs');
const { execSync } = require('child_process');

console.log('[Vercel Build] Current working directory:', process.cwd());

try {
  if (fs.existsSync('next.config.ts') || fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs')) {
    console.log('[Vercel Build] Detected Next.js app directory. Running Next.js build...');
    execSync('npm run build', { stdio: 'inherit' });
  } else if (fs.existsSync('Backend/package.json')) {
    console.log('[Vercel Build] Building Backend from root directory...');
    execSync('npm --prefix Backend run build', { stdio: 'inherit' });
    if (fs.existsSync('Backend/dist/index.js')) {
      fs.copyFileSync('Backend/dist/index.js', 'index.js');
      fs.copyFileSync('Backend/dist/index.js', 'app.js');
      fs.copyFileSync('Backend/dist/index.js', 'Backend/index.js');
      fs.copyFileSync('Backend/dist/index.js', 'Backend/app.js');
      fs.copyFileSync('Backend/dist/index.js', 'Backend/src/index.js');
    }
  } else if (fs.existsSync('src/index.ts') && fs.existsSync('package.json')) {
    console.log('[Vercel Build] Building Backend in current directory...');
    execSync('npm run build', { stdio: 'inherit' });
    if (fs.existsSync('dist/index.js')) {
      fs.copyFileSync('dist/index.js', 'index.js');
      fs.copyFileSync('dist/index.js', 'app.js');
      fs.copyFileSync('dist/index.js', 'src/index.js');
    }
  } else {
    console.log('[Vercel Build] Fallback building...');
    execSync('npm run build', { stdio: 'inherit' });
  }
  console.log('[Vercel Build] Build completed successfully.');
} catch (err) {
  console.error('[Vercel Build Error]', err);
  process.exit(1);
}
