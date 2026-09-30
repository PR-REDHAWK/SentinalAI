const express = require('express');
const router = express.Router();
const engine = require('../services/simulatorEngine');

// GET chaos engine full state
router.get('/status', (req, res) => {
  res.json(engine.getFullState());
});

// POST trigger specific chaos scenario
router.post('/trigger', (req, res) => {
  try {
    const { scenario } = req.body;
    const newState = engine.triggerScenario(scenario);
    res.json({ success: true, state: newState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST start blind incident test
router.post('/blind-test', (req, res) => {
  try {
    const newState = engine.startBlindTest();
    res.json({ success: true, state: newState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reveal ground truth for blind test
router.post('/reveal', (req, res) => {
  try {
    const revelation = engine.revealGroundTruth();
    res.json({ success: true, revelation, fullState: engine.getFullState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset environment to baseline health
router.post('/reset', (req, res) => {
  try {
    const newState = engine.resetEnvironment();
    res.json({ success: true, state: newState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
