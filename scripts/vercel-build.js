const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Vercel Build] Current working directory:', process.cwd());

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (fs.existsSync('Live_Panel/package.json')) {
    console.log('[Vercel Build] Root deployment detected. Building Live_Panel (Next.js)...');

    // 1. Ensure Live_Panel dependencies are installed
    console.log('[Vercel Build] Installing Live_Panel dependencies...');
    execSync('npm --prefix Live_Panel install --include=dev', { stdio: 'inherit' });

    // 2. Build Live_Panel Next.js app
    console.log('[Vercel Build] Building Live_Panel...');
    execSync('npm --prefix Live_Panel run build', { stdio: 'inherit' });

    // 3. Copy Live_Panel/.next to root ./.next
    const sourceNext = path.resolve('Live_Panel/.next');
    const targetNext = path.resolve('.next');
    if (fs.existsSync(sourceNext)) {
      console.log('[Vercel Build] Copying Live_Panel/.next to root .next...');
      copyDirRecursive(sourceNext, targetNext);
    }

    // 4. Copy Live_Panel/public to root ./public
    const sourcePublic = path.resolve('Live_Panel/public');
    const targetPublic = path.resolve('public');
    if (fs.existsSync(sourcePublic)) {
      console.log('[Vercel Build] Copying Live_Panel/public to root public...');
      copyDirRecursive(sourcePublic, targetPublic);
    }

    // 5. Ensure root next.config.ts exists
    if (fs.existsSync('Live_Panel/next.config.ts') && !fs.existsSync('next.config.ts')) {
      fs.copyFileSync('Live_Panel/next.config.ts', 'next.config.ts');
    }

    // 6. Ensure root tsconfig exists
    if (fs.existsSync('Live_Panel/tsconfig.json') && !fs.existsSync('tsconfig.json')) {
      fs.copyFileSync('Live_Panel/tsconfig.json', 'tsconfig.json');
    }

    // 7. Also build Backend if present (non-fatal)
    if (fs.existsSync('Backend/package.json')) {
      try {
        console.log('[Vercel Build] Building Backend artifacts...');
        execSync('npm --prefix Backend run build', { stdio: 'inherit' });
        if (fs.existsSync('Backend/dist/index.js')) {
          fs.copyFileSync('Backend/dist/index.js', 'index.js');
          fs.copyFileSync('Backend/dist/index.js', 'app.js');
        }
      } catch (beErr) {
        console.warn('[Vercel Build] Non-fatal Backend build warning:', beErr.message);
      }
    }
  } else if (fs.existsSync('src/index.ts') && fs.existsSync('package.json')) {
    // Inside Backend folder
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
