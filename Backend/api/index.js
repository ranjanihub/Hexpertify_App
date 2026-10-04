// Central Serverless Gateway Entrypoint for Vercel
const app = require('../dist/index');

module.exports = app.default || app;
