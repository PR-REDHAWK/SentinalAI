const express = require('express');
const incidentRoutes = require('./incidentRoutes');
const userRoutes = require('./userRoutes');
const webhookRoutes = require('./webhookRoutes');

const router = express.Router();

// Health Check
const { getDBStatus } = require('../config/db');

router.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    success: true,
    status: 'running',
    database: dbStatus,
    environment: {
      isVercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

const analyticsRoutes = require('./analyticsRoutes');

router.use('/incidents', incidentRoutes);
router.use('/users', userRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
