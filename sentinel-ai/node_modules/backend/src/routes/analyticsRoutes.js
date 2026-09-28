const express = require('express');
const { getAnalyticsSummary } = require('../controllers/AnalyticsController');

const router = express.Router();

router.route('/summary').get(getAnalyticsSummary);

module.exports = router;
