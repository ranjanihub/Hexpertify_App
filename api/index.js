// Central Serverless Gateway Entrypoint for Vercel (Root)
const express = require('express');
const app = require('../Backend/dist/index');

const handler = app.default || app;
module.exports = handler;
