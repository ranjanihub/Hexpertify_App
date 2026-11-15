/**
 * Bundles the Express app into one self-contained file (bundle/index.js) for the Vercel Services
 * deploy (hexpertify-test). That builder packaged the function without node_modules
 * ("Cannot find module 'express'"), so every dependency is inlined instead.
 * Optional peer modules that the libraries only try-require stay external.
 */
const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/index.ts')],
  outfile: path.join(root, 'bundle/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'warning',
  external: [
    // mongodb optional integrations
    'kerberos', '@mongodb-js/zstd', '@aws-sdk/credential-providers', 'snappy', 'socks',
    'aws4', 'mongodb-client-encryption',
    // ws optional native speedups
    'bufferutil', 'utf-8-validate',
  ],
});

console.log('[bundle-service] wrote bundle/index.js');
