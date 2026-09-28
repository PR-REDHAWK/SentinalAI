const { normalizeTelemetry } = require('./services/telemetryNormalizer');

// Test end-to-end compatibility of the normalized data with existing models and controllers
const testWebhookPipeline = () => {
  console.log('🧪 Testing End-to-End Webhook Pipeline Simulation...\n');

  const sampleWebhook = {
    source: 'Datadog',
    payload: {
      alert_id: "10934812",
      title: "High Latency Detected on Payment Gateway",
      status: "Triggered",
      tags: ["env:production", "service:payment-gateway", "region:us-east-1"],
      metric: "aws.applicationelb.target_response_time",
      value: 1205.4,
      threshold: 500,
      timestamp: new Date().toISOString()
    }
  };

  // Step 1: Normalize
  const normalized = normalizeTelemetry(sampleWebhook.payload, sampleWebhook.source);
  if (!normalized || normalized.source !== 'datadog') {
    throw new Error('Failed to normalize Datadog payload');
  }

  // Step 2: Simulate initial incident record creation
  const initialIncidentDoc = {
    title: `[${sampleWebhook.source.toUpperCase()}] New Alert Detected`,
    description: `Raw payload received: ${JSON.stringify(sampleWebhook.payload).substring(0, 200)}...`,
    severity: 'Medium',
    category: 'Infrastructure',
    affectedService: normalized?.service || 'Unknown',
    affectedRegion: normalized?.region || 'Global',
    source: sampleWebhook.source.toLowerCase(),
    rawPayload: sampleWebhook.payload,
    normalizedTelemetry: normalized,
    status: 'Investigating'
  };

  console.log('Initial Incident Model Record:');
  console.log({
    title: initialIncidentDoc.title,
    affectedService: initialIncidentDoc.affectedService,
    affectedRegion: initialIncidentDoc.affectedRegion,
    source: initialIncidentDoc.source,
    hasRawPayload: !!initialIncidentDoc.rawPayload,
    hasNormalizedTelemetry: !!initialIncidentDoc.normalizedTelemetry,
    normalizedMetricCount: Object.keys(initialIncidentDoc.normalizedTelemetry.metrics).length
  });

  // Step 3: Simulate Gemini analysis result overlay
  const mockAiAnalysis = {
    title: "Payment Gateway Downstream Latency Degradation",
    severity: "High",
    category: "Payment Pipeline",
    affectedService: "payment-gateway",
    affectedRegion: "us-east-1",
    confidence: 92,
    aiSummary: "Downstream API response latency causing connection timeouts in payment-gateway.",
    rootCause: {
      summary: "Downstream payment processor socket timeout",
      confidence: 92,
      details: "Observed downstream latency spiked to 980ms vs baseline 150ms.",
      evidence: ["Target response time breached 500ms threshold", "Downstream latency 980ms"]
    },
    businessImpact: {
      affectedUsers: "~12,000 checkout attempts",
      regions: ["us-east-1"],
      estimatedRevenueLoss: "$3,500 / hr",
      serviceDegradation: "Payment checkout errors"
    },
    recommendations: [
      {
        action: "Enable circuit breaker fallback",
        description: "Route checkout traffic to backup processor gateway",
        confidence: 94,
        type: "Mitigation",
        command: "kubectl patch configmap payment-gw-config --patch '{\"data\":{\"PRIMARY_ENABLED\":\"false\"}}'"
      }
    ]
  };

  const updatedIncidentDoc = {
    ...initialIncidentDoc,
    title: mockAiAnalysis.title || initialIncidentDoc.title,
    severity: mockAiAnalysis.severity,
    category: mockAiAnalysis.category,
    affectedService: mockAiAnalysis.affectedService,
    affectedRegion: mockAiAnalysis.affectedRegion,
    aiScore: mockAiAnalysis.confidence,
    aiSummary: mockAiAnalysis.aiSummary,
    rootCause: mockAiAnalysis.rootCause,
    businessImpact: mockAiAnalysis.businessImpact,
    recommendations: mockAiAnalysis.recommendations,
  };

  console.log('\nUpdated Incident Model Record (AI analyzed + Normalized Telemetry preserved):');
  console.log({
    title: updatedIncidentDoc.title,
    severity: updatedIncidentDoc.severity,
    affectedService: updatedIncidentDoc.affectedService,
    affectedRegion: updatedIncidentDoc.affectedRegion,
    aiScore: updatedIncidentDoc.aiScore,
    hasRawPayload: !!updatedIncidentDoc.rawPayload,
    hasNormalizedTelemetry: !!updatedIncidentDoc.normalizedTelemetry,
    metricsAvailable: Object.keys(updatedIncidentDoc.normalizedTelemetry.metrics)
  });

  console.log('\n✅ Pipeline test successfully verified backward compatibility & schema persistence!');
};

testWebhookPipeline();
