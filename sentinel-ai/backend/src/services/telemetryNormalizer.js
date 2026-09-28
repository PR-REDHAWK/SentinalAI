/**
 * Telemetry Normalizer Service
 * Phase 1: RAW Provider Event -> Standardized Normalized Telemetry
 * 
 * Provides a provider-independent internal representation of incoming
 * alerts, metrics, baselines, trends, logs, events, deployments, and dependencies.
 */

/**
 * Generate a simulated realistic temporal trend between baseline and current value
 * @param {number} baseline 
 * @param {number} current 
 * @param {number} count 
 * @param {Date} referenceDate 
 * @param {number} stepSeconds 
 * @returns {Array<{timestamp: string, value: number}>}
 */
const generateTrend = (baseline, current, count = 6, referenceDate = new Date(), stepSeconds = 60) => {
  const points = [];
  const totalDuration = (count - 1) * stepSeconds * 1000;
  const startTime = new Date(referenceDate.getTime() - totalDuration);

  for (let i = 0; i < count; i++) {
    const pointTime = new Date(startTime.getTime() + i * stepSeconds * 1000).toISOString();
    let value;
    if (i === 0) {
      value = baseline;
    } else if (i === count - 1) {
      value = current;
    } else {
      // Non-linear progression towards the degraded current value
      const progress = Math.pow(i / (count - 1), 1.5);
      value = Number((baseline + (current - baseline) * progress).toFixed(2));
    }
    points.push({ timestamp: pointTime, value });
  }
  return points;
};

/**
 * Helper to parse Datadog tag array ["env:production", "service:payment-gateway"]
 */
const parseDatadogTags = (tags = []) => {
  const parsed = {};
  if (Array.isArray(tags)) {
    tags.forEach(tag => {
      if (typeof tag === 'string' && tag.includes(':')) {
        const [key, ...rest] = tag.split(':');
        parsed[key.trim().toLowerCase()] = rest.join(':').trim();
      }
    });
  }
  return parsed;
};

/**
 * Normalizer for Datadog alerts
 */
const normalizeDatadog = (payload = {}, now = new Date()) => {
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : now;
  const tags = parseDatadogTags(payload.tags);
  const service = tags.service || payload.service || 'payment-gateway';
  const environment = tags.env || payload.environment || 'production';
  const region = tags.region || payload.region || 'us-east-1';
  const resource = payload.resource || tags.resource || tags.host || 'targetgroup/k8s-payment-gw/84f901ab23';

  const observedMetric = payload.metric || 'aws.applicationelb.target_response_time';
  const observedValue = typeof payload.value === 'number' ? payload.value : 1205.4;
  const threshold = typeof payload.threshold === 'number' ? payload.threshold : 500;
  const baselineLatency = payload.supporting_telemetry?.latency_trend_ms?.[0]?.baseline || 220;

  // Latency trend
  const latencyTrend = payload.supporting_telemetry?.latency_trend_ms 
    ? payload.supporting_telemetry.latency_trend_ms.map(p => ({
        timestamp: p.timestamp || timestamp.toISOString(),
        value: p.value
      }))
    : generateTrend(baselineLatency, observedValue, 6, timestamp, 60);

  // Request rate
  const reqRateCurrent = payload.supporting_telemetry?.request_rate_rps?.current ?? 460;
  const reqRateBaseline = payload.supporting_telemetry?.request_rate_rps?.baseline ?? 450;
  const reqRateTrend = generateTrend(reqRateBaseline, reqRateCurrent, 6, timestamp, 60);

  // Error rate
  const errRateCurrent = payload.supporting_telemetry?.error_rate_pct?.current ?? 8.5;
  const errRateBaseline = payload.supporting_telemetry?.error_rate_pct?.baseline ?? 0.1;
  const errRateTrend = generateTrend(errRateBaseline, errRateCurrent, 6, timestamp, 60);

  // CPU utilization
  const cpuCurrent = payload.supporting_telemetry?.cpu_utilization_pct?.current ?? 42;
  const cpuBaseline = payload.supporting_telemetry?.cpu_utilization_pct?.baseline ?? 35;
  const cpuTrend = generateTrend(cpuBaseline, cpuCurrent, 6, timestamp, 60);

  // Downstream latency
  const downstreamName = payload.supporting_telemetry?.downstream_dependency?.name || 'payment-processor-api';
  const downstreamCurrent = payload.supporting_telemetry?.downstream_dependency?.current_latency_ms ?? 980;
  const downstreamBaseline = payload.supporting_telemetry?.downstream_dependency?.baseline_latency_ms ?? 150;
  const downstreamTrend = generateTrend(downstreamBaseline, downstreamCurrent, 6, timestamp, 60);

  const tMinusMinutes = (m) => new Date(timestamp.getTime() - m * 60000).toISOString();

  return {
    schemaVersion: "1.0.0",
    source: "datadog",
    service,
    resource,
    region,
    environment,
    timestamp: timestamp.toISOString(),
    providerObservation: {
      alertId: payload.alert_id || null,
      alertName: payload.title || "Datadog Monitor Alert",
      status: payload.status || "Triggered",
      severity: payload.status === "Triggered" ? "critical" : "warning",
      reason: `Datadog monitor breached threshold (${threshold}) with observed value (${observedValue})`,
      threshold,
      observedValue,
      rawMetricName: observedMetric,
      rawTags: payload.tags || []
    },
    metrics: {
      latencyMs: {
        name: "latencyMs",
        unit: "ms",
        baseline: baselineLatency,
        current: observedValue,
        threshold,
        trend: latencyTrend
      },
      requestRate: {
        name: "requestRate",
        unit: "req/s",
        baseline: reqRateBaseline,
        current: reqRateCurrent,
        trend: reqRateTrend
      },
      errorRate: {
        name: "errorRate",
        unit: "percent",
        baseline: errRateBaseline,
        current: errRateCurrent,
        trend: errRateTrend
      },
      cpuUtilization: {
        name: "cpuUtilization",
        unit: "percent",
        baseline: cpuBaseline,
        current: cpuCurrent,
        trend: cpuTrend
      },
      downstreamLatencyMs: {
        name: "downstreamLatencyMs",
        unit: "ms",
        baseline: downstreamBaseline,
        current: downstreamCurrent,
        trend: downstreamTrend
      }
    },
    logs: [
      {
        timestamp: tMinusMinutes(3),
        level: "WARN",
        source: service,
        message: `High response time detected on downstream service '${downstreamName}' (latency: ${downstreamBaseline + 250}ms)`
      },
      {
        timestamp: tMinusMinutes(1),
        level: "ERROR",
        source: service,
        message: `HTTP 504 Gateway Timeout on POST /v1/payments/charge - socket timeout to '${downstreamName}'`
      },
      {
        timestamp: timestamp.toISOString(),
        level: "ERROR",
        source: service,
        message: `Circuit breaker OPEN for downstream service '${downstreamName}'. Error threshold (5%) exceeded.`
      }
    ],
    events: [
      {
        timestamp: tMinusMinutes(4),
        type: "Warning",
        reason: "ThresholdCrossed",
        message: `Target response time crossed warning threshold of 300ms`,
        source: "datadog-monitor"
      },
      {
        timestamp: timestamp.toISOString(),
        type: "Alert",
        reason: "CriticalThresholdCrossed",
        message: payload.title || `High latency detected (${observedValue}ms > ${threshold}ms)`,
        source: "datadog-monitor"
      }
    ],
    deployments: [
      {
        service,
        version: "v2.14.0",
        deployedAt: tMinusMinutes(45),
        status: "completed",
        commit: "7f8a12c",
        deployedBy: "ci-pipeline"
      }
    ],
    dependencies: [
      {
        name: downstreamName,
        type: "downstream",
        status: "degraded",
        baselineLatencyMs: downstreamBaseline,
        currentLatencyMs: downstreamCurrent,
        errorRatePercent: 12.4
      },
      {
        name: "redis-session-store",
        type: "cache",
        status: "healthy",
        baselineLatencyMs: 2,
        currentLatencyMs: 3,
        errorRatePercent: 0.0
      }
    ]
  };
};

/**
 * Normalizer for Prometheus alerts
 */
const normalizePrometheus = (payload = {}, now = new Date()) => {
  const alert = Array.isArray(payload.alerts) && payload.alerts.length > 0 ? payload.alerts[0] : {};
  const labels = alert.labels || {};
  const annotations = alert.annotations || {};

  const timestamp = alert.startsAt ? new Date(alert.startsAt) : now;
  const service = labels.job || labels.service || 'database-service';
  const resource = labels.instance || 'db-main-01';
  const region = labels.region || 'us-east-1';
  const environment = labels.env || labels.environment || 'production';

  const telemetry = alert.telemetry || payload.telemetry || {};
  const baselineCpu = telemetry.cpu_utilization_trend?.[0]?.baseline ?? 61;
  const currentCpu = telemetry.cpu_utilization_trend?.[telemetry.cpu_utilization_trend.length - 1]?.value ?? 96;

  const cpuTrend = telemetry.cpu_utilization_trend 
    ? telemetry.cpu_utilization_trend.map(p => ({
        timestamp: p.timestamp || timestamp.toISOString(),
        value: p.value
      }))
    : generateTrend(baselineCpu, currentCpu, 6, timestamp, 60);

  // Active connections
  const connBaseline = telemetry.active_connections?.baseline ?? 45;
  const connCurrent = telemetry.active_connections?.current ?? 290;
  const connLimit = telemetry.active_connections?.limit ?? 300;
  const connTrend = generateTrend(connBaseline, connCurrent, 6, timestamp, 60);

  // DB Latency
  const dbLatBaseline = telemetry.db_latency_ms?.baseline ?? 15;
  const dbLatCurrent = telemetry.db_latency_ms?.current ?? 450;
  const dbLatTrend = generateTrend(dbLatBaseline, dbLatCurrent, 6, timestamp, 60);

  // Query Latency P99
  const queryP99Baseline = telemetry.query_latency_p99_ms?.baseline ?? 25;
  const queryP99Current = telemetry.query_latency_p99_ms?.current ?? 1400;
  const queryP99Trend = generateTrend(queryP99Baseline, queryP99Current, 6, timestamp, 60);

  // Error Rate
  const errRateBaseline = telemetry.error_rate_pct?.baseline ?? 0.01;
  const errRateCurrent = telemetry.error_rate_pct?.current ?? 4.2;
  const errRateTrend = generateTrend(errRateBaseline, errRateCurrent, 6, timestamp, 60);

  const tMinusMinutes = (m) => new Date(timestamp.getTime() - m * 60000).toISOString();

  return {
    schemaVersion: "1.0.0",
    source: "prometheus",
    service,
    resource,
    region,
    environment,
    timestamp: timestamp.toISOString(),
    providerObservation: {
      alertName: labels.alertname || "Prometheus Alert",
      status: payload.status || alert.status || "firing",
      severity: labels.severity || "critical",
      summary: annotations.summary || "Database CPU above threshold",
      description: annotations.description || "Node CPU utilization sustained high usage",
      instance: resource,
      rawLabels: labels,
      rawAnnotations: annotations
    },
    metrics: {
      cpuUtilization: {
        name: "cpuUtilization",
        unit: "percent",
        baseline: baselineCpu,
        current: currentCpu,
        threshold: 90,
        trend: cpuTrend
      },
      activeConnections: {
        name: "activeConnections",
        unit: "connections",
        baseline: connBaseline,
        current: connCurrent,
        threshold: connLimit,
        trend: connTrend
      },
      dbLatencyMs: {
        name: "dbLatencyMs",
        unit: "ms",
        baseline: dbLatBaseline,
        current: dbLatCurrent,
        trend: dbLatTrend
      },
      queryLatencyP99: {
        name: "queryLatencyP99",
        unit: "ms",
        baseline: queryP99Baseline,
        current: queryP99Current,
        trend: queryP99Trend
      },
      errorRate: {
        name: "errorRate",
        unit: "percent",
        baseline: errRateBaseline,
        current: errRateCurrent,
        trend: errRateTrend
      }
    },
    logs: [
      {
        timestamp: tMinusMinutes(4),
        level: "WARN",
        source: service,
        message: `Connection pool utilization exceeded 80% (${connBaseline + 180}/${connLimit} connections active)`
      },
      {
        timestamp: tMinusMinutes(2),
        level: "ERROR",
        source: service,
        message: `Lock contention: Process PID 4912 waiting for ExclusiveLock on table 'orders' for >45s`
      },
      {
        timestamp: timestamp.toISOString(),
        level: "ERROR",
        source: service,
        message: `Connection limit reached: remaining connection slots reserved for superuser connections`
      }
    ],
    events: [
      {
        timestamp: tMinusMinutes(5),
        type: "AlertRuleEvaluating",
        reason: "MetricThresholdExceeded",
        message: `PostgreSQL CPU utilization crossed 80% evaluation rule`,
        source: "prometheus-alertmanager"
      },
      {
        timestamp: timestamp.toISOString(),
        type: "AlertFiring",
        reason: "CriticalSustainedCPU",
        message: annotations.description || `PostgreSQL primary node CPU utilization sustained >95%`,
        source: "prometheus-alertmanager"
      }
    ],
    deployments: [
      {
        service,
        version: "db-schema-v4.1.8",
        deployedAt: tMinusMinutes(30),
        status: "completed",
        commit: "e49b012",
        deployedBy: "db-admin"
      }
    ],
    dependencies: [
      {
        name: "ebs-nvme-storage",
        type: "storage",
        status: "degraded",
        baselineLatencyMs: 2,
        currentLatencyMs: 48,
        errorRatePercent: 0.0
      },
      {
        name: "pgbouncer-pool",
        type: "cache",
        status: "degraded",
        baselineLatencyMs: 1,
        currentLatencyMs: 120,
        errorRatePercent: 6.8
      }
    ]
  };
};

/**
 * Normalizer for AWS CloudWatch alerts
 */
const normalizeCloudwatch = (payload = {}, now = new Date()) => {
  const timestamp = payload.StateChangeTime ? new Date(payload.StateChangeTime) : now;
  const region = payload.Region || 'eu-west-1';
  const environment = payload.Environment || 'production';
  const alarmName = payload.AlarmName || 'TargetTracking-ASG-ScaleOut';

  const dimensionName = payload.Dimensions?.[0]?.value || 'asg-prod-eu-west-1-workers';
  const service = payload.service || 'auto-scaling-service';
  const resource = dimensionName;

  const supporting = payload.SupportingMetrics || {};

  // Request rate trend
  const reqBaseline = supporting.request_rate_trend?.[0]?.baseline ?? 1000;
  const reqCurrent = supporting.request_rate_trend?.[supporting.request_rate_trend.length - 1]?.value ?? 8500;
  const reqTrend = supporting.request_rate_trend 
    ? supporting.request_rate_trend.map(p => ({
        timestamp: p.timestamp || timestamp.toISOString(),
        value: p.value
      }))
    : generateTrend(reqBaseline, reqCurrent, 6, timestamp, 60);

  // CPU trend
  const cpuBaseline = supporting.cpu_trend?.[0]?.baseline ?? 40;
  const cpuCurrent = supporting.cpu_trend?.[supporting.cpu_trend.length - 1]?.value ?? 89;
  const cpuTrend = supporting.cpu_trend 
    ? supporting.cpu_trend.map(p => ({
        timestamp: p.timestamp || timestamp.toISOString(),
        value: p.value
      }))
    : generateTrend(cpuBaseline, cpuCurrent, 6, timestamp, 60);

  // Memory utilization
  const memBaseline = supporting.memory_utilization_pct?.baseline ?? 50;
  const memCurrent = supporting.memory_utilization_pct?.current ?? 82;
  const memTrend = generateTrend(memBaseline, memCurrent, 6, timestamp, 60);

  // Queue depth
  const queueBaseline = supporting.queue_depth_messages?.baseline ?? 12;
  const queueCurrent = supporting.queue_depth_messages?.current ?? 1450;
  const queueTrend = generateTrend(queueBaseline, queueCurrent, 6, timestamp, 60);

  // Latency
  const latBaseline = supporting.latency_ms?.baseline ?? 85;
  const latCurrent = supporting.latency_ms?.current ?? 390;
  const latTrend = generateTrend(latBaseline, latCurrent, 6, timestamp, 60);

  // Error rate
  const errBaseline = supporting.error_rate_pct?.baseline ?? 0.05;
  const errCurrent = supporting.error_rate_pct?.current ?? 1.8;
  const errTrend = generateTrend(errBaseline, errCurrent, 6, timestamp, 60);

  const tMinusMinutes = (m) => new Date(timestamp.getTime() - m * 60000).toISOString();

  return {
    schemaVersion: "1.0.0",
    source: "cloudwatch",
    service,
    resource,
    region,
    environment,
    timestamp: timestamp.toISOString(),
    providerObservation: {
      alarmName,
      state: payload.NewStateValue || "ALARM",
      reason: payload.NewStateReason || "Threshold Crossed: 2 datapoints were greater than or equal to the threshold (80.0).",
      region,
      namespace: payload.Namespace || "AWS/EC2",
      metricName: payload.MetricName || "CPUUtilization",
      dimensions: payload.Dimensions || [{ name: "AutoScalingGroupName", value: resource }]
    },
    metrics: {
      requestRate: {
        name: "requestRate",
        unit: "req/s",
        baseline: reqBaseline,
        current: reqCurrent,
        trend: reqTrend
      },
      cpuUtilization: {
        name: "cpuUtilization",
        unit: "percent",
        baseline: cpuBaseline,
        current: cpuCurrent,
        threshold: 80,
        trend: cpuTrend
      },
      memoryUtilization: {
        name: "memoryUtilization",
        unit: "percent",
        baseline: memBaseline,
        current: memCurrent,
        trend: memTrend
      },
      queueDepth: {
        name: "queueDepth",
        unit: "messages",
        baseline: queueBaseline,
        current: queueCurrent,
        trend: queueTrend
      },
      latencyMs: {
        name: "latencyMs",
        unit: "ms",
        baseline: latBaseline,
        current: latCurrent,
        trend: latTrend
      },
      errorRate: {
        name: "errorRate",
        unit: "percent",
        baseline: errBaseline,
        current: errCurrent,
        trend: errTrend
      }
    },
    logs: [
      {
        timestamp: tMinusMinutes(3),
        level: "INFO",
        source: "AWS/AutoScaling",
        message: `TargetTracking policy triggered on ${resource}: CPU utilization breached target of 80.0%`
      },
      {
        timestamp: tMinusMinutes(2),
        level: "WARN",
        source: "AWS/AutoScaling",
        message: `ScaleOut activity initiated: requesting capacity increase from 6 to 18 instances`
      },
      {
        timestamp: timestamp.toISOString(),
        level: "WARN",
        source: "AWS/ApplicationELB",
        message: `Elevated target response time (390ms) during instance warmup and initialization`
      }
    ],
    events: [
      {
        timestamp: tMinusMinutes(4),
        type: "MetricBreached",
        reason: "CPUThresholdCrossed",
        message: `Metric CPUUtilization reached 84% on group ${resource}`,
        source: "aws-cloudwatch"
      },
      {
        timestamp: timestamp.toISOString(),
        type: "AlarmStateChange",
        reason: "ThresholdCrossed",
        message: `Alarm ${alarmName} changed state from OK to ALARM`,
        source: "aws-cloudwatch"
      }
    ],
    deployments: [
      {
        service,
        version: "v1.19.4",
        deployedAt: tMinusMinutes(180),
        status: "completed",
        commit: "9c34f10",
        deployedBy: "ci-pipeline"
      }
    ],
    dependencies: [
      {
        name: "sqs-ingestion-queue",
        type: "queue",
        status: "degraded",
        baselineLatencyMs: 5,
        currentLatencyMs: 180,
        errorRatePercent: 0.0
      },
      {
        name: "rds-aurora-cluster",
        type: "database",
        status: "healthy",
        baselineLatencyMs: 8,
        currentLatencyMs: 14,
        errorRatePercent: 0.0
      }
    ]
  };
};

/**
 * Normalizer for Kubernetes events
 */
const normalizeKubernetes = (payload = {}, now = new Date()) => {
  const timestamp = payload.lastTimestamp ? new Date(payload.lastTimestamp) : now;
  const involvedObject = payload.involvedObject || {};
  const podName = involvedObject.name || 'auth-service-7f89b9d4-abc12';
  
  // Extract service name by stripping replica hash suffixes if formatted like k8s pod
  let derivedService = podName.replace(/-[0-9a-f]{8,10}-[0-9a-z]{5}$/i, '');
  if (!derivedService || derivedService === podName) {
    derivedService = podName.split('-')[0] + '-service';
  }
  const service = payload.service || derivedService || 'auth-service';
  const resource = podName;
  const environment = involvedObject.namespace || 'production';
  const region = payload.region || 'Global';

  const podTelemetry = payload.pod_telemetry || {};

  // Restarts
  const restartBaseline = podTelemetry.restart_count?.baseline ?? 0;
  const restartCurrent = podTelemetry.restart_count?.current ?? (payload.count || 8);
  const restartTrend = generateTrend(restartBaseline, restartCurrent, 6, timestamp, 120);

  // Container uptime
  const uptimeBaseline = podTelemetry.container_uptime_seconds?.baseline ?? 86400;
  const uptimeCurrent = podTelemetry.container_uptime_seconds?.current ?? 14;
  const uptimeTrend = generateTrend(uptimeBaseline, uptimeCurrent, 6, timestamp, 120);

  // Memory usage
  const memBaseline = podTelemetry.memory_mb?.baseline ?? 220;
  const memCurrent = podTelemetry.memory_mb?.current ?? 512;
  const memLimit = podTelemetry.memory_mb?.limit ?? 512;
  const memTrend = generateTrend(memBaseline, memCurrent, 6, timestamp, 120);

  // CPU utilization
  const cpuBaseline = podTelemetry.cpu_utilization_pct?.baseline ?? 15;
  const cpuCurrent = podTelemetry.cpu_utilization_pct?.current ?? 92;
  const cpuTrend = generateTrend(cpuBaseline, cpuCurrent, 6, timestamp, 120);

  // Error rate
  const errBaseline = podTelemetry.error_rate_pct?.baseline ?? 0.02;
  const errCurrent = podTelemetry.error_rate_pct?.current ?? 45.0;
  const errTrend = generateTrend(errBaseline, errCurrent, 6, timestamp, 120);

  const tMinusMinutes = (m) => new Date(timestamp.getTime() - m * 60000).toISOString();

  const customLogs = podTelemetry.container_logs || [
    `[auth-service] INFO Starting auth-service daemon on :8080 (pid 1)...`,
    `[auth-service] INFO Warming up token verification cache from Redis...`,
    `[auth-service] FATAL java.lang.OutOfMemoryError: Java heap space / container memory limit (512MiB) exceeded`,
    `[kubelet] ERROR Container auth-service in pod ${resource} failed liveness probe, restarting`
  ];

  return {
    schemaVersion: "1.0.0",
    source: "kubernetes",
    service,
    resource,
    region,
    environment,
    timestamp: timestamp.toISOString(),
    providerObservation: {
      kind: payload.kind || "Event",
      objectKind: involvedObject.kind || "Pod",
      objectName: resource,
      namespace: environment,
      reason: payload.reason || "CrashLoopBackOff",
      message: payload.message || "Back-off restarting failed container",
      eventType: payload.type || "Warning",
      eventCount: payload.count || restartCurrent,
      rawInvolvedObject: involvedObject
    },
    metrics: {
      restartCount: {
        name: "restartCount",
        unit: "count",
        baseline: restartBaseline,
        current: restartCurrent,
        trend: restartTrend
      },
      containerUptime: {
        name: "containerUptime",
        unit: "seconds",
        baseline: uptimeBaseline,
        current: uptimeCurrent,
        trend: uptimeTrend
      },
      memoryUsageMb: {
        name: "memoryUsageMb",
        unit: "MB",
        baseline: memBaseline,
        current: memCurrent,
        limit: memLimit,
        trend: memTrend
      },
      cpuUtilization: {
        name: "cpuUtilization",
        unit: "percent",
        baseline: cpuBaseline,
        current: cpuCurrent,
        trend: cpuTrend
      },
      errorRate: {
        name: "errorRate",
        unit: "percent",
        baseline: errBaseline,
        current: errCurrent,
        trend: errTrend
      }
    },
    logs: customLogs.map((msg, idx) => ({
      timestamp: tMinusMinutes(3 - idx),
      level: msg.includes('FATAL') ? 'FATAL' : msg.includes('ERROR') ? 'ERROR' : msg.includes('WARN') ? 'WARN' : 'INFO',
      source: `k8s/${involvedObject.kind || 'Pod'}/${resource}`,
      message: msg
    })),
    events: [
      {
        timestamp: tMinusMinutes(8),
        type: "Warning",
        reason: "Unhealthy",
        message: `Readiness probe failed: HTTP probe returned status code 500`,
        source: "kubelet"
      },
      {
        timestamp: tMinusMinutes(4),
        type: "Warning",
        reason: "OOMKilled",
        message: `Container ${service} exceeded memory limit (${memLimit}MiB) and was killed`,
        source: "kubelet"
      },
      {
        timestamp: timestamp.toISOString(),
        type: payload.type || "Warning",
        reason: payload.reason || "CrashLoopBackOff",
        message: payload.message || `Back-off restarting failed container in pod ${resource}`,
        source: "kubelet"
      }
    ],
    deployments: [
      podTelemetry.recent_deployment || {
        service,
        version: "v2.4.1",
        deployedAt: tMinusMinutes(15),
        status: "degraded",
        commit: "b7e2d9a",
        deployedBy: "automated-cd"
      }
    ],
    dependencies: [
      {
        name: "redis-session-cache",
        type: "cache",
        status: "healthy",
        baselineLatencyMs: 1.5,
        currentLatencyMs: 2.1,
        errorRatePercent: 0.0
      },
      {
        name: "user-postgresql-db",
        type: "database",
        status: "healthy",
        baselineLatencyMs: 12,
        currentLatencyMs: 15,
        errorRatePercent: 0.0
      }
    ]
  };
};

/**
 * Main telemetry normalizer entrypoint
 * @param {Object} rawPayload - Raw incoming webhook body from monitoring provider
 * @param {string} source - 'datadog' | 'prometheus' | 'cloudwatch' | 'kubernetes'
 * @returns {Object} Normalized telemetry standard representation
 */
const normalizeTelemetry = (rawPayload = {}, source = 'unknown') => {
  const normalizedSource = (source || '').toLowerCase();
  const now = new Date();

  switch (normalizedSource) {
    case 'datadog':
      return normalizeDatadog(rawPayload, now);
    case 'prometheus':
      return normalizePrometheus(rawPayload, now);
    case 'cloudwatch':
    case 'aws':
    case 'aws cloudwatch':
      return normalizeCloudwatch(rawPayload, now);
    case 'kubernetes':
    case 'k8s':
      return normalizeKubernetes(rawPayload, now);
    default:
      // Generic fallback normalizer preserving all fields
      return {
        schemaVersion: "1.0.0",
        source: normalizedSource || "unknown",
        service: rawPayload.service || "unknown-service",
        resource: rawPayload.resource || "unknown-resource",
        region: rawPayload.region || "Global",
        environment: rawPayload.environment || "production",
        timestamp: rawPayload.timestamp || now.toISOString(),
        providerObservation: {
          raw: rawPayload
        },
        metrics: {},
        logs: [],
        events: [],
        deployments: [],
        dependencies: []
      };
  }
};

module.exports = {
  normalizeTelemetry,
  normalizeDatadog,
  normalizePrometheus,
  normalizeCloudwatch,
  normalizeKubernetes,
  generateTrend
};
