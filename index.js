// Vercel Express Gateway Entrypoint (Root)
let express;
try {
  express = require('express');
} catch (e) {
  express = require('./Backend/node_modules/express');
}
const app = require('./Backend/dist/index');

const handler = app.default || app;
module.exports = handler;
