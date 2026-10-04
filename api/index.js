// Central Serverless Gateway Entrypoint for Vercel (Root)
const app = require('../Backend/dist/index');

module.exports = app.default || app;
