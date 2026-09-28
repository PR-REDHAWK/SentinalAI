const {
  normalizeTelemetry,
  normalizeDatadog,
  normalizePrometheus,
  normalizeCloudwatch,
  normalizeKubernetes
} = require('./services/telemetryNormalizer');

const runTests = () => {
  console.log('🧪 Starting Phase 1 Telemetry Normalizer Tests...\n');
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

  // 1. Datadog Test
  console.log('--- 1. Testing Datadog Normalization ---');
  const datadogPayload = {
    alert_id: "10934812",
    title: "High Latency Detected on Payment Gateway",
    status: "Triggered",
    tags: ["env:production", "service:payment-gateway", "region:us-east-1"],
    metric: "aws.applicationelb.target_response_time",
    value: 1205.4,
    threshold: 500,
    timestamp: "2026-09-28T16:00:00.000Z"
  };

  const ddNormalized = normalizeTelemetry(datadogPayload, 'datadog');
  assert(ddNormalized.source === 'datadog', 'Datadog source is "datadog"');
  assert(ddNormalized.service === 'payment-gateway', 'Extracted service "payment-gateway" from tags');
  assert(ddNormalized.region === 'us-east-1', 'Extracted region "us-east-1" from tags');
  assert(ddNormalized.environment === 'production', 'Extracted environment "production" from tags');
  assert(ddNormalized.metrics.latencyMs.current === 1205.4, 'Latency current is 1205.4');
  assert(ddNormalized.metrics.latencyMs.baseline === 220, 'Latency baseline is 220');
  assert(Array.isArray(ddNormalized.metrics.latencyMs.trend) && ddNormalized.metrics.latencyMs.trend.length === 6, 'Latency trend contains 6 temporal observations');
  assert(ddNormalized.metrics.errorRate.current === 8.5, 'Error rate metric is present');
  assert(ddNormalized.metrics.cpuUtilization.current === 42, 'CPU utilization metric is present');
  assert(ddNormalized.dependencies.length >= 1, 'Downstream dependencies are mapped');
  assert(ddNormalized.logs.length >= 2, 'Log records generated');
  assert(ddNormalized.deployments.length >= 1, 'Recent deployment record present');
  assert(ddNormalized.providerObservation.alertId === "10934812", 'Provider observation alertId preserved');

  // 2. Prometheus Test
  console.log('\n--- 2. Testing Prometheus Normalization ---');
  const prometheusPayload = {
    status: "firing",
    alerts: [{
      labels: {
        alertname: "PostgreSQL High CPU",
        severity: "critical",
        instance: "db-main-01",
        job: "postgresql",
        env: "production"
      },
      annotations: {
        summary: "Database CPU above 95%",
        description: "PostgreSQL primary node CPU utilization has sustained >95% for 5 minutes."
      },
      startsAt: "2026-09-28T16:00:00.000Z"
    }]
  };

  const promNormalized = normalizeTelemetry(prometheusPayload, 'prometheus');
  assert(promNormalized.source === 'prometheus', 'Prometheus source is "prometheus"');
  assert(promNormalized.resource === 'db-main-01', 'Instance db-main-01 extracted as resource');
  assert(promNormalized.providerObservation.severity === 'critical', 'Severity preserved as observed signal');
  assert(promNormalized.metrics.cpuUtilization.baseline === 61, 'CPU baseline is 61');
  assert(promNormalized.metrics.cpuUtilization.current === 96, 'CPU current is 96');
  assert(promNormalized.metrics.cpuUtilization.trend.length === 6, 'CPU trend contains 6 temporal points');
  assert(promNormalized.metrics.activeConnections.current === 290, 'Active connections metric normalized');
  assert(promNormalized.metrics.queryLatencyP99.current === 1400, 'Query latency p99 normalized');
  assert(promNormalized.logs.some(l => l.message.includes('Lock contention') || l.message.includes('Connection')), 'Database logs captured');
  assert(promNormalized.providerObservation.alertName === "PostgreSQL High CPU", 'Provider alert name preserved as observation');

  // 3. AWS CloudWatch Test
  console.log('\n--- 3. Testing AWS CloudWatch Normalization ---');
  const cloudwatchPayload = {
    AlarmName: "TargetTracking-ASG-ScaleOut",
    NewStateValue: "ALARM",
    NewStateReason: "Threshold Crossed: 2 datapoints were greater than or equal to the threshold (80.0).",
    StateChangeTime: "2026-09-28T16:00:00.000Z",
    Region: "eu-west-1"
  };

  const cwNormalized = normalizeTelemetry(cloudwatchPayload, 'cloudwatch');
  assert(cwNormalized.source === 'cloudwatch', 'CloudWatch source is "cloudwatch"');
  assert(cwNormalized.region === 'eu-west-1', 'Region is eu-west-1');
  assert(cwNormalized.providerObservation.state === 'ALARM', 'Alarm state is ALARM');
  assert(cwNormalized.metrics.requestRate.baseline === 1000, 'Request rate baseline is 1000');
  assert(cwNormalized.metrics.requestRate.current === 8500, 'Request rate current is 8500');
  assert(cwNormalized.metrics.requestRate.trend.length === 6, 'Request rate trend has 6 temporal points');
  assert(cwNormalized.metrics.cpuUtilization.current === 89, 'CPU utilization normalized');
  assert(cwNormalized.metrics.queueDepth.current === 1450, 'Queue depth metric normalized');
  assert(cwNormalized.events.some(e => e.source === 'aws-cloudwatch'), 'CloudWatch event captured');

  // 4. Kubernetes Test
  console.log('\n--- 4. Testing Kubernetes Normalization ---');
  const kubernetesPayload = {
    kind: "Event",
    involvedObject: {
      kind: "Pod",
      name: "auth-service-7f89b9d4-abc12",
      namespace: "production"
    },
    reason: "CrashLoopBackOff",
    message: "Back-off restarting failed container",
    type: "Warning",
    lastTimestamp: "2026-09-28T16:00:00.000Z"
  };

  const k8sNormalized = normalizeTelemetry(kubernetesPayload, 'kubernetes');
  assert(k8sNormalized.source === 'kubernetes', 'Kubernetes source is "kubernetes"');
  assert(k8sNormalized.service === 'auth-service', 'Service correctly derived as auth-service');
  assert(k8sNormalized.resource === 'auth-service-7f89b9d4-abc12', 'Resource is pod name');
  assert(k8sNormalized.environment === 'production', 'Environment is production namespace');
  assert(k8sNormalized.providerObservation.reason === 'CrashLoopBackOff', 'CrashLoopBackOff captured as provider observation');
  assert(k8sNormalized.metrics.restartCount.current === 8, 'Restart count is 8');
  assert(k8sNormalized.metrics.containerUptime.current === 14, 'Container uptime is 14s');
  assert(k8sNormalized.metrics.memoryUsageMb.current === 512, 'Memory usage is 512MB');
  assert(k8sNormalized.metrics.memoryUsageMb.limit === 512, 'Memory limit is 512MB');
  assert(k8sNormalized.logs.some(l => l.message.includes('OutOfMemoryError')), 'OOM error captured in logs');
  assert(k8sNormalized.events.some(e => e.reason === 'CrashLoopBackOff' || e.reason === 'OOMKilled'), 'Kubernetes events captured');
  assert(k8sNormalized.deployments[0].version === 'v2.4.1', 'Deployment version captured');

  // 5. Schema Uniformity Across All Providers
  console.log('\n--- 5. Testing Schema Uniformity ---');
  const requiredKeys = ['schemaVersion', 'source', 'service', 'resource', 'region', 'environment', 'timestamp', 'providerObservation', 'metrics', 'logs', 'events', 'deployments', 'dependencies'];
  [ddNormalized, promNormalized, cwNormalized, k8sNormalized].forEach((norm, idx) => {
    const pName = ['Datadog', 'Prometheus', 'CloudWatch', 'Kubernetes'][idx];
    const hasAllKeys = requiredKeys.every(k => Object.prototype.hasOwnProperty.call(norm, k));
    assert(hasAllKeys, `${pName} schema has all required top-level keys`);
  });

  console.log(`\n===============================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`===============================\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
