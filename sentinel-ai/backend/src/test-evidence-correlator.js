const { correlateEvidence, CLUSTER_CATEGORIES } = require('./services/evidenceCorrelator');
const { identifyIncident, INCIDENT_TYPES } = require('./services/incidentIdentifier');
const { detectAnomalies } = require('./services/anomalyDetector');

const runEvidenceCorrelatorTests = () => {
  console.log('🧪 Starting Phase 4 Evidence Correlation Engine Tests...\n');
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

  // Test 1: Database Degradation Sequence
  console.log('--- Test 1: Database Degradation Sequence ---');
  const now = Date.now();
  const dbTelemetry = {
    service: 'payment-service',
    resource: 'db-main-01',
    source: 'prometheus',
    timestamp: new Date(now).toISOString(),
    metrics: {
      activeConnections: {
        current: 295, baseline: 40, threshold: 300, unit: 'connections',
        trend: [
          { timestamp: new Date(now - 300000).toISOString(), value: 40 },
          { timestamp: new Date(now - 240000).toISOString(), value: 120 },
          { timestamp: new Date(now - 180000).toISOString(), value: 240 },
          { timestamp: new Date(now - 120000).toISOString(), value: 295 }
        ]
      },
      dbLatencyMs: {
        current: 2400, baseline: 15, unit: 'ms',
        trend: [
          { timestamp: new Date(now - 300000).toISOString(), value: 15 },
          { timestamp: new Date(now - 180000).toISOString(), value: 600 },
          { timestamp: new Date(now - 120000).toISOString(), value: 2400 }
        ]
      },
      latencyMs: {
        current: 4200, baseline: 200, unit: 'ms',
        trend: [
          { timestamp: new Date(now - 300000).toISOString(), value: 200 },
          { timestamp: new Date(now - 120000).toISOString(), value: 1800 },
          { timestamp: new Date(now).toISOString(), value: 4200 }
        ]
      },
      errorRate: {
        current: 27.5, baseline: 0.1, unit: 'percent',
        trend: [
          { timestamp: new Date(now - 300000).toISOString(), value: 0.1 },
          { timestamp: new Date(now - 60000).toISOString(), value: 12.0 },
          { timestamp: new Date(now).toISOString(), value: 27.5 }
        ]
      }
    },
    logs: [
      { timestamp: new Date(now - 120000).toISOString(), level: 'ERROR', message: 'ERROR [postgres] remaining connection slots are reserved for superuser connections' }
    ]
  };

  const dbAno = detectAnomalies(dbTelemetry);
  const dbIdent = identifyIncident(dbTelemetry, dbAno);
  const dbCorr = correlateEvidence(dbTelemetry, dbAno, dbIdent);

  assert(dbCorr.primaryRootCause.incidentType === INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION,
    `Leading root cause is DATABASE_CONNECTION_EXHAUSTION (got: ${dbCorr.primaryRootCause.incidentType})`);
  assert(dbCorr.primaryRootCause.confidence >= 85,
    `Root-cause confidence is high (${dbCorr.primaryRootCause.confidence}%)`);
  assert(dbCorr.evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.DATABASE),
    'Database evidence cluster formed');
  assert(dbCorr.evidenceChain.length >= 3,
    `Evidence chain contains ${dbCorr.evidenceChain.length} progressive milestones`);
  assert(dbCorr.evidenceChain[0].stage === 'ORIGIN_SIGNAL',
    'Earliest milestone identified as ORIGIN_SIGNAL');

  // Test 2: Deployment Regression Sequence
  console.log('\n--- Test 2: Deployment Regression Sequence ---');
  const depTime = new Date(now - 15 * 60000).toISOString();
  const deployTelemetry = {
    service: 'checkout-service',
    resource: 'checkout-api',
    timestamp: new Date(now).toISOString(),
    metrics: {
      errorRate: {
        current: 31.4, baseline: 0.2, unit: 'percent',
        trend: [
          { timestamp: new Date(now - 20 * 60000).toISOString(), value: 0.2 },
          { timestamp: new Date(now - 10 * 60000).toISOString(), value: 4.5 },
          { timestamp: new Date(now).toISOString(), value: 31.4 }
        ]
      },
      latencyMs: { current: 1850, baseline: 120, unit: 'ms' }
    },
    deployments: [
      {
        version: 'v4.3.0',
        deployedAt: depTime,
        status: 'completed',
        commit: 'e9481a'
      }
    ]
  };

  const depAno = detectAnomalies(deployTelemetry);
  const depIdent = identifyIncident(deployTelemetry, depAno);
  const depCorr = correlateEvidence(deployTelemetry, depAno, depIdent);

  assert(depCorr.primaryRootCause.incidentType === INCIDENT_TYPES.DEPLOYMENT_REGRESSION,
    `Leading root cause is DEPLOYMENT_REGRESSION (got: ${depCorr.primaryRootCause.incidentType})`);
  assert(depCorr.evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.DEPLOYMENT),
    'Deployment evidence cluster identified');
  assert(depCorr.primaryRootCause.supportingEvidence.some(e => e.includes('v4.3.0')),
    'Deployment version linked in supporting evidence');

  // Test 3: Downstream Dependency Failure Precedence
  console.log('\n--- Test 3: Downstream Dependency Failure ---');
  const depFailTelemetry = {
    service: 'payment-gateway',
    resource: 'pay-gw-alb',
    source: 'datadog',
    timestamp: new Date(now).toISOString(),
    metrics: {
      downstreamLatencyMs: { current: 1200, baseline: 150, unit: 'ms' },
      latencyMs: { current: 1350, baseline: 220, unit: 'ms' },
      errorRate: { current: 12.8, baseline: 0.1, unit: 'percent' }
    },
    dependencies: [
      {
        name: 'payment-processor-api',
        type: 'downstream',
        status: 'degraded',
        baselineLatencyMs: 150,
        currentLatencyMs: 1200
      }
    ],
    logs: [
      { level: 'ERROR', message: 'ERROR [payment-gateway] HTTP 504 Gateway Timeout connecting to payment-processor-api' }
    ]
  };

  const depFailAno = detectAnomalies(depFailTelemetry);
  const depFailIdent = identifyIncident(depFailTelemetry, depFailAno);
  const depFailCorr = correlateEvidence(depFailTelemetry, depFailAno, depFailIdent);

  assert(depFailCorr.primaryRootCause.incidentType === INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE,
    `Leading root cause is SERVICE_DEPENDENCY_FAILURE (got: ${depFailCorr.primaryRootCause.incidentType})`);
  assert(depFailCorr.primaryRootCause.suspectedOrigin.service === 'payment-processor-api',
    `Suspected origin correctly attributed to downstream 'payment-processor-api' (got: ${depFailCorr.primaryRootCause.suspectedOrigin.service})`);

  // Test 4: Traffic Overload
  console.log('\n--- Test 4: Traffic Overload ---');
  const trafficTelemetry = {
    service: 'api-gateway',
    resource: 'asg-workers',
    source: 'cloudwatch',
    timestamp: new Date(now).toISOString(),
    metrics: {
      requestRate: { current: 9500, baseline: 1000, unit: 'req/s' },
      queueDepth: { current: 1850, baseline: 12, unit: 'messages' },
      cpuUtilization: { current: 89, baseline: 40, unit: 'percent' },
      latencyMs: { current: 420, baseline: 80, unit: 'ms' }
    },
    events: [
      { reason: 'ScaleOut', message: 'TargetTracking ASG ScaleOut triggered on CPU breach' }
    ]
  };

  const trafficAno = detectAnomalies(trafficTelemetry);
  const trafficIdent = identifyIncident(trafficTelemetry, trafficAno);
  const trafficCorr = correlateEvidence(trafficTelemetry, trafficAno, trafficIdent);

  assert(trafficCorr.primaryRootCause.incidentType === INCIDENT_TYPES.TRAFFIC_OVERLOAD,
    `Leading root cause is TRAFFIC_OVERLOAD (got: ${trafficCorr.primaryRootCause.incidentType})`);
  assert(trafficCorr.evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.TRAFFIC),
    'Traffic evidence cluster formed');

  // Test 5: Memory Exhaustion & OOM Event
  console.log('\n--- Test 5: Memory Exhaustion ---');
  const memTelemetry = {
    service: 'auth-service',
    resource: 'auth-pod-12',
    source: 'kubernetes',
    timestamp: new Date(now).toISOString(),
    metrics: {
      memoryUsageMb: { current: 512, baseline: 220, limit: 512, unit: 'MB' },
      containerUptime: { current: 10, baseline: 86400, unit: 'seconds' },
      restartCount: { current: 8, baseline: 0, unit: 'count' }
    },
    logs: [
      { level: 'FATAL', message: 'FATAL java.lang.OutOfMemoryError: Java heap space' }
    ],
    events: [
      { reason: 'OOMKilled', message: 'Container exceeded memory limit (512MiB)' }
    ]
  };

  const memAno = detectAnomalies(memTelemetry);
  const memIdent = identifyIncident(memTelemetry, memAno);
  const memCorr = correlateEvidence(memTelemetry, memAno, memIdent);

  assert(memCorr.primaryRootCause.incidentType === INCIDENT_TYPES.MEMORY_EXHAUSTION,
    `Leading root cause is MEMORY_EXHAUSTION (got: ${memCorr.primaryRootCause.incidentType})`);
  assert(memCorr.evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.MEMORY),
    'Memory evidence cluster formed');

  // Test 6: Ambiguous Case (No fabricated chain)
  console.log('\n--- Test 6: Ambiguous Case ---');
  const ambTelemetry = {
    service: 'cron-worker',
    metrics: {
      unmappedBatchExecutionLag: { current: 85, baseline: 10, unit: 'seconds' }
    }
  };

  const ambAno = detectAnomalies(ambTelemetry);
  const ambIdent = identifyIncident(ambTelemetry, ambAno);
  const ambCorr = correlateEvidence(ambTelemetry, ambAno, ambIdent);

  assert(ambCorr.primaryRootCause.status === 'UNCONFIRMED_AMBIGUOUS',
    `Status is UNCONFIRMED_AMBIGUOUS (got: ${ambCorr.primaryRootCause.status})`);
  assert(ambCorr.primaryRootCause.confidence <= 50,
    `Confidence is low (${ambCorr.primaryRootCause.confidence}%)`);

  // Test 7: Contradicting Evidence Penalty
  console.log('\n--- Test 7: Contradicting Evidence Penalty ---');
  const contradictoryTelemetry = {
    service: 'auth-service',
    source: 'prometheus',
    metrics: {
      latencyMs: { current: 1500, baseline: 200, unit: 'ms' },
      errorRate: { current: 8.5, baseline: 0.1, unit: 'percent' },
      memoryUtilization: { current: 35, baseline: 30, unit: 'percent' } // Healthy memory contradicts memory exhaustion
    },
    dependencies: [
      { name: 'user-db', status: 'healthy' } // Healthy dependencies contradict dependency failure
    ]
  };

  const contraAno = detectAnomalies(contradictoryTelemetry);
  const contraIdent = identifyIncident(contradictoryTelemetry, contraAno);
  const contraCorr = correlateEvidence(contradictoryTelemetry, contraAno, contraIdent);

  // Verify that contradicting signals penalized unsuitable candidates
  const depCandidate = contraCorr.rootCauseCandidates.find(c => c.incidentType === INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE);
  if (depCandidate) {
    assert(depCandidate.contradictingEvidence.length > 0, 'Contradicting evidence noted for healthy dependencies');
  }

  console.log(`\n==============================================`);
  console.log(`Phase 4 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runEvidenceCorrelatorTests();
