const Incident = require('../models/Incident');
const TimelineEvent = require('../models/TimelineEvent');
const asyncHandler = require('../middleware/asyncHandler');
const { analyzeIncident } = require('../services/ai/geminiService');
const { normalizeTelemetry } = require('../services/telemetryNormalizer');
const { detectAnomalies } = require('../services/anomalyDetector');

// Shared handler for all webhooks
const processWebhook = async (req, res, source) => {
  const io = req.app.get('io');
  const payload = req.body;

  // Immediately respond to the webhook provider to prevent timeouts
  res.status(202).json({ success: true, message: `Webhook received from ${source}, processing started.` });

  try {
    // 1. Normalize incoming raw provider payload into standardized telemetry
    const normalizedTelemetry = normalizeTelemetry(payload, source);

    // 2. Run deterministic anomaly detection engine on normalized telemetry
    const anomalyReport = detectAnomalies(normalizedTelemetry);

    // 3. Create a base unanalyzed incident retaining raw payload, normalized telemetry, and detected anomalies
    const initialIncident = await Incident.create({
      title: `[${source.toUpperCase()}] New Alert Detected`,
      description: `Raw payload received: ${JSON.stringify(payload).substring(0, 200)}...`,
      severity: 'Medium', // default until AI analyzes
      category: 'Infrastructure', // default
      affectedService: normalizedTelemetry?.service || 'Unknown',
      affectedRegion: normalizedTelemetry?.region || 'Global',
      source: source.toLowerCase(),
      rawPayload: payload,
      normalizedTelemetry: normalizedTelemetry,
      anomalies: anomalyReport.anomalies || [],
      anomalySummary: anomalyReport,
      status: 'Investigating'
    });

    // 4. Emit 'new-incident' socket event to frontend
    if (io) {
      io.emit('new-incident', initialIncident);
    }

    // 5. Create timeline event for alert reception and anomaly detection
    await TimelineEvent.create({
      incidentId: initialIncident._id,
      event: 'alert',
      title: `Alert Received from ${source}`,
      description: `Telemetry ingested and normalized. ${anomalyReport.summary}`
    });

    // 6. Pass payload to Gemini AI for structural analysis (maintaining existing RCA workflow)
    const aiAnalysis = await analyzeIncident(payload, source);

    // 7. Update incident with AI structured data, preserving raw, normalized telemetry, and anomalies
    const updatedIncident = await Incident.findByIdAndUpdate(
      initialIncident._id,
      {
        title: aiAnalysis.title || initialIncident.title,
        description: JSON.stringify(payload, null, 2),
        severity: aiAnalysis.severity || 'Medium',
        category: aiAnalysis.category || 'Infrastructure',
        affectedService: aiAnalysis.affectedService || normalizedTelemetry?.service || 'Unknown',
        affectedRegion: aiAnalysis.affectedRegion || normalizedTelemetry?.region || 'Global',
        source: source.toLowerCase(),
        rawPayload: payload,
        normalizedTelemetry: normalizedTelemetry,
        anomalies: anomalyReport.anomalies || [],
        anomalySummary: anomalyReport,
        aiScore: aiAnalysis.confidence || 0,
        aiSummary: aiAnalysis.aiSummary,
        rootCause: aiAnalysis.rootCause,
        businessImpact: aiAnalysis.businessImpact,
        recommendations: aiAnalysis.recommendations,
      },
      { new: true }
    );

    // 8. Create timeline event for AI analysis completion
    await TimelineEvent.create({
      incidentId: initialIncident._id,
      event: 'ai',
      title: 'AI Analysis Complete',
      description: 'Gemini has structured the alert, predicted root cause, and generated recommendations.'
    });

    // 9. Emit 'incident-updated' socket event
    if (io) {
      io.emit('incident-updated', updatedIncident);
    }

  } catch (error) {
    console.error(`Error processing webhook from ${source}:`, error);
  }
};

// @desc    Handle Datadog Webhook
// @route   POST /api/webhooks/datadog
// @access  Public
exports.datadogWebhook = asyncHandler(async (req, res, next) => {
  await processWebhook(req, res, 'Datadog');
});

// @desc    Handle Prometheus Webhook
// @route   POST /api/webhooks/prometheus
// @access  Public
exports.prometheusWebhook = asyncHandler(async (req, res, next) => {
  await processWebhook(req, res, 'Prometheus');
});

// @desc    Handle CloudWatch Webhook
// @route   POST /api/webhooks/cloudwatch
// @access  Public
exports.cloudwatchWebhook = asyncHandler(async (req, res, next) => {
  await processWebhook(req, res, 'CloudWatch');
});

// @desc    Handle Kubernetes Webhook
// @route   POST /api/webhooks/kubernetes
// @access  Public
exports.kubernetesWebhook = asyncHandler(async (req, res, next) => {
  await processWebhook(req, res, 'Kubernetes');
});
