/**
 * Phase 5 Automated Test Suite: AI Reasoning & Evidence-Grounded RCA
 */

const {
  buildEvidencePackage,
  calculateEvidenceFingerprint,
  sanitizeAndValidateActions,
  generateDeterministicFallbackRca,
  reasonOverIncident,
  buildGeminiPrompt
} = require('./services/ai/geminiReasoningService');

const { normalizeTelemetry } = require('./services/telemetryNormalizer');
const { detectAnomalies } = require('./services/anomalyDetector');
const { identifyIncident, INCIDENT_TYPES } = require('./services/incidentIdentifier');
const { correlateEvidence, CLUSTER_CATEGORIES } = require('./services/evidenceCorrelator');

const runAiReasoningTests = async () => {
  console.log('🧪 Starting Phase 5 AI Reasoning & Evidence-Grounded RCA Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  const now = Date.now();

  // Test 1: Strong Database Connection Exhaustion Evidence Package & Synthesis
  console.log('--- Test 1: Strong Database Connection Exhaustion ---');
  const dbTelemetry = {
    service: 'payment-service',
    resource: 'db-main-01',
    source: 'prometheus',
    timestamp: new Date(now).toISOString(),
    metrics: {
      activeConnections: { current: 295, baseline: 40, threshold: 300, unit: 'connections' },
      dbLatencyMs: { current: 2400, baseline: 15, unit: 'ms' },
      latencyMs: { current: 4200, baseline: 200, unit: 'ms' },
      errorRate: { current: 27.5, baseline: 0.1, unit: 'percent' }
    },
    logs: [
      { timestamp: new Date(now - 120000).toISOString(), level: 'ERROR', message: 'ERROR [postgres] remaining connection slots are reserved for superuser connections' }
    ]
  };

  const dbAno = detectAnomalies(dbTelemetry);
  const dbIdent = identifyIncident(dbTelemetry, dbAno);
  const dbCorr = correlateEvidence(dbTelemetry, dbAno, dbIdent);
  const dbPkg = buildEvidencePackage(dbTelemetry, dbAno, dbIdent, dbCorr, dbTelemetry);

  assert(dbPkg.identifiedIncident.incidentType === INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION,
    'Evidence package contains DATABASE_CONNECTION_EXHAUSTION incident');
  assert(dbPkg.primaryRootCause.candidate.includes('Database Connection'),
    'Evidence package root-cause candidate is Database Connection');
  assert(dbPkg.evidenceChain.length >= 3,
    'Evidence package preserves progressive evidence chain');

  const dbRca = await reasonOverIncident(dbPkg, { mock: true });
  assert(dbRca.status === 'COMPLETED', 'AI Reasoning status is COMPLETED');
  assert(dbRca.data.rootCauseAnalysis.primaryHypothesis.includes('Database Connection'),
    'Synthesized RCA primary hypothesis identifies Database Connection');
  assert(dbRca.data.rootCauseAnalysis.confidence >= 80,
    `RCA confidence is high (${dbRca.data.rootCauseAnalysis.confidence}%)`);

  // Test 2: Memory Exhaustion & OOM Event
  console.log('\n--- Test 2: Memory Exhaustion & OOM Fault ---');
  const memTelemetry = {
    service: 'auth-service',
    resource: 'auth-pod-01',
    source: 'kubernetes',
    metrics: {
      memoryUsageMb: { current: 512, baseline: 220, limit: 512, unit: 'MB' },
      restartCount: { current: 8, baseline: 0, unit: 'count' }
    },
    events: [{ reason: 'OOMKilled', message: 'Container exceeded memory limit (512MiB)' }]
  };
  const memAno = detectAnomalies(memTelemetry);
  const memIdent = identifyIncident(memTelemetry, memAno);
  const memCorr = correlateEvidence(memTelemetry, memAno, memIdent);
  const memPkg = buildEvidencePackage(memTelemetry, memAno, memIdent, memCorr);
  const memRca = await reasonOverIncident(memPkg, { mock: true });

  assert(memRca.data.incident.type === INCIDENT_TYPES.MEMORY_EXHAUSTION,
    'AI Reasoning incident type is MEMORY_EXHAUSTION');
  assert(memRca.data.rootCauseAnalysis.evidence.some(e => /OOM|memory/i.test(e)),
    'OOM/memory evidence included in RCA evidence items');

  // Test 3: Deployment Regression
  console.log('\n--- Test 3: Deployment Regression ---');
  const depTelemetry = {
    service: 'checkout-service',
    metrics: {
      errorRate: { current: 31.4, baseline: 0.2, unit: 'percent' },
      latencyMs: { current: 1850, baseline: 120, unit: 'ms' }
    },
    deployments: [{ version: 'v4.3.0', deployedAt: new Date(now - 600000).toISOString(), commit: 'a1b2c3' }]
  };
  const depAno = detectAnomalies(depTelemetry);
  const depIdent = identifyIncident(depTelemetry, depAno);
  const depCorr = correlateEvidence(depTelemetry, depAno, depIdent);
  const depPkg = buildEvidencePackage(depTelemetry, depAno, depIdent, depCorr);
  const depRca = await reasonOverIncident(depPkg, { mock: true });

  assert(depRca.data.incident.type === INCIDENT_TYPES.DEPLOYMENT_REGRESSION,
    'AI Reasoning incident type is DEPLOYMENT_REGRESSION');

  // Test 4: Downstream Dependency Failure
  console.log('\n--- Test 4: Downstream Dependency Failure ---');
  const depFailTelemetry = {
    service: 'payment-gateway',
    metrics: {
      downstreamLatencyMs: { current: 1400, baseline: 120, unit: 'ms' },
      latencyMs: { current: 1550, baseline: 180, unit: 'ms' }
    },
    dependencies: [{ name: 'ext-stripe-api', status: 'degraded', currentLatencyMs: 1400 }]
  };
  const depFailAno = detectAnomalies(depFailTelemetry);
  const depFailIdent = identifyIncident(depFailTelemetry, depFailAno);
  const depFailCorr = correlateEvidence(depFailTelemetry, depFailAno, depFailIdent);
  const depFailPkg = buildEvidencePackage(depFailTelemetry, depFailAno, depFailIdent, depFailCorr);
  const depFailRca = await reasonOverIncident(depFailPkg, { mock: true });

  assert(depFailRca.data.incident.type === INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE,
    'AI Reasoning incident type is SERVICE_DEPENDENCY_FAILURE');
  assert(depFailRca.data.rootCauseAnalysis.explanation.includes('ext-stripe-api') || depFailRca.data.summary.includes('ext-stripe-api'),
    'Downstream dependency ext-stripe-api explicitly referenced in AI narrative');

  // Test 5: Traffic Overload
  console.log('\n--- Test 5: Traffic Overload ---');
  const trafficTelemetry = {
    service: 'api-gateway',
    metrics: {
      requestRate: { current: 9500, baseline: 1000, unit: 'req/s' },
      queueDepth: { current: 1850, baseline: 10, unit: 'messages' },
      cpuUtilization: { current: 89, baseline: 35, unit: 'percent' }
    }
  };
  const trafficAno = detectAnomalies(trafficTelemetry);
  const trafficIdent = identifyIncident(trafficTelemetry, trafficAno);
  const trafficCorr = correlateEvidence(trafficTelemetry, trafficAno, trafficIdent);
  const trafficPkg = buildEvidencePackage(trafficTelemetry, trafficAno, trafficIdent, trafficCorr);
  const trafficRca = await reasonOverIncident(trafficPkg, { mock: true });

  assert(trafficRca.data.incident.type === INCIDENT_TYPES.TRAFFIC_OVERLOAD,
    'AI Reasoning incident type is TRAFFIC_OVERLOAD');

  // Test 6: Ambiguous Incident / Uncertainty Handling
  console.log('\n--- Test 6: Ambiguous Incident & Uncertainty ---');
  const ambTelemetry = {
    service: 'worker-batch',
    metrics: {
      randomUnmappedMetric: { current: 99, baseline: 10, unit: 'units' }
    }
  };
  const ambAno = detectAnomalies(ambTelemetry);
  const ambIdent = identifyIncident(ambTelemetry, ambAno);
  const ambCorr = correlateEvidence(ambTelemetry, ambAno, ambIdent);
  const ambPkg = buildEvidencePackage(ambTelemetry, ambAno, ambIdent, ambCorr);
  const ambRca = await reasonOverIncident(ambPkg, { mock: true });

  assert(ambRca.data.rootCauseAnalysis.status === 'UNCONFIRMED_AMBIGUOUS' || ambRca.data.rootCauseAnalysis.status === 'UNCERTAIN' || ambRca.data.rootCauseAnalysis.status === 'POSSIBLE',
    `Uncertainty status properly assigned (${ambRca.data.rootCauseAnalysis.status})`);
  assert(ambRca.data.investigationSteps.length >= 2,
    'Investigation steps generated for ambiguous incident');

  // Test 7: Contradicting Evidence Handling
  console.log('\n--- Test 7: Contradicting Evidence Handling ---');
  const contraPkg = buildEvidencePackage(
    { service: 'auth-service' },
    { anomalies: [{ metric: 'latencyMs', current: 1500, anomalyScore: 80 }] },
    { primaryHypothesis: { incidentType: 'HIGH_LATENCY', confidence: 60 } },
    {
      primaryRootCause: {
        candidate: 'Service Latency Degradation',
        confidence: 60,
        supportingEvidence: ['API latency elevated'],
        contradictingEvidence: ['Active database connections are normal', 'CPU utilization is normal']
      }
    }
  );
  const contraRca = await reasonOverIncident(contraPkg, { mock: true });
  assert(contraRca.data.rootCauseAnalysis.contradictingEvidence.length >= 2,
    'Contradicting evidence preserved in AI response');

  // Test 8: Insufficient Evidence Handling (No Hallucinations)
  console.log('\n--- Test 8: Insufficient Evidence Handling ---');
  const emptyPkg = buildEvidencePackage({}, {}, {}, {});
  const emptyRca = await reasonOverIncident(emptyPkg, { mock: true });
  assert(emptyRca.data.rootCauseAnalysis.confidence <= 60,
    `Low confidence maintained for empty evidence (${emptyRca.data.rootCauseAnalysis.confidence}%)`);

  // Test 9 & 10 & 11: Fallback Resilience on API failure / invalid response
  console.log('\n--- Test 9-11: Fallback Resilience on API Failure ---');
  const fallbackResult = generateDeterministicFallbackRca(dbPkg, 'Simulated Timeout Error');
  assert(fallbackResult.summary.includes('SentinelAI deterministic analysis'),
    'Fallback generates valid deterministic executive summary');
  assert(fallbackResult.recommendedActions.length > 0,
    'Fallback includes structured remediation actions');

  // Test 12 & 14: Safety & Human Approval on Destructive Actions
  console.log('\n--- Test 12 & 14: Remediation Safety & Human Approval ---');
  const rawActions = [
    { priority: 'IMMEDIATE', action: 'Inspect logs', command: 'tail -n 100 /var/log/app.log', requiresApproval: false },
    { priority: 'HIGH', action: 'Restart cluster pod', command: 'kubectl delete pod auth-01', requiresApproval: false },
    { priority: 'HIGH', action: 'Rollback deployment', command: 'kubectl rollout undo deployment/api', requiresApproval: false }
  ];
  const sanitized = sanitizeAndValidateActions(rawActions);
  assert(sanitized[0].requiresApproval === false, 'Read-only log inspection does not require approval');
  assert(sanitized[1].requiresApproval === true, 'Pod delete command enforced requiresApproval: true');
  assert(sanitized[2].requiresApproval === true, 'Rollback command enforced requiresApproval: true');

  // Test 13: Evidence Fingerprinting / Caching
  console.log('\n--- Test 13: Evidence Fingerprint & Caching ---');
  const fp1 = calculateEvidenceFingerprint(dbPkg);
  const fp2 = calculateEvidenceFingerprint(dbPkg);
  const fp3 = calculateEvidenceFingerprint(memPkg);
  assert(fp1 === fp2, 'Identical evidence packages generate identical fingerprint hashes');
  assert(fp1 !== fp3, 'Different evidence packages generate distinct fingerprint hashes');

  // Test 15: Business Impact Non-Fabrication
  console.log('\n--- Test 15: Business Impact Non-Fabrication ---');
  assert(dbRca.data.businessImpact.estimatedImpact.includes('Quantitative impact cannot be determined') || dbRca.data.businessImpact.estimatedImpact.includes('telemetry'),
    'AI does not fabricate quantitative financial or user counts');

  console.log(`\n==============================================`);
  console.log(`Phase 5 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runAiReasoningTests();
