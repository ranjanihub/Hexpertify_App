// Express app entrypoint for the Vercel Services deploy (hexpertify-test).
// bundle/index.js is built by scripts/bundle-service.js with every dependency inlined; it must exist
// before the build, so this committed file loads it.
const app = require('./bundle/index.js');

module.exports = app.default || app;
