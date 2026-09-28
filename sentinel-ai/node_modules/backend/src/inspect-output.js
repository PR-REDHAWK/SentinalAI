const { normalizeTelemetry } = require('./services/telemetryNormalizer');

// Comprehensive validation and inspection script
const validateAllProviders = () => {
  console.log('======================================================');
  console.log('  SENTINEL-AI PHASE 1 TELEMETRY NORMALIZATION VERIFIER');
  console.log('======================================================\n');

  // Datadog Payload
  const ddPayload = {
    alert_id: "10934812",
    title: "High Latency Detected on Payment Gateway",
    status: "Triggered",
    tags: ["env:production", "service:payment-gateway", "region:us-east-1", "team:payments-infra"],
    metric: "aws.applicationelb.target_response_time",
    value: 1205.4,
    threshold: 500,
    timestamp: "2026-09-28T16:00:00.000Z"
  };

  console.log('1. Datadog Normalized Output:');
  const ddResult = normalizeTelemetry(ddPayload, 'datadog');
  console.log(JSON.stringify(ddResult, null, 2));

  // Prometheus Payload
  const promPayload = {
    status: "firing",
    alerts: [{
      labels: {
        alertname: "PostgreSQL High CPU",
        severity: "critical",
        instance: "db-main-01",
        job: "postgresql",
        env: "production",
        region: "us-east-1"
      },
      annotations: {
        summary: "Database CPU above 95%",
        description: "PostgreSQL primary node CPU utilization has sustained >95% for 5 minutes."
      },
      startsAt: "2026-09-28T16:00:00.000Z"
    }]
  };

  console.log('\n2. Prometheus Normalized Output:');
  const promResult = normalizeTelemetry(promPayload, 'prometheus');
  console.log(JSON.stringify(promResult, null, 2));

  // CloudWatch Payload
  const cwPayload = {
    AlarmName: "TargetTracking-ASG-ScaleOut",
    NewStateValue: "ALARM",
    NewStateReason: "Threshold Crossed: 2 datapoints were greater than or equal to the threshold (80.0).",
    StateChangeTime: "2026-09-28T16:00:00.000Z",
    Region: "eu-west-1",
    Namespace: "AWS/EC2",
    MetricName: "CPUUtilization",
    Dimensions: [
      { name: "AutoScalingGroupName", value: "asg-prod-eu-west-1-workers" }
    ]
  };

  console.log('\n3. AWS CloudWatch Normalized Output:');
  const cwResult = normalizeTelemetry(cwPayload, 'cloudwatch');
  console.log(JSON.stringify(cwResult, null, 2));

  // Kubernetes Payload
  const k8sPayload = {
    kind: "Event",
    apiVersion: "v1",
    involvedObject: {
      kind: "Pod",
      name: "auth-service-7f89b9d4-abc12",
      namespace: "production"
    },
    reason: "CrashLoopBackOff",
    message: "Back-off restarting failed container auth-service in pod auth-service-7f89b9d4-abc12",
    type: "Warning",
    count: 8,
    lastTimestamp: "2026-09-28T16:00:00.000Z"
  };

  console.log('\n4. Kubernetes Normalized Output:');
  const k8sResult = normalizeTelemetry(k8sPayload, 'kubernetes');
  console.log(JSON.stringify(k8sResult, null, 2));
};

validateAllProviders();
