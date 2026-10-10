// Vercel Express Gateway Entrypoint
const express = require('express');
const app = require('./dist/index');

const handler = app.default || app;
module.exports = handler;
