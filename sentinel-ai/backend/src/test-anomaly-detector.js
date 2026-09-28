const { detectAnomalies, SEVERITY_LEVELS } = require('./services/anomalyDetector');
const { normalizeTelemetry } = require('./services/telemetryNormalizer');

const runAnomalyDetectorTests = () => {
  console.log('🧪 Starting Phase 2 Anomaly Detection Engine Tests...\n');
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

  // Test 1: Normal Telemetry (CPU 60 vs 62)
  console.log('--- Test 1: Normal Telemetry ---');
  const normalTelemetry = {
    service: 'auth-service',
    resource: 'auth-pod-1',
    metrics: {
      cpuUtilization: {
        name: 'cpuUtilization',
        unit: 'percent',
        baseline: 60,
        current: 62,
        trend: [{ value: 60 }, { value: 61 }, { value: 62 }]
      }
    }
  };
  const normalReport = detectAnomalies(normalTelemetry);
  assert(normalReport.hasAnomalies === false, 'Normal telemetry hasAnomalies is false');
  assert(normalReport.anomalies.length === 0, 'Anomalies array is empty');
  assert(normalReport.normalMetrics.length === 1, 'Metric is classified under normalMetrics');
  assert(normalReport.normalMetrics[0].severity === SEVERITY_LEVELS.NORMAL, 'Severity is NORMAL');
  assert(normalReport.normalMetrics[0].anomalyScore < 30, `Anomaly score is low (${normalReport.normalMetrics[0].anomalyScore})`);

  // Test 2: High CPU (Baseline 60, Current 97)
  console.log('\n--- Test 2: High CPU ---');
  const highCpuTelemetry = {
    service: 'database-service',
    resource: 'db-main-01',
    metrics: {
      cpuUtilization: {
        name: 'cpuUtilization',
        unit: 'percent',
        baseline: 60,
        current: 97,
        trend: [{ value: 60 }, { value: 75 }, { value: 90 }, { value: 97 }]
      }
    }
  };
  const cpuReport = detectAnomalies(highCpuTelemetry);
  assert(cpuReport.hasAnomalies === true, 'High CPU detected as anomaly');
  assert(cpuReport.anomalies.length === 1, '1 anomaly detected');
  assert(cpuReport.anomalies[0].severity === SEVERITY_LEVELS.CRITICAL, 'High CPU severity is CRITICAL');
  assert(cpuReport.anomalies[0].anomalyScore >= 85, `CPU anomaly score is high (${cpuReport.anomalies[0].anomalyScore})`);
  assert(cpuReport.anomalies[0].reason.includes('CPU utilization reached 97%'), 'Reason provides clear explanation');

  // Test 3: High Latency (Baseline 200ms, Current 2000ms)
  console.log('\n--- Test 3: High Latency ---');
  const highLatencyTelemetry = {
    service: 'payment-gateway',
    resource: 'gw-alb',
    metrics: {
      latencyMs: {
        name: 'latencyMs',
        unit: 'ms',
        baseline: 200,
        current: 2000,
        trend: [{ value: 200 }, { value: 500 }, { value: 1200 }, { value: 2000 }]
      }
    }
  };
  const latReport = detectAnomalies(highLatencyTelemetry);
  assert(latReport.hasAnomalies === true, 'High latency detected as anomaly');
  assert(latReport.anomalies[0].severity === SEVERITY_LEVELS.CRITICAL, 'Latency severity is CRITICAL');
  assert(latReport.anomalies[0].deviationRatio === 10, 'Deviation ratio is 10x');
  assert(latReport.anomalies[0].anomalyScore >= 90, `Latency anomaly score is high (${latReport.anomalies[0].anomalyScore})`);

  // Test 4: Error Spike (Baseline 0.5%, Current 25%)
  console.log('\n--- Test 4: Error Rate Spike ---');
  const errorSpikeTelemetry = {
    service: 'order-service',
    resource: 'order-api',
    metrics: {
      errorRate: {
        name: 'errorRate',
        unit: 'percent',
        baseline: 0.5,
        current: 25.0,
        trend: [{ value: 0.5 }, { value: 2.0 }, { value: 10.0 }, { value: 25.0 }]
      }
    }
  };
  const errReport = detectAnomalies(errorSpikeTelemetry);
  assert(errReport.hasAnomalies === true, 'Error rate spike detected as anomaly');
  assert(errReport.anomalies[0].severity === SEVERITY_LEVELS.CRITICAL, 'Error rate severity is CRITICAL');
  assert(errReport.anomalies[0].anomalyScore >= 95, `Error rate anomaly score is >= 95 (${errReport.anomalies[0].anomalyScore})`);

  // Test 5: Memory Increase (Baseline 60%, Current 96%)
  console.log('\n--- Test 5: Memory Increase ---');
  const memoryTelemetry = {
    service: 'cache-service',
    resource: 'redis-node-1',
    metrics: {
      memoryUtilization: {
        name: 'memoryUtilization',
        unit: 'percent',
        baseline: 60,
        current: 96,
        trend: [{ value: 60 }, { value: 72 }, { value: 85 }, { value: 96 }]
      }
    }
  };
  const memReport = detectAnomalies(memoryTelemetry);
  assert(memReport.hasAnomalies === true, 'Memory utilization detected as anomaly');
  assert(memReport.anomalies[0].severity === SEVERITY_LEVELS.CRITICAL, 'Memory severity is CRITICAL');
  assert(memReport.anomalies[0].anomalyScore >= 85, `Memory anomaly score >= 85 (${memReport.anomalies[0].anomalyScore})`);

  // Test 6: Multiple Simultaneous Anomalies
  console.log('\n--- Test 6: Multiple Simultaneous Anomalies ---');
  const multiTelemetry = {
    service: 'checkout-service',
    resource: 'checkout-worker',
    source: 'prometheus',
    metrics: {
      errorRate: { baseline: 0.2, current: 18.5, unit: 'percent' },
      latencyMs: { baseline: 150, current: 3200, unit: 'ms' },
      activeConnections: { baseline: 30, current: 295, threshold: 300, unit: 'connections' },
      cpuUtilization: { baseline: 40, current: 88, unit: 'percent' },
      memoryUsage: { baseline: 30, current: 35, unit: 'percent' } // Normal metric
    }
  };
  const multiReport = detectAnomalies(multiTelemetry);
  assert(multiReport.hasAnomalies === true, 'Multi-telemetry has anomalies');
  assert(multiReport.anomalies.length === 4, `Detected 4 anomalies (got ${multiReport.anomalies.length})`);
  assert(multiReport.normalMetrics.length === 1, `1 normal metric separated (got ${multiReport.normalMetrics.length})`);
  assert(multiReport.overallAnomalyScore >= 95, `Overall anomaly score aggregated correctly (${multiReport.overallAnomalyScore})`);
  assert(multiReport.anomalies[0].provenance.source === 'prometheus', 'Signal provenance preserved');

  // Test 7: Isolated Spike vs Sustained Degradation
  console.log('\n--- Test 7: Isolated Spike vs Sustained Degradation ---');
  const isolatedSpikeTelemetry = {
    service: 'api-service',
    metrics: {
      latencyMs: {
        baseline: 200,
        current: 600,
        trend: [{ value: 200 }, { value: 205 }, { value: 200 }, { value: 195 }, { value: 600 }]
      }
    }
  };
  const sustainedDegradationTelemetry = {
    service: 'api-service',
    metrics: {
      latencyMs: {
        baseline: 200,
        current: 600,
        trend: [{ value: 200 }, { value: 300 }, { value: 420 }, { value: 510 }, { value: 600 }]
      }
    }
  };
  const spikeReport = detectAnomalies(isolatedSpikeTelemetry);
  const sustainedReport = detectAnomalies(sustainedDegradationTelemetry);
  assert(sustainedReport.anomalies[0].anomalyScore > spikeReport.anomalies[0].anomalyScore, 
    `Sustained degradation score (${sustainedReport.anomalies[0].anomalyScore}) is higher than isolated spike score (${spikeReport.anomalies[0].anomalyScore})`);

  // Test 8: Integration with all 4 Providers' Normalized Output
  console.log('\n--- Test 8: Integration with 4 Providers from Phase 1 ---');
  
  // Datadog Normalized Test
  const ddNormalized = normalizeTelemetry({
    alert_id: "10934812",
    title: "High Latency Detected on Payment Gateway",
    status: "Triggered",
    tags: ["env:production", "service:payment-gateway", "region:us-east-1"],
    metric: "aws.applicationelb.target_response_time",
    value: 1205.4,
    threshold: 500
  }, 'datadog');
  const ddAnomaly = detectAnomalies(ddNormalized);
  assert(ddAnomaly.hasAnomalies === true, 'Datadog normalized telemetry produces anomalies');
  assert(ddAnomaly.anomalies.some(a => a.metric === 'latencyMs' && a.severity === SEVERITY_LEVELS.CRITICAL), 'Datadog latencyMs is CRITICAL anomaly');
  assert(ddAnomaly.anomalies.some(a => a.metric === 'errorRate'), 'Datadog errorRate is anomalous');

  // Prometheus Normalized Test
  const promNormalized = normalizeTelemetry({
    status: "firing",
    alerts: [{
      labels: { alertname: "PostgreSQL High CPU", severity: "critical", instance: "db-main-01", job: "postgresql" },
      annotations: { summary: "Database CPU above 95%" }
    }]
  }, 'prometheus');
  const promAnomaly = detectAnomalies(promNormalized);
  assert(promAnomaly.hasAnomalies === true, 'Prometheus normalized telemetry produces anomalies');
  assert(promAnomaly.anomalies.some(a => a.metric === 'cpuUtilization' && a.severity === SEVERITY_LEVELS.CRITICAL), 'Prometheus cpuUtilization is CRITICAL');
  assert(promAnomaly.anomalies.some(a => a.metric === 'activeConnections'), 'Prometheus activeConnections is anomalous');

  // CloudWatch Normalized Test
  const cwNormalized = normalizeTelemetry({
    AlarmName: "TargetTracking-ASG-ScaleOut",
    NewStateValue: "ALARM",
    Region: "eu-west-1"
  }, 'cloudwatch');
  const cwAnomaly = detectAnomalies(cwNormalized);
  assert(cwAnomaly.hasAnomalies === true, 'CloudWatch normalized telemetry produces anomalies');
  assert(cwAnomaly.anomalies.some(a => a.metric === 'requestRate' && a.severity === SEVERITY_LEVELS.CRITICAL), 'CloudWatch requestRate surge is CRITICAL');
  assert(cwAnomaly.anomalies.some(a => a.metric === 'queueDepth'), 'CloudWatch queueDepth backlog is anomalous');

  // Kubernetes Normalized Test
  const k8sNormalized = normalizeTelemetry({
    kind: "Event",
    involvedObject: { kind: "Pod", name: "auth-service-7f89b9d4-abc12", namespace: "production" },
    reason: "CrashLoopBackOff",
    count: 8
  }, 'kubernetes');
  const k8sAnomaly = detectAnomalies(k8sNormalized);
  assert(k8sAnomaly.hasAnomalies === true, 'Kubernetes normalized telemetry produces anomalies');
  assert(k8sAnomaly.anomalies.some(a => a.metric === 'restartCount' && a.severity === SEVERITY_LEVELS.CRITICAL), 'Kubernetes restartCount is CRITICAL');
  assert(k8sAnomaly.anomalies.some(a => a.metric === 'memoryUsageMb'), 'Kubernetes memory limit breach is anomalous');

  console.log(`\n==============================================`);
  console.log(`Phase 2 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runAnomalyDetectorTests();
