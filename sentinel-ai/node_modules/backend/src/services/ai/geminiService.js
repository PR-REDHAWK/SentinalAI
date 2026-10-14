const { 
  reasonOverIncident, 
  buildEvidencePackage 
} = require('./geminiReasoningService');

const analyzeIncident = async (alertPayload, source, extraContext = {}) => {
  // If called directly with raw payload, wrap in structured evidence package
  const evidencePackage = extraContext.evidencePackage || buildEvidencePackage(
    { service: alertPayload?.service || alertPayload?.tags?.service || 'service', source: source || 'unknown' },
    {},
    {},
    {},
    alertPayload
  );

  const result = await reasonOverIncident(evidencePackage);
  const data = result.data || {};

  return {
    title: data.summary ? data.summary.substring(0, 90) : `Incident on ${alertPayload?.service || 'Service'}`,
    aiSummary: data.summary || data.evidenceNarrative || 'Telemetry anomaly detected',
    severity: data.incident?.severity || 'High',
    category: 'Infrastructure',
    affectedService: alertPayload?.service || data.businessImpact?.affectedServices?.[0] || 'Unknown',
    affectedRegion: alertPayload?.region || 'Global',
    confidence: data.rootCauseAnalysis?.confidence || data.incident?.confidence || 80,
    rootCause: {
      summary: data.rootCauseAnalysis?.primaryHypothesis || 'Telemetry anomaly',
      details: data.rootCauseAnalysis?.explanation || data.evidenceNarrative || '',
      confidence: data.rootCauseAnalysis?.confidence || 80,
      evidence: data.rootCauseAnalysis?.evidence || []
    },
    businessImpact: {
      affectedUsers: data.businessImpact?.userImpact || 'Unknown',
      regions: [alertPayload?.region || 'Global'],
      estimatedRevenueLoss: data.businessImpact?.estimatedImpact || 'Quantitative impact cannot be determined from available telemetry.',
      serviceDegradation: data.businessImpact?.summary || 'Degraded performance'
    },
    recommendations: (data.recommendedActions || []).map((rec, idx) => ({
      id: `rec-${idx + 1}`,
      action: rec.action,
      description: rec.reason,
      confidence: 90,
      type: rec.priority,
      command: rec.command,
      requiresApproval: rec.requiresApproval
    })),
    rawAiResponse: data
  };
};

module.exports = {
  analyzeIncident,
  reasonOverIncident,
  buildEvidencePackage
};

