/**
 * Incident Identification Engine
 * Phase 3: Anomaly Set + Normalized Telemetry -> Weighted Incident Hypotheses
 * 
 * Answers: "Given these abnormal signals, what type of production incident is most likely occurring?"
 * 
 * Rules:
 * - Operates purely on normalized telemetry & anomaly sets (provider-agnostic).
 * - Multi-signal correlation: combines metrics, trends, baselines, logs, events, deployments, dependencies.
 * - Deterministic, weighted, bounded confidence (0-100).
 * - Provider alerts are treated as weak/moderate supporting evidence, NEVER as sole truth.
 * - Handles uncertainty gracefully (returns UNKNOWN_ANOMALY when evidence is insufficient).
 */

// Controlled Incident Taxonomy
const INCIDENT_TYPES = {
  DATABASE_CONNECTION_EXHAUSTION: 'DATABASE_CONNECTION_EXHAUSTION',
  DATABASE_DEGRADATION: 'DATABASE_DEGRADATION',
  MEMORY_EXHAUSTION: 'MEMORY_EXHAUSTION',
  CPU_SATURATION: 'CPU_SATURATION',
  TRAFFIC_OVERLOAD: 'TRAFFIC_OVERLOAD',
  DEPLOYMENT_REGRESSION: 'DEPLOYMENT_REGRESSION',
  SERVICE_DEPENDENCY_FAILURE: 'SERVICE_DEPENDENCY_FAILURE',
  CONTAINER_FAILURE: 'CONTAINER_FAILURE',
  HIGH_LATENCY: 'HIGH_LATENCY',
  HIGH_ERROR_RATE: 'HIGH_ERROR_RATE',
  RESOURCE_SATURATION: 'RESOURCE_SATURATION',
  UNKNOWN_ANOMALY: 'UNKNOWN_ANOMALY'
};

const DISPLAY_NAMES = {
  DATABASE_CONNECTION_EXHAUSTION: 'Database Connection Pool Exhaustion',
  DATABASE_DEGRADATION: 'Database Performance Degradation',
  MEMORY_EXHAUSTION: 'Memory Exhaustion & OOM Fault',
  CPU_SATURATION: 'Compute / CPU Saturation',
  TRAFFIC_OVERLOAD: 'High Traffic Surge & Ingestion Overload',
  DEPLOYMENT_REGRESSION: 'Deployment Code Regression',
  SERVICE_DEPENDENCY_FAILURE: 'Downstream Service Dependency Failure',
  CONTAINER_FAILURE: 'Container Lifecycle / CrashLoop Failure',
  HIGH_LATENCY: 'Service Latency Degradation',
  HIGH_ERROR_RATE: 'Elevated Service Error Rate',
  RESOURCE_SATURATION: 'Multi-Resource Host Saturation',
  UNKNOWN_ANOMALY: 'Ambiguous Telemetry Anomaly'
};

/**
 * Helper to find an anomaly by metric name pattern
 */
const findAnomaly = (anomalies = [], pattern) => {
  return anomalies.find(a => pattern.test(a.metric));
};

/**
 * Helper to check logs for keyword matches
 */
const checkLogs = (logs = [], pattern) => {
  return logs.filter(l => pattern.test(l.message || ''));
};

/**
 * Helper to check events for keyword matches
 */
const checkEvents = (events = [], pattern) => {
  return events.filter(e => pattern.test(e.reason || '') || pattern.test(e.message || ''));
};

/**
 * Helper to check recent deployments
 */
const getRecentDeployment = (deployments = [], referenceTime = new Date(), maxMinutesAgo = 90) => {
  if (!Array.isArray(deployments) || deployments.length === 0) return null;
  const refMs = new Date(referenceTime).getTime();
  return deployments.find(d => {
    const depMs = new Date(d.deployedAt).getTime();
    const diffMins = (refMs - depMs) / 60000;
    return diffMins >= 0 && diffMins <= maxMinutesAgo;
  });
};

/**
 * Reusable Incident Signatures
 */
const INCIDENT_SIGNATURES = [
  // 1. DATABASE_CONNECTION_EXHAUSTION
  {
    type: INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION,
    displayName: DISPLAY_NAMES.DATABASE_CONNECTION_EXHAUSTION,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const logs = telemetry.logs || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const connAno = findAnomaly(anomalies, /connection|pool|active_connections/i);
      const dbLatAno = findAnomaly(anomalies, /dblatency|querylatency/i);
      const errAno = findAnomaly(anomalies, /error/i);
      const apiLatAno = findAnomaly(anomalies, /^latency|responsetime/i);

      if (connAno) {
        const poolUtil = connAno.threshold ? (connAno.current / connAno.threshold) * 100 : 90;
        const weight = connAno.anomalyScore >= 85 ? 35 : 20;
        score += weight;
        supporting.push({
          signal: connAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Active DB connections reached ${connAno.current}/${connAno.threshold || 'max'} (${poolUtil.toFixed(1)}% pool capacity, score: ${connAno.anomalyScore}/100)`
        });
      } else {
        const connMetric = telemetry.metrics?.activeConnections;
        if (connMetric && connMetric.threshold && (connMetric.current / connMetric.threshold) < 0.5) {
          score -= 30;
          contradicting.push({
            signal: 'activeConnections',
            type: 'metric_normal',
            weight: -30,
            description: `Active DB connections are well within limit (${connMetric.current}/${connMetric.threshold})`
          });
        }
      }

      if (dbLatAno) {
        const weight = dbLatAno.anomalyScore >= 80 ? 25 : 15;
        score += weight;
        supporting.push({
          signal: dbLatAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Database query response latency elevated (${dbLatAno.current}${dbLatAno.unit || 'ms'}, score: ${dbLatAno.anomalyScore}/100)`
        });
      }

      const poolLogs = checkLogs(logs, /connection|pool|lock|waiting for|superuser/i);
      if (poolLogs.length > 0) {
        score += 20;
        supporting.push({
          signal: 'database_logs',
          type: 'log_evidence',
          weight: 20,
          description: `Database engine logs report connection pool congestion/lock contention: "${poolLogs[0].message.substring(0, 90)}..."`
        });
      }

      if (errAno && errAno.anomalyScore >= 60) {
        score += 10;
        supporting.push({
          signal: errAno.metric,
          type: 'metric_anomaly',
          weight: 10,
          description: `Elevated service error rate (${errAno.current}%) caused by failed DB acquisitions`
        });
      }

      if (apiLatAno && !dbLatAno) {
        score += 10;
        supporting.push({
          signal: apiLatAno.metric,
          type: 'metric_anomaly',
          weight: 10,
          description: `Upstream request latency degraded (${apiLatAno.current}ms)`
        });
      }

      // Provider alert signal (minor evidence)
      if (/postgres|database|connection/i.test(telemetry.providerObservation?.alertName || '')) {
        score += 5;
        supporting.push({
          signal: 'provider_alert',
          type: 'provider_observation',
          weight: 5,
          description: `Provider alert observation refers to database subsystem`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Database connection pool utilization has reached saturation levels alongside elevated query latencies and connection wait states.`
      };
    }
  },

  // 2. DATABASE_DEGRADATION
  {
    type: INCIDENT_TYPES.DATABASE_DEGRADATION,
    displayName: DISPLAY_NAMES.DATABASE_DEGRADATION,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const logs = telemetry.logs || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const dbLatAno = findAnomaly(anomalies, /dblatency|querylatency/i);
      const cpuAno = findAnomaly(anomalies, /cpu/i);
      const storageDep = (telemetry.dependencies || []).find(d => /storage|ebs|nvme|disk/i.test(d.name) && d.status === 'degraded');

      if (dbLatAno) {
        const weight = dbLatAno.anomalyScore >= 80 ? 35 : 20;
        score += weight;
        supporting.push({
          signal: dbLatAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Database query latency degraded to ${dbLatAno.current}${dbLatAno.unit || 'ms'} (${dbLatAno.deviationRatio}x baseline)`
        });
      }

      if (storageDep) {
        score += 25;
        supporting.push({
          signal: storageDep.name,
          type: 'dependency_health',
          weight: 25,
          description: `Underlying storage dependency '${storageDep.name}' latency degraded (${storageDep.currentLatencyMs}ms vs baseline ${storageDep.baselineLatencyMs}ms)`
        });
      }

      if (cpuAno && /db|postgres|mysql|database/i.test(telemetry.service || '')) {
        score += 20;
        supporting.push({
          signal: cpuAno.metric,
          type: 'metric_anomaly',
          weight: 20,
          description: `Database instance CPU utilization elevated at ${cpuAno.current}%`
        });
      }

      const slowQueryLogs = checkLogs(logs, /slow query|lock contention|ExclusiveLock|checkpoint/i);
      if (slowQueryLogs.length > 0) {
        score += 15;
        supporting.push({
          signal: 'query_logs',
          type: 'log_evidence',
          weight: 15,
          description: `Query contention detected in logs: "${slowQueryLogs[0].message.substring(0, 90)}..."`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.DATABASE_DEGRADATION,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Database execution latency and storage response times have degraded, creating query execution delays.`
      };
    }
  },

  // 3. MEMORY_EXHAUSTION
  {
    type: INCIDENT_TYPES.MEMORY_EXHAUSTION,
    displayName: DISPLAY_NAMES.MEMORY_EXHAUSTION,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const logs = telemetry.logs || [];
      const events = telemetry.events || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const memAno = findAnomaly(anomalies, /memory|ram|mem/i);
      const restartAno = findAnomaly(anomalies, /restart|uptime/i);

      if (memAno) {
        const weight = memAno.anomalyScore >= 85 ? 40 : 25;
        score += weight;
        supporting.push({
          signal: memAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Memory utilization reached ${memAno.current}${memAno.unit || '%'} (${memAno.limit ? `${memAno.current}/${memAno.limit}MB limit reached` : `${memAno.deviationRatio}x baseline`})`
        });
      } else {
        const memMetric = telemetry.metrics?.memoryUtilization;
        if (memMetric && memMetric.current < 60) {
          score -= 35;
          contradicting.push({
            signal: 'memoryUtilization',
            type: 'metric_normal',
            weight: -35,
            description: `Memory utilization is normal (${memMetric.current}%)`
          });
        }
      }

      const oomEvents = checkEvents(events, /OOMKilled|MemoryLimit|OutOfMemory/i);
      const oomLogs = checkLogs(logs, /OutOfMemory|OOM|heap space|memory limit exceeded/i);
      if (oomEvents.length > 0 || oomLogs.length > 0) {
        score += 35;
        const desc = oomEvents[0]?.message || oomLogs[0]?.message || 'Process killed due to memory limit breach';
        supporting.push({
          signal: 'oom_event',
          type: 'event_log_evidence',
          weight: 35,
          description: `Operating system / runtime OOM signal detected: "${desc.substring(0, 90)}..."`
        });
      }

      if (restartAno) {
        score += 15;
        supporting.push({
          signal: restartAno.metric,
          type: 'metric_anomaly',
          weight: 15,
          description: `Process restarts triggered by container OOM termination (score: ${restartAno.anomalyScore}/100)`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.MEMORY_EXHAUSTION,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Process memory consumption has exceeded container/heap allocation limits, causing OOM terminations.`
      };
    }
  },

  // 4. CONTAINER_FAILURE
  {
    type: INCIDENT_TYPES.CONTAINER_FAILURE,
    displayName: DISPLAY_NAMES.CONTAINER_FAILURE,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const events = telemetry.events || [];
      const logs = telemetry.logs || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const restartAno = findAnomaly(anomalies, /restart/i);
      const uptimeAno = findAnomaly(anomalies, /uptime/i);
      const errAno = findAnomaly(anomalies, /error/i);

      if (restartAno) {
        const weight = restartAno.anomalyScore >= 80 ? 35 : 20;
        score += weight;
        supporting.push({
          signal: restartAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Container restart count reached ${restartAno.current} (baseline: ${restartAno.baseline}, score: ${restartAno.anomalyScore}/100)`
        });
      } else {
        const restartMetric = telemetry.metrics?.restartCount;
        if (restartMetric && restartMetric.current === 0) {
          score -= 40;
          contradicting.push({
            signal: 'restartCount',
            type: 'metric_normal',
            weight: -40,
            description: `Zero container restarts observed`
          });
        }
      }

      if (uptimeAno) {
        score += 25;
        supporting.push({
          signal: uptimeAno.metric,
          type: 'metric_anomaly',
          weight: 25,
          description: `Container uptime is unstable (${uptimeAno.current}s vs baseline ${uptimeAno.baseline}s)`
        });
      }

      const crashEvents = checkEvents(events, /CrashLoopBackOff|BackOff|Unhealthy|Readiness probe failed|Liveness/i);
      if (crashEvents.length > 0) {
        score += 25;
        supporting.push({
          signal: 'k8s_events',
          type: 'event_evidence',
          weight: 25,
          description: `Container lifecycle probe failure detected: "${crashEvents[0].message.substring(0, 90)}..."`
        });
      }

      if (errAno && errAno.anomalyScore >= 70) {
        score += 15;
        supporting.push({
          signal: errAno.metric,
          type: 'metric_anomaly',
          weight: 15,
          description: `Service request error rate surged to ${errAno.current}% due to unavailable worker pods`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.CONTAINER_FAILURE,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Service containers are repeatedly failing startup or liveness health probes, resulting in a crash looping lifecycle.`
      };
    }
  },

  // 5. TRAFFIC_OVERLOAD
  {
    type: INCIDENT_TYPES.TRAFFIC_OVERLOAD,
    displayName: DISPLAY_NAMES.TRAFFIC_OVERLOAD,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const events = telemetry.events || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const reqAno = findAnomaly(anomalies, /requestrate|throughput|rps|qps/i);
      const queueAno = findAnomaly(anomalies, /queue|backlog|messages/i);
      const cpuAno = findAnomaly(anomalies, /cpu/i);
      const latAno = findAnomaly(anomalies, /latency/i);

      if (reqAno && reqAno.deviationRatio >= 2.0) {
        const weight = reqAno.deviationRatio >= 4.0 ? 40 : 25;
        score += weight;
        supporting.push({
          signal: reqAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Request rate surged to ${reqAno.current}${reqAno.unit || 'req/s'} (${reqAno.deviationRatio}x above baseline ${reqAno.baseline})`
        });
      } else {
        const reqMetric = telemetry.metrics?.requestRate;
        if (reqMetric && reqMetric.current <= reqMetric.baseline * 1.2) {
          score -= 35;
          contradicting.push({
            signal: 'requestRate',
            type: 'metric_normal',
            weight: -35,
            description: `Request throughput (${reqMetric.current}) is within normal baseline volume (${reqMetric.baseline})`
          });
        }
      }

      if (queueAno) {
        score += 25;
        supporting.push({
          signal: queueAno.metric,
          type: 'metric_anomaly',
          weight: 25,
          description: `Ingestion queue depth backlog increased to ${queueAno.current} messages (${queueAno.deviationRatio}x baseline)`
        });
      }

      if (cpuAno && cpuAno.anomalyScore >= 60) {
        score += 20;
        supporting.push({
          signal: cpuAno.metric,
          type: 'metric_anomaly',
          weight: 20,
          description: `High CPU utilization (${cpuAno.current}%) driven by incoming request volume`
        });
      }

      if (latAno) {
        score += 10;
        supporting.push({
          signal: latAno.metric,
          type: 'metric_anomaly',
          weight: 10,
          description: `Response latency increased (${latAno.current}ms) due to server queueing`
        });
      }

      const asgEvents = checkEvents(events, /ScaleOut|TargetTracking|AutoScaling/i);
      if (asgEvents.length > 0) {
        score += 10;
        supporting.push({
          signal: 'scaling_events',
          type: 'event_evidence',
          weight: 10,
          description: `Auto-scaling scaling triggers activated: "${asgEvents[0].message.substring(0, 90)}..."`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.TRAFFIC_OVERLOAD,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Sudden massive incoming traffic surge is overwhelming provisioned throughput capacity and generating queue backpressure.`
      };
    }
  },

  // 6. DEPLOYMENT_REGRESSION
  {
    type: INCIDENT_TYPES.DEPLOYMENT_REGRESSION,
    displayName: DISPLAY_NAMES.DEPLOYMENT_REGRESSION,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const recentDep = getRecentDeployment(telemetry.deployments, telemetry.timestamp || new Date(), 90);
      const errAno = findAnomaly(anomalies, /error/i);
      const latAno = findAnomaly(anomalies, /latency/i);

      if (recentDep) {
        score += 35;
        supporting.push({
          signal: 'recent_deployment',
          type: 'deployment_evidence',
          weight: 35,
          description: `Recent deployment '${recentDep.version}' rolled out at ${recentDep.deployedAt} (${recentDep.status || 'completed'})`
        });
      } else {
        score -= 40;
        contradicting.push({
          signal: 'deployment_history',
          type: 'no_recent_deployment',
          weight: -40,
          description: `No recent code deployments detected in service release window`
        });
      }

      if (errAno && errAno.anomalyScore >= 65) {
        const trend = errAno.trendAnalysis;
        const weight = (trend && trend.direction === 'increasing') ? 35 : 25;
        score += weight;
        supporting.push({
          signal: errAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Sharp error rate degradation (${errAno.current}%) initiated subsequent to release deployment`
        });
      }

      if (latAno && latAno.anomalyScore >= 60) {
        score += 20;
        supporting.push({
          signal: latAno.metric,
          type: 'metric_anomaly',
          weight: 20,
          description: `Latency degradation (${latAno.current}ms) observed across newly deployed application instances`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.DEPLOYMENT_REGRESSION,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Service degradation commenced immediately following recent deployment rollout '${recentDep?.version || 'latest'}'.`
      };
    }
  },

  // 7. SERVICE_DEPENDENCY_FAILURE
  {
    type: INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE,
    displayName: DISPLAY_NAMES.SERVICE_DEPENDENCY_FAILURE,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const logs = telemetry.logs || [];
      const dependencies = telemetry.dependencies || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const degradedDep = dependencies.find(d => d.status === 'degraded' || d.status === 'unhealthy');
      const downLatAno = findAnomaly(anomalies, /downstream/i);
      const apiLatAno = findAnomaly(anomalies, /^latency|responsetime/i);
      const errAno = findAnomaly(anomalies, /error/i);

      if (degradedDep) {
        score += 40;
        supporting.push({
          signal: degradedDep.name,
          type: 'dependency_health',
          weight: 40,
          description: `Downstream dependency '${degradedDep.name}' (${degradedDep.type}) is in ${degradedDep.status} state (latency: ${degradedDep.currentLatencyMs || 'high'}ms, baseline: ${degradedDep.baselineLatencyMs || 'normal'}ms)`
        });
      } else if (dependencies.length > 0 && dependencies.every(d => d.status === 'healthy')) {
        score -= 35;
        contradicting.push({
          signal: 'dependencies',
          type: 'dependency_healthy',
          weight: -35,
          description: `All monitored downstream dependencies report healthy status`
        });
      }

      if (downLatAno) {
        score += 25;
        supporting.push({
          signal: downLatAno.metric,
          type: 'metric_anomaly',
          weight: 25,
          description: `Downstream dependency latency spiked to ${downLatAno.current}${downLatAno.unit || 'ms'} (${downLatAno.deviationRatio}x baseline)`
        });
      }

      const timeoutLogs = checkLogs(logs, /timeout|socket hangup|504 Gateway|connection refused|circuit breaker/i);
      if (timeoutLogs.length > 0) {
        score += 25;
        supporting.push({
          signal: 'dependency_logs',
          type: 'log_evidence',
          weight: 25,
          description: `Upstream service reports connection timeouts to downstream service: "${timeoutLogs[0].message.substring(0, 90)}..."`
        });
      }

      if (apiLatAno && (downLatAno || degradedDep)) {
        score += 10;
        supporting.push({
          signal: apiLatAno.metric,
          type: 'metric_anomaly',
          weight: 10,
          description: `Primary service latency (${apiLatAno.current}ms) bloated by downstream wait time`
        });
      }

      if (errAno && errAno.anomalyScore >= 60) {
        score += 10;
        supporting.push({
          signal: errAno.metric,
          type: 'metric_anomaly',
          weight: 10,
          description: `Cascading error rate (${errAno.current}%) caused by downstream gateway timeouts`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `Service degradation is caused by cascading latency timeouts and failures in downstream dependency '${degradedDep?.name || 'third-party endpoint'}'.`
      };
    }
  },

  // 8. CPU_SATURATION
  {
    type: INCIDENT_TYPES.CPU_SATURATION,
    displayName: DISPLAY_NAMES.CPU_SATURATION,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const supporting = [];
      const contradicting = [];
      let score = 0;

      const cpuAno = findAnomaly(anomalies, /cpu/i);
      const latAno = findAnomaly(anomalies, /latency/i);

      if (cpuAno) {
        const weight = cpuAno.current >= 90 ? 45 : cpuAno.current >= 80 ? 30 : 15;
        score += weight;
        supporting.push({
          signal: cpuAno.metric,
          type: 'metric_anomaly',
          weight,
          description: `Host CPU utilization sustained at ${cpuAno.current}% (baseline: ${cpuAno.baseline}%, delta: +${cpuAno.absoluteDelta}%)`
        });

        if (cpuAno.trendAnalysis?.direction === 'increasing' && cpuAno.trendAnalysis?.isSustained) {
          score += 20;
          supporting.push({
            signal: 'cpu_trend',
            type: 'trend_evidence',
            weight: 20,
            description: `CPU utilization displays monotonic sustained upward trajectory`
          });
        }
      } else {
        const cpuMetric = telemetry.metrics?.cpuUtilization;
        if (cpuMetric && cpuMetric.current < 65) {
          score -= 40;
          contradicting.push({
            signal: 'cpuUtilization',
            type: 'metric_normal',
            weight: -40,
            description: `CPU utilization (${cpuMetric.current}%) is operating within healthy capacity`
          });
        }
      }

      if (latAno) {
        score += 15;
        supporting.push({
          signal: latAno.metric,
          type: 'metric_anomaly',
          weight: 15,
          description: `Thread starvation causing request latency degradation (${latAno.current}ms)`
        });
      }

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.CPU_SATURATION,
        confidence,
        severity: confidence >= 80 ? 'CRITICAL' : 'HIGH',
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        explanation: `System CPU capacity is saturated, causing instruction backlog and thread starvation.`
      };
    }
  },

  // 9. HIGH_LATENCY (Fallback specific)
  {
    type: INCIDENT_TYPES.HIGH_LATENCY,
    displayName: DISPLAY_NAMES.HIGH_LATENCY,
    minScoreThreshold: 40,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const latAno = findAnomaly(anomalies, /^latency|responsetime/i);
      if (!latAno || latAno.anomalyScore < 60) return { type: INCIDENT_TYPES.HIGH_LATENCY, confidence: 0, supportingEvidence: [], contradictingEvidence: [] };

      return {
        type: INCIDENT_TYPES.HIGH_LATENCY,
        confidence: Math.min(75, latAno.anomalyScore - 10),
        severity: 'HIGH',
        supportingEvidence: [{
          signal: latAno.metric,
          type: 'metric_anomaly',
          weight: 40,
          description: `High response latency observed (${latAno.current}ms vs baseline ${latAno.baseline}ms)`
        }],
        contradictingEvidence: [],
        explanation: `Elevated service latency observed across endpoints.`
      };
    }
  },

  // 10. HIGH_ERROR_RATE (Fallback specific)
  {
    type: INCIDENT_TYPES.HIGH_ERROR_RATE,
    displayName: DISPLAY_NAMES.HIGH_ERROR_RATE,
    minScoreThreshold: 40,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const errAno = findAnomaly(anomalies, /error/i);
      if (!errAno || errAno.anomalyScore < 60) return { type: INCIDENT_TYPES.HIGH_ERROR_RATE, confidence: 0, supportingEvidence: [], contradictingEvidence: [] };

      return {
        type: INCIDENT_TYPES.HIGH_ERROR_RATE,
        confidence: Math.min(75, errAno.anomalyScore - 10),
        severity: 'HIGH',
        supportingEvidence: [{
          signal: errAno.metric,
          type: 'metric_anomaly',
          weight: 40,
          description: `Error rate spike observed (${errAno.current}% vs baseline ${errAno.baseline}%)`
        }],
        contradictingEvidence: [],
        explanation: `Elevated request failure rate observed on service endpoints.`
      };
    }
  },

  // 11. RESOURCE_SATURATION (Combined Multi-Resource)
  {
    type: INCIDENT_TYPES.RESOURCE_SATURATION,
    displayName: DISPLAY_NAMES.RESOURCE_SATURATION,
    minScoreThreshold: 45,
    evaluate: (telemetry, anomalyReport) => {
      const anomalies = anomalyReport.anomalies || [];
      const cpuAno = findAnomaly(anomalies, /cpu/i);
      const memAno = findAnomaly(anomalies, /memory|mem/i);
      const supporting = [];

      let score = 0;
      if (cpuAno && cpuAno.anomalyScore >= 60) {
        score += 30;
        supporting.push({
          signal: cpuAno.metric,
          type: 'metric_anomaly',
          weight: 30,
          description: `CPU utilization elevated at ${cpuAno.current}%`
        });
      }
      if (memAno && memAno.anomalyScore >= 60) {
        score += 30;
        supporting.push({
          signal: memAno.metric,
          type: 'metric_anomaly',
          weight: 30,
          description: `Memory allocation elevated at ${memAno.current}${memAno.unit || '%'}`
        });
      }

      if (score >= 60) score += 15;

      const confidence = Math.min(100, Math.max(0, score));
      return {
        type: INCIDENT_TYPES.RESOURCE_SATURATION,
        confidence,
        severity: confidence >= 75 ? 'HIGH' : 'MEDIUM',
        supportingEvidence: supporting,
        contradictingEvidence: [],
        explanation: `Multiple compute and memory resources are simultaneously saturated across the node/cluster.`
      };
    }
  }
];

/**
 * Main entry point to identify incident hypotheses from normalized telemetry & anomaly sets
 * @param {Object} normalizedTelemetry - Normalized telemetry from Phase 1
 * @param {Object} anomalyReport - Anomaly report from Phase 2
 * @returns {Object} Comprehensive Incident Identification Report
 */
const identifyIncident = (normalizedTelemetry = {}, anomalyReport = {}) => {
  const service = normalizedTelemetry.service || anomalyReport.service || 'unknown-service';
  const resource = normalizedTelemetry.resource || anomalyReport.resource || 'unknown-resource';
  const source = normalizedTelemetry.source || anomalyReport.source || 'unknown';
  const timestamp = normalizedTelemetry.timestamp || new Date().toISOString();

  // If no anomalies exist, return healthy status
  if (!anomalyReport.hasAnomalies || !anomalyReport.anomalies || anomalyReport.anomalies.length === 0) {
    return {
      service,
      resource,
      source,
      timestamp,
      primaryHypothesis: {
        incidentType: 'HEALTHY_NORMAL',
        displayName: 'Nominal System Operation',
        confidence: 95,
        severity: 'NORMAL',
        affectedService: service,
        affectedResource: resource,
        explanation: 'All monitored telemetry metrics and health probes are operating within standard baseline tolerances.',
        supportingEvidence: [],
        contradictingEvidence: [],
        detectionMethod: 'baseline_telemetry_evaluation'
      },
      hypotheses: [],
      evaluatedSignaturesCount: INCIDENT_SIGNATURES.length,
      detectionStatus: 'NORMAL'
    };
  }

  // Evaluate all incident signatures
  const evaluatedHypotheses = [];

  for (const signature of INCIDENT_SIGNATURES) {
    try {
      const evaluation = signature.evaluate(normalizedTelemetry, anomalyReport);
      if (evaluation && evaluation.confidence >= signature.minScoreThreshold) {
        evaluatedHypotheses.push({
          incidentType: evaluation.type,
          displayName: signature.displayName || DISPLAY_NAMES[evaluation.type] || evaluation.type,
          confidence: evaluation.confidence,
          severity: evaluation.severity || (evaluation.confidence >= 80 ? 'CRITICAL' : 'HIGH'),
          affectedService: service,
          affectedResource: resource,
          explanation: evaluation.explanation,
          supportingEvidence: evaluation.supportingEvidence || [],
          contradictingEvidence: evaluation.contradictingEvidence || [],
          detectionMethod: 'multi_signal_correlation'
        });
      }
    } catch (err) {
      console.error(`Error evaluating incident signature ${signature.type}:`, err);
    }
  }

  // Sort hypotheses descending by confidence
  evaluatedHypotheses.sort((a, b) => b.confidence - a.confidence);

  // If no signature met threshold, formulate an UNKNOWN_ANOMALY hypothesis
  let primaryHypothesis;
  if (evaluatedHypotheses.length === 0) {
    const topAnomaly = anomalyReport.anomalies[0];
    primaryHypothesis = {
      incidentType: INCIDENT_TYPES.UNKNOWN_ANOMALY,
      displayName: DISPLAY_NAMES.UNKNOWN_ANOMALY,
      confidence: Math.min(45, anomalyReport.overallAnomalyScore || 35),
      severity: anomalyReport.highestSeverity || 'MEDIUM',
      affectedService: service,
      affectedResource: resource,
      explanation: `Multiple anomalous telemetry signals were observed (${anomalyReport.anomalies.map(a => a.metricDisplayName || a.metric).join(', ')}), but available evidence is insufficient to decisively match a specific incident signature.`,
      supportingEvidence: anomalyReport.anomalies.slice(0, 3).map(a => ({
        signal: a.metric,
        type: 'metric_anomaly',
        weight: Math.round(a.anomalyScore * 0.3),
        description: a.reason
      })),
      contradictingEvidence: [],
      detectionMethod: 'unclassified_anomaly_aggregation'
    };
  } else {
    primaryHypothesis = evaluatedHypotheses[0];
  }

  return {
    service,
    resource,
    source,
    timestamp,
    primaryHypothesis,
    hypotheses: evaluatedHypotheses.slice(0, 3), // Top 3 hypotheses
    evaluatedSignaturesCount: INCIDENT_SIGNATURES.length,
    detectionStatus: primaryHypothesis.incidentType === INCIDENT_TYPES.UNKNOWN_ANOMALY ? 'AMBIGUOUS' : 'IDENTIFIED'
  };
};

module.exports = {
  identifyIncident,
  INCIDENT_TYPES,
  DISPLAY_NAMES,
  INCIDENT_SIGNATURES
};
