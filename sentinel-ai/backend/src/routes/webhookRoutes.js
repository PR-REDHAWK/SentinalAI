const express = require('express');
const {
  datadogWebhook,
  prometheusWebhook,
  cloudwatchWebhook,
  kubernetesWebhook
} = require('../controllers/WebhookController');

const router = express.Router();

router.post('/datadog', datadogWebhook);
router.post('/prometheus', prometheusWebhook);
router.post('/cloudwatch', cloudwatchWebhook);
router.post('/kubernetes', kubernetesWebhook);

module.exports = router;
