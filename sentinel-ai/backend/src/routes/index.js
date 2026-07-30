const express = require('express');
const incidentRoutes = require('./incidentRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'running'
  });
});

router.use('/incidents', incidentRoutes);
router.use('/users', userRoutes);

module.exports = router;
