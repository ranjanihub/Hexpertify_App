// Static / Serverless Vercel entrypoint fallback (CommonJS)
const fs = require('fs');
const path = require('path');

function handler(req, res) {
  const possiblePaths = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'build', 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(process.cwd(), 'build', 'index.html'),
  ];
  for (const htmlPath of possiblePaths) {
    if (fs.existsSync(htmlPath)) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(fs.readFileSync(htmlPath, 'utf8'));
      }
      return fs.readFileSync(htmlPath, 'utf8');
    }
  }
  if (res && typeof res.end === 'function') {
    res.end('OK');
  }
}

module.exports = handler;
module.exports.default = handler;
