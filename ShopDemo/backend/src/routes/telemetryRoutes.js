const express = require('express');
const router = express.Router();
const engine = require('../services/simulatorEngine');
const { formatTelemetryForSentinel } = require('../services/telemetryAdapter');

router.get('/live', (req, res) => {
  res.json(engine.getFullState());
});

router.get('/sentinel-payload', (req, res) => {
  const fullState = engine.getFullState();
  const formatted = formatTelemetryForSentinel(fullState);
  res.json(formatted);
});

module.exports = router;
