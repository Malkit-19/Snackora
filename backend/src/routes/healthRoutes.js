const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/responseHandler');

router.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  const healthData = {
    status: isDbConnected ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Snackora Core Platform API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      host: mongoose.connection.host || 'local',
      name: mongoose.connection.name || 'snackora'
    }
  };

  return sendSuccess(
    res,
    isDbConnected ? 'Snackora API is operating normally' : 'Snackora API is operating in degraded state (DB disconnected)',
    healthData,
    isDbConnected ? 200 : 503
  );
});

module.exports = router;
