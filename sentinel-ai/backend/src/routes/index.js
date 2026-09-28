const express = require('express');
const incidentRoutes = require('./incidentRoutes');
const userRoutes = require('./userRoutes');
const webhookRoutes = require('./webhookRoutes');

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'running'
  });
});

const analyticsRoutes = require('./analyticsRoutes');

router.use('/incidents', incidentRoutes);
router.use('/users', userRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
