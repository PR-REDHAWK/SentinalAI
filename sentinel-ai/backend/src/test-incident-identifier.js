const { identifyIncident, INCIDENT_TYPES } = require('./services/incidentIdentifier');
const { detectAnomalies } = require('./services/anomalyDetector');
const { normalizeTelemetry } = require('./services/telemetryNormalizer');

const runIncidentIdentifierTests = () => {
  console.log('🧪 Starting Phase 3 Incident Identification Engine Tests...\n');
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

  // Test 1: Database Connection Exhaustion
  console.log('--- Test 1: Database Connection Exhaustion ---');
  const dbExhaustionTelemetry = {
    service: 'payment-service',
    resource: 'db-main-01',
    source: 'prometheus',
    metrics: {
      activeConnections: { current: 295, baseline: 40, threshold: 300, unit: 'connections' },
      dbLatencyMs: { current: 2400, baseline: 15, unit: 'ms' },
      errorRate: { current: 27.5, baseline: 0.1, unit: 'percent' },
      latencyMs: { current: 4200, baseline: 200, unit: 'ms' }
    },
    logs: [
      { message: 'ERROR [postgres] remaining connection slots are reserved for superuser connections' },
      { message: 'WARN Process PID 4912 waiting for ExclusiveLock on table orders' }
    ]
  };
  const dbAno = detectAnomalies(dbExhaustionTelemetry);
  const dbReport = identifyIncident(dbExhaustionTelemetry, dbAno);
  assert(dbReport.primaryHypothesis.incidentType === INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION, 
    `Top hypothesis is DATABASE_CONNECTION_EXHAUSTION (got: ${dbReport.primaryHypothesis.incidentType})`);
  assert(dbReport.primaryHypothesis.confidence >= 85, 
    `Confidence is high (${dbReport.primaryHypothesis.confidence}%)`);
  assert(dbReport.primaryHypothesis.supportingEvidence.length >= 3, 
    `Supporting evidence contains ${dbReport.primaryHypothesis.supportingEvidence.length} signals`);
  assert(dbReport.hypotheses.length >= 2, 
    `Ranked list contains multiple hypotheses (${dbReport.hypotheses.length})`);

  // Test 2: Memory Exhaustion & OOM Fault
  console.log('\n--- Test 2: Memory Exhaustion ---');
  const memoryExhaustionTelemetry = {
    service: 'auth-service',
    resource: 'auth-pod-7f89',
    source: 'kubernetes',
    metrics: {
      memoryUsageMb: { current: 512, baseline: 220, limit: 512, unit: 'MB' },
      containerUptime: { current: 12, baseline: 86400, unit: 'seconds' },
      restartCount: { current: 7, baseline: 0, unit: 'count' }
    },
    logs: [
      { message: 'FATAL [auth-service] java.lang.OutOfMemoryError: Java heap space' }
    ],
    events: [
      { reason: 'OOMKilled', message: 'Container exceeded memory limit (512MiB) and was killed' }
    ]
  };
  const memAno = detectAnomalies(memoryExhaustionTelemetry);
  const memReport = identifyIncident(memoryExhaustionTelemetry, memAno);
  assert(memReport.primaryHypothesis.incidentType === INCIDENT_TYPES.MEMORY_EXHAUSTION, 
    `Top hypothesis is MEMORY_EXHAUSTION (got: ${memReport.primaryHypothesis.incidentType})`);
  assert(memReport.primaryHypothesis.confidence >= 85, 
    `Confidence is high (${memReport.primaryHypothesis.confidence}%)`);
  assert(memReport.primaryHypothesis.supportingEvidence.some(e => e.signal === 'oom_event'), 
    'OOM event identified in supporting evidence');

  // Test 3: Deployment Regression
  console.log('\n--- Test 3: Deployment Regression ---');
  const deploymentTelemetry = {
    service: 'checkout-service',
    resource: 'checkout-v2-pod',
    timestamp: new Date().toISOString(),
    metrics: {
      errorRate: {
        current: 31.4,
        baseline: 0.2,
        unit: 'percent',
        trend: [{ value: 0.2 }, { value: 0.5 }, { value: 4.2 }, { value: 18.0 }, { value: 31.4 }]
      },
      latencyMs: {
        current: 1850,
        baseline: 120,
        unit: 'ms'
      }
    },
    deployments: [
      {
        version: 'v4.3.0',
        deployedAt: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
        status: 'completed',
        commit: 'e9481a'
      }
    ]
  };
  const depAno = detectAnomalies(deploymentTelemetry);
  const depReport = identifyIncident(deploymentTelemetry, depAno);
  assert(depReport.primaryHypothesis.incidentType === INCIDENT_TYPES.DEPLOYMENT_REGRESSION, 
    `Top hypothesis is DEPLOYMENT_REGRESSION (got: ${depReport.primaryHypothesis.incidentType})`);
  assert(depReport.primaryHypothesis.confidence >= 80, 
    `Confidence is high (${depReport.primaryHypothesis.confidence}%)`);
  assert(depReport.primaryHypothesis.supportingEvidence.some(e => e.signal === 'recent_deployment'), 
    'Recent deployment identified in supporting evidence');

  // Test 4: Traffic Overload
  console.log('\n--- Test 4: Traffic Overload ---');
  const trafficTelemetry = {
    service: 'api-gateway',
    resource: 'asg-workers',
    source: 'cloudwatch',
    metrics: {
      requestRate: { current: 9500, baseline: 1000, unit: 'req/s' },
      queueDepth: { current: 1850, baseline: 12, unit: 'messages' },
      cpuUtilization: { current: 89, baseline: 40, unit: 'percent' },
      latencyMs: { current: 420, baseline: 80, unit: 'ms' }
    },
    events: [
      { reason: 'ScaleOut', message: 'AutoScalingGroup ScaleOut policy triggered: breached 80.0% CPU' }
    ]
  };
  const trafficAno = detectAnomalies(trafficTelemetry);
  const trafficReport = identifyIncident(trafficTelemetry, trafficAno);
  assert(trafficReport.primaryHypothesis.incidentType === INCIDENT_TYPES.TRAFFIC_OVERLOAD, 
    `Top hypothesis is TRAFFIC_OVERLOAD (got: ${trafficReport.primaryHypothesis.incidentType})`);
  assert(trafficReport.primaryHypothesis.confidence >= 85, 
    `Confidence is high (${trafficReport.primaryHypothesis.confidence}%)`);
  assert(trafficReport.primaryHypothesis.supportingEvidence.some(e => e.signal === 'requestRate'), 
    'Request rate surge identified in supporting evidence');

  // Test 5: Service Dependency Failure
  console.log('\n--- Test 5: Service Dependency Failure ---');
  const dependencyTelemetry = {
    service: 'payment-gateway',
    resource: 'pay-gw-alb',
    source: 'datadog',
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
      { message: 'ERROR [payment-gateway] HTTP 504 Gateway Timeout connecting to payment-processor-api' },
      { message: 'ERROR [payment-gateway] Circuit breaker OPEN for payment-processor-api' }
    ]
  };
  const depFailAno = detectAnomalies(dependencyTelemetry);
  const depFailReport = identifyIncident(dependencyTelemetry, depFailAno);
  assert(depFailReport.primaryHypothesis.incidentType === INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE, 
    `Top hypothesis is SERVICE_DEPENDENCY_FAILURE (got: ${depFailReport.primaryHypothesis.incidentType})`);
  assert(depFailReport.primaryHypothesis.confidence >= 85, 
    `Confidence is high (${depFailReport.primaryHypothesis.confidence}%)`);
  assert(depFailReport.primaryHypothesis.supportingEvidence.some(e => e.signal === 'payment-processor-api'), 
    'Degraded dependency identified in supporting evidence');

  // Test 6: Container Failure / CrashLoopBackOff
  console.log('\n--- Test 6: Container Failure ---');
  const containerTelemetry = {
    service: 'user-service',
    resource: 'user-service-pod-abc',
    source: 'kubernetes',
    metrics: {
      restartCount: { current: 9, baseline: 0, unit: 'count' },
      containerUptime: { current: 8, baseline: 86400, unit: 'seconds' },
      errorRate: { current: 35.0, baseline: 0.05, unit: 'percent' }
    },
    events: [
      { reason: 'CrashLoopBackOff', message: 'Back-off restarting failed container user-service' },
      { reason: 'Unhealthy', message: 'Liveness probe failed: HTTP probe returned status code 500' }
    ]
  };
  const contAno = detectAnomalies(containerTelemetry);
  const contReport = identifyIncident(containerTelemetry, contAno);
  assert(contReport.primaryHypothesis.incidentType === INCIDENT_TYPES.CONTAINER_FAILURE, 
    `Top hypothesis is CONTAINER_FAILURE (got: ${contReport.primaryHypothesis.incidentType})`);
  assert(contReport.primaryHypothesis.confidence >= 80, 
    `Confidence is high (${contReport.primaryHypothesis.confidence}%)`);

  // Test 7: Ambiguous Incident (UNKNOWN_ANOMALY / INSUFFICIENT_EVIDENCE)
  console.log('\n--- Test 7: Ambiguous Incident ---');
  const ambiguousTelemetry = {
    service: 'reporting-service',
    resource: 'report-cron',
    metrics: {
      customBatchQueueTime: { current: 95, baseline: 20, unit: 'seconds' } // Non-matching generic metric
    }
  };
  const ambAno = detectAnomalies(ambiguousTelemetry);
  const ambReport = identifyIncident(ambiguousTelemetry, ambAno);
  assert(ambReport.primaryHypothesis.incidentType === INCIDENT_TYPES.UNKNOWN_ANOMALY, 
    `Top hypothesis is UNKNOWN_ANOMALY (got: ${ambReport.primaryHypothesis.incidentType})`);
  assert(ambReport.detectionStatus === 'AMBIGUOUS', 
    'Detection status is AMBIGUOUS');
  assert(ambReport.primaryHypothesis.confidence <= 45, 
    `Confidence is low as expected (${ambReport.primaryHypothesis.confidence}%)`);

  // Test 8: Provider Label Contradiction (Provider alert says High CPU, but telemetry indicates Memory Exhaustion)
  console.log('\n--- Test 8: Provider Label Contradiction ---');
  const contradictoryTelemetry = {
    service: 'auth-service',
    resource: 'auth-pod-1',
    source: 'prometheus',
    providerObservation: {
      alertName: 'Node CPU Warning',
      status: 'firing'
    },
    metrics: {
      cpuUtilization: { current: 52, baseline: 48, unit: 'percent' }, // Normal CPU
      memoryUsageMb: { current: 512, baseline: 200, limit: 512, unit: 'MB' }, // Critical Memory limit
      restartCount: { current: 6, baseline: 0, unit: 'count' }
    },
    logs: [
      { message: 'FATAL OutOfMemoryError: Java heap space' }
    ],
    events: [
      { reason: 'OOMKilled', message: 'Container exceeded memory limit' }
    ]
  };
  const contraAno = detectAnomalies(contradictoryTelemetry);
  const contraReport = identifyIncident(contradictoryTelemetry, contraAno);
  // Provider label says CPU, but telemetry proves Memory Exhaustion
  assert(contraReport.primaryHypothesis.incidentType === INCIDENT_TYPES.MEMORY_EXHAUSTION, 
    `Engine diagnosed MEMORY_EXHAUSTION despite provider CPU label (got: ${contraReport.primaryHypothesis.incidentType})`);
  assert(contraReport.primaryHypothesis.incidentType !== INCIDENT_TYPES.CPU_SATURATION, 
    'Engine did not blindly trust provider CPU label');

  // Test 9: Integration with all 4 Providers from Phase 1 & 2
  console.log('\n--- Test 9: Integration with All 4 Providers ---');
  
  // Datadog -> Dependency failure hypothesis
  const ddNormalized = normalizeTelemetry({
    alert_id: "10934812",
    title: "High Latency Detected on Payment Gateway",
    status: "Triggered",
    tags: ["env:production", "service:payment-gateway", "region:us-east-1"],
    metric: "aws.applicationelb.target_response_time",
    value: 1205.4,
    threshold: 500
  }, 'datadog');
  const ddIdentified = identifyIncident(ddNormalized, detectAnomalies(ddNormalized));
  assert(ddIdentified.primaryHypothesis.incidentType === INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE, 
    `Datadog normalized identified as SERVICE_DEPENDENCY_FAILURE (${ddIdentified.primaryHypothesis.confidence}%)`);

  // Prometheus -> Database Connection Exhaustion hypothesis
  const promNormalized = normalizeTelemetry({
    status: "firing",
    alerts: [{
      labels: { alertname: "PostgreSQL High CPU", severity: "critical", instance: "db-main-01", job: "postgresql" },
      annotations: { summary: "Database CPU above 95%" }
    }]
  }, 'prometheus');
  const promIdentified = identifyIncident(promNormalized, detectAnomalies(promNormalized));
  assert(promIdentified.primaryHypothesis.incidentType === INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION || 
         promIdentified.primaryHypothesis.incidentType === INCIDENT_TYPES.DATABASE_DEGRADATION, 
    `Prometheus normalized identified as Database Subsystem Failure (${promIdentified.primaryHypothesis.displayName})`);

  // CloudWatch -> Traffic Overload hypothesis
  const cwNormalized = normalizeTelemetry({
    AlarmName: "TargetTracking-ASG-ScaleOut",
    NewStateValue: "ALARM",
    Region: "eu-west-1"
  }, 'cloudwatch');
  const cwIdentified = identifyIncident(cwNormalized, detectAnomalies(cwNormalized));
  assert(cwIdentified.primaryHypothesis.incidentType === INCIDENT_TYPES.TRAFFIC_OVERLOAD, 
    `CloudWatch normalized identified as TRAFFIC_OVERLOAD (${cwIdentified.primaryHypothesis.confidence}%)`);

  // Kubernetes -> Memory Exhaustion / Container Failure hypothesis
  const k8sNormalized = normalizeTelemetry({
    kind: "Event",
    involvedObject: { kind: "Pod", name: "auth-service-7f89b9d4-abc12", namespace: "production" },
    reason: "CrashLoopBackOff",
    count: 8
  }, 'kubernetes');
  const k8sIdentified = identifyIncident(k8sNormalized, detectAnomalies(k8sNormalized));
  assert(k8sIdentified.primaryHypothesis.incidentType === INCIDENT_TYPES.MEMORY_EXHAUSTION ||
         k8sIdentified.primaryHypothesis.incidentType === INCIDENT_TYPES.CONTAINER_FAILURE, 
    `Kubernetes normalized identified as Memory/Container Fault (${k8sIdentified.primaryHypothesis.displayName})`);

  console.log(`\n==============================================`);
  console.log(`Phase 3 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runIncidentIdentifierTests();
