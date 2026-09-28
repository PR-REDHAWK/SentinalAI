const Incident = require('../models/Incident');
const TimelineEvent = require('../models/TimelineEvent');
const asyncHandler = require('../middleware/asyncHandler');
const { analyzeIncident } = require('../services/ai/geminiService');
const { normalizeTelemetry } = require('../services/telemetryNormalizer');
const { detectAnomalies } = require('../services/anomalyDetector');
const { identifyIncident } = require('../services/incidentIdentifier');
const { buildEvidencePackage, reasonOverIncident } = require('../services/ai/geminiReasoningService');

// Shared handler for all webhooks
const processWebhook = async (req, res, source) => {
  const io = req.app.get('io');
  const payload = req.body;

  // Immediately respond to the webhook provider to prevent timeouts
  res.status(202).json({ success: true, message: `Webhook received from ${source}, processing started.` });

  try {
    // 1. Normalize incoming raw provider payload into standardized telemetry (Phase 1)
    const normalizedTelemetry = normalizeTelemetry(payload, source);

    // 2. Run deterministic anomaly detection engine on normalized telemetry (Phase 2)
    const anomalyReport = detectAnomalies(normalizedTelemetry);

    // 3. Run multi-signal incident identification engine (Phase 3)
    const incidentIdentification = identifyIncident(normalizedTelemetry, anomalyReport);

    // 4. Run cross-signal correlation & root-cause evidence engine (Phase 4)
    const evidenceCorrelation = correlateEvidence(normalizedTelemetry, anomalyReport, incidentIdentification);

    // 5. Construct Phase 5 Structured AI Evidence Package
    const evidencePackage = buildEvidencePackage(
      normalizedTelemetry,
      anomalyReport,
      incidentIdentification,
      evidenceCorrelation,
      payload
    );

    // 6. Create a base incident with deterministic intelligence and PENDING AI status
    const initialIncident = await Incident.create({
      title: `[${source.toUpperCase()}] ${incidentIdentification.primaryHypothesis.displayName || 'New Alert Detected'}`,
      description: `Raw payload received: ${JSON.stringify(payload).substring(0, 200)}...`,
      severity: incidentIdentification.primaryHypothesis.severity === 'CRITICAL' ? 'Critical' : 'Medium',
      category: 'Infrastructure', // default
      affectedService: normalizedTelemetry?.service || 'Unknown',
      affectedRegion: normalizedTelemetry?.region || 'Global',
      source: source.toLowerCase(),
      rawPayload: payload,
      normalizedTelemetry: normalizedTelemetry,
      anomalies: anomalyReport.anomalies || [],
      anomalySummary: anomalyReport,
      identifiedIncident: incidentIdentification.primaryHypothesis,
      incidentHypotheses: incidentIdentification.hypotheses || [],
      primaryRootCause: evidenceCorrelation.primaryRootCause,
      rootCauseCandidates: evidenceCorrelation.rootCauseCandidates || [],
      evidenceClusters: evidenceCorrelation.evidenceClusters || [],
      evidenceChain: evidenceCorrelation.evidenceChain || [],
      aiAnalysisStatus: 'PENDING',
      status: 'Investigating'
    });

    // 7. Emit 'new-incident' socket event to frontend immediately with deterministic intelligence
    if (io) {
      io.emit('new-incident', initialIncident);
    }

    // 8. Create timeline event for alert reception, incident identification, and evidence correlation
    await TimelineEvent.create({
      incidentId: initialIncident._id,
      event: 'alert',
      title: `Alert Received: ${incidentIdentification.primaryHypothesis.displayName}`,
      description: `Telemetry normalized & classified as '${incidentIdentification.primaryHypothesis.displayName}' (${incidentIdentification.primaryHypothesis.confidence}% confidence). Leading root cause hypothesis: ${evidenceCorrelation.primaryRootCause.candidate} (${evidenceCorrelation.primaryRootCause.confidence}% confidence).`
    });

    // 9. Execute Phase 5 Gemini AI Reasoning on the structured evidence package
    let aiResult;
    try {
      aiResult = await reasonOverIncident(evidencePackage);
    } catch (aiErr) {
      console.error('AI Reasoning invocation error:', aiErr);
      aiResult = {
        status: 'FAILED',
        error: aiErr.message,
        analyzedAt: new Date(),
        data: null
      };
    }

    const aiData = aiResult.data || {};

    // 10. Update incident with Phase 5 AI structured reasoning & legacy backward compatibility
    const updatedIncident = await Incident.findByIdAndUpdate(
      initialIncident._id,
      {
        title: aiData.summary ? aiData.summary.substring(0, 90) : initialIncident.title,
        description: JSON.stringify(payload, null, 2),
        severity: aiData.incident?.severity || initialIncident.severity || 'Medium',
        category: 'Infrastructure',
        affectedService: normalizedTelemetry?.service || 'Unknown',
        affectedRegion: normalizedTelemetry?.region || 'Global',
        source: source.toLowerCase(),
        rawPayload: payload,
        normalizedTelemetry: normalizedTelemetry,
        anomalies: anomalyReport.anomalies || [],
        anomalySummary: anomalyReport,
        identifiedIncident: incidentIdentification.primaryHypothesis,
        incidentHypotheses: incidentIdentification.hypotheses || [],
        primaryRootCause: evidenceCorrelation.primaryRootCause,
        rootCauseCandidates: evidenceCorrelation.rootCauseCandidates || [],
        evidenceClusters: evidenceCorrelation.evidenceClusters || [],
        evidenceChain: evidenceCorrelation.evidenceChain || [],
        aiAnalysisStatus: aiResult.status || 'COMPLETED',
        aiAnalysis: aiData,
        aiAnalyzedAt: aiResult.analyzedAt || new Date(),
        aiModel: aiResult.model || 'gemini-2.5-flash',
        aiAnalysisVersion: aiResult.analysisVersion || '5.0.0',
        aiEvidenceFingerprint: aiResult.fingerprint || null,
        aiError: aiResult.error || null,
        aiScore: aiData.rootCauseAnalysis?.confidence || aiData.incident?.confidence || 80,
        aiSummary: aiData.summary || aiData.evidenceNarrative || 'Analysis complete',
        rootCause: {
          summary: aiData.rootCauseAnalysis?.primaryHypothesis || evidenceCorrelation.primaryRootCause.candidate,
          details: aiData.rootCauseAnalysis?.explanation || aiData.evidenceNarrative || '',
          confidence: aiData.rootCauseAnalysis?.confidence || evidenceCorrelation.primaryRootCause.confidence,
          evidence: aiData.rootCauseAnalysis?.evidence || []
        },
        businessImpact: {
          affectedUsers: aiData.businessImpact?.userImpact || 'Unknown',
          regions: [normalizedTelemetry?.region || 'Global'],
          estimatedRevenueLoss: aiData.businessImpact?.estimatedImpact || 'Quantitative impact cannot be determined from available telemetry.',
          serviceDegradation: aiData.businessImpact?.summary || 'Degraded performance'
        },
        recommendations: (aiData.recommendedActions || []).map((rec, idx) => ({
          action: rec.action,
          description: rec.reason,
          confidence: 90,
          type: rec.priority,
          command: rec.command,
          requiresApproval: rec.requiresApproval
        }))
      },
      { new: true }
    );

    // 11. Create timeline event for AI reasoning completion
    await TimelineEvent.create({
      incidentId: initialIncident._id,
      event: 'ai',
      title: aiResult.status === 'COMPLETED' ? 'AI Grounded RCA Synthesis Complete' : 'AI Reasoning Fallback Applied',
      description: aiResult.status === 'COMPLETED'
        ? `Gemini synthesized root cause: "${aiData.rootCauseAnalysis?.primaryHypothesis}" (${aiData.rootCauseAnalysis?.confidence}% confidence) based on ${evidenceCorrelation.evidenceClusters.length} evidence clusters.`
        : `Deterministic fallback applied (${aiResult.error || 'AI service unavailable'}).`
    });

    // 12. Emit 'incident-updated' socket event
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
