/**
 * Telemetry Adapter Service
 * Converts ShopDemo internal production observations into standard provider telemetry payloads
 * (Datadog / Prometheus / CloudWatch / Kubernetes format) for SentinelAI ingestion.
 * 
 * CRITICAL SAFETY CONTRACT:
 * - MUST NEVER include `activeScenario`, `hiddenGroundTruth`, or `incident_type` in the payload sent to SentinelAI.
 * - MUST ONLY convey observable metrics, baselines, logs, events, and dependency health.
 */

const formatTelemetryForSentinel = (engineState) => {
  const { metrics, baselines, services, recentLogs, recentEvents, activeScenario, scenarioStage } = engineState;
  const now = new Date();

  // Map active scenario to appropriate monitoring provider structure (Datadog/Prometheus/CloudWatch/K8s)
  // based on the primary symptom, WITHOUT revealing ground truth labels.
  
  if (activeScenario === 'DATABASE_DEGRADATION' || activeScenario === 'DATABASE_CONNECTION_EXHAUSTION') {
    // Prometheus Alertmanager payload structure
    return {
      source: 'Prometheus',
      payload: {
        receiver: 'sentinelai-prometheus-adapter',
        status: 'firing',
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: activeScenario === 'DATABASE_CONNECTION_EXHAUSTION' ? 'PostgresConnectionPoolExhausted' : 'PostgresHighQueryLatency',
              severity: scenarioStage >= 3 ? 'critical' : 'warning',
              job: 'database-service',
              instance: 'postgresql-primary-01.prod',
              env: 'production',
              region: 'us-east-1'
            },
            annotations: {
              summary: 'Database metric threshold breached on node postgresql-primary-01',
              description: `Observed query latency ${metrics.dbLatency}ms vs baseline ${baselines.dbLatency}ms. Active connections: ${metrics.dbConnections}/100.`
            },
            startsAt: new Date(Date.now() - 3 * 60000).toISOString(),
            telemetry: {
              cpu_utilization_trend: [
                { timestamp: new Date(Date.now() - 180000).toISOString(), baseline: baselines.cpu, value: baselines.cpu + 5 },
                { timestamp: now.toISOString(), baseline: baselines.cpu, value: metrics.cpu }
              ],
              active_connections: {
                baseline: baselines.dbConnections,
                current: metrics.dbConnections,
                limit: 100
              },
              db_latency_ms: {
                baseline: baselines.dbLatency,
                current: metrics.dbLatency
              },
              query_latency_p99_ms: {
                baseline: baselines.dbLatency + 10,
                current: metrics.dbLatency * 2.5
              },
              error_rate_pct: {
                baseline: baselines.errorRate,
                current: metrics.errorRate
              }
            }
          }
        ]
      }
    };
  }

  if (activeScenario === 'CONTAINER_FAILURE' || activeScenario === 'MEMORY_LEAK') {
    // Kubernetes Event / CloudWatch payload structure
    return {
      source: 'Kubernetes',
      payload: {
        lastTimestamp: now.toISOString(),
        involvedObject: {
          kind: 'Pod',
          name: activeScenario === 'MEMORY_LEAK' ? 'order-service-7f89b9d-w2981' : 'auth-service-5c64a8d-k9120',
          namespace: 'production',
          fieldPath: 'spec.containers{app}'
        },
        service: activeScenario === 'MEMORY_LEAK' ? 'order-service' : 'auth-service',
        reason: activeScenario === 'MEMORY_LEAK' ? 'OOMKilled' : 'CrashLoopBackOff',
        message: activeScenario === 'MEMORY_LEAK' 
          ? `Pod memory utilization limit (95%) reached. Container killed by OOM killer.`
          : `Pod auth-service liveness probe failed 3 consecutive times. Pod restarting.`,
        supportingTelemetry: {
          memory_utilization_pct: {
            baseline: baselines.memory,
            current: metrics.memory
          },
          cpu_utilization_pct: {
            baseline: baselines.cpu,
            current: metrics.cpu
          },
          error_rate_pct: {
            baseline: baselines.errorRate,
            current: metrics.errorRate
          },
          request_rate_rps: {
            baseline: baselines.traffic,
            current: metrics.traffic
          }
        }
      }
    };
  }

  // Default to Datadog Webhook payload format for TRAFFIC_SPIKE, PAYMENT_DEPENDENCY_FAILURE, DEPLOYMENT_REGRESSION, HIGH_ERROR_RATE
  const primaryService = activeScenario === 'PAYMENT_DEPENDENCY_FAILURE' ? 'payment-service' : (activeScenario === 'DEPLOYMENT_REGRESSION' ? 'product-service' : 'api-gateway');

  return {
    source: 'Datadog',
    payload: {
      alert_id: 'dd-alert-' + Date.now().toString().slice(-6),
      title: `High Target Response Time & Error Spike on ${primaryService}`,
      status: scenarioStage >= 3 ? 'Triggered' : 'Warn',
      tags: [
        `env:production`,
        `service:${primaryService}`,
        `region:us-east-1`,
        `resource:k8s-${primaryService}-cluster`
      ],
      service: primaryService,
      resource: `targetgroup/k8s-${primaryService}/84f901ab23`,
      metric: 'aws.applicationelb.target_response_time',
      value: metrics.apiLatency,
      threshold: baselines.apiLatency * 2,
      timestamp: now.toISOString(),
      supporting_telemetry: {
        latency_trend_ms: [
          { timestamp: new Date(Date.now() - 180000).toISOString(), baseline: baselines.apiLatency, value: baselines.apiLatency },
          { timestamp: new Date(Date.now() - 60000).toISOString(), value: Math.round((baselines.apiLatency + metrics.apiLatency) / 2) },
          { timestamp: now.toISOString(), value: metrics.apiLatency }
        ],
        request_rate_rps: {
          baseline: baselines.traffic,
          current: metrics.traffic
        },
        error_rate_pct: {
          baseline: baselines.errorRate,
          current: metrics.errorRate
        },
        cpu_utilization_pct: {
          baseline: baselines.cpu,
          current: metrics.cpu
        },
        downstream_dependency: {
          name: activeScenario === 'PAYMENT_DEPENDENCY_FAILURE' ? 'payment-processor-api' : (activeScenario === 'DATABASE_DEGRADATION' ? 'database' : 'auth-service'),
          current_latency_ms: activeScenario === 'PAYMENT_DEPENDENCY_FAILURE' ? metrics.paymentLatency : metrics.dbLatency,
          baseline_latency_ms: activeScenario === 'PAYMENT_DEPENDENCY_FAILURE' ? baselines.paymentLatency : baselines.dbLatency
        }
      }
    }
  };
};

module.exports = {
  formatTelemetryForSentinel
};
