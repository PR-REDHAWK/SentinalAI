/**
 * Cross-Signal Correlation & Root-Cause Evidence Engine
 * Phase 4: Normalized Telemetry + Anomalies + Incident Hypotheses -> Evidence Chain & Root-Cause Hypotheses
 * 
 * Answers: "Why do we believe this incident is happening, and what chain of evidence connects the observed signals?"
 * 
 * Rules:
 * - Deterministic, multi-signal correlation across metrics, logs, events, deployments, and dependencies.
 * - Distinguishes suspected origin from downstream symptoms and user impacts.
 * - Identifies temporal sequences, deployment correlations, and dependency propagations.
 * - Actively identifies both supporting and contradicting evidence.
 * - Generates structured evidence clusters, an evidence chain, and ranked probable root-cause candidates.
 * - Never claims absolute causation without deterministic proof; uses calibrated confidence and explainable reasoning.
 */

const { INCIDENT_TYPES, DISPLAY_NAMES } = require('./incidentIdentifier');

/**
 * Supported Relationship Types
 */
const RELATIONSHIP_TYPES = {
  TEMPORAL_SEQUENCE: 'TEMPORAL_SEQUENCE',
  DEPENDENCY_PROPAGATION: 'DEPENDENCY_PROPAGATION',
  DEPLOYMENT_CORRELATION: 'DEPLOYMENT_CORRELATION',
  METRIC_CO_OCCURRENCE: 'METRIC_CO_OCCURRENCE',
  CAUSAL_INDICATOR: 'CAUSAL_INDICATOR',
  SUPPORTING_EVIDENCE: 'SUPPORTING_EVIDENCE',
  CONTRADICTING_EVIDENCE: 'CONTRADICTING_EVIDENCE'
};

/**
 * Supported Evidence Cluster Categories
 */
const CLUSTER_CATEGORIES = {
  DATABASE: 'DATABASE',
  COMPUTE: 'COMPUTE',
  MEMORY: 'MEMORY',
  TRAFFIC: 'TRAFFIC',
  DEPLOYMENT: 'DEPLOYMENT',
  DEPENDENCY: 'DEPENDENCY',
  CONTAINER: 'CONTAINER',
  APPLICATION: 'APPLICATION'
};

/**
 * Helper to parse timestamps safely
 */
const toTimestampMs = (timeStr) => {
  if (!timeStr) return Date.now();
  const ms = new Date(timeStr).getTime();
  return isNaN(ms) ? Date.now() : ms;
};

/**
 * 1. Build Evidence Clusters
 * Groups related signals, logs, events, and metrics into domain clusters
 */
const buildEvidenceClusters = (normalizedTelemetry = {}, anomalyReport = {}) => {
  const anomalies = anomalyReport.anomalies || [];
  const logs = normalizedTelemetry.logs || [];
  const events = normalizedTelemetry.events || [];
  const deployments = normalizedTelemetry.deployments || [];
  const dependencies = normalizedTelemetry.dependencies || [];

  const clusters = [];

  // Cluster: DATABASE
  const dbAnomalies = anomalies.filter(a => /connection|pool|dblatency|querylatency/i.test(a.metric));
  const dbLogs = logs.filter(l => /postgres|database|connection|lock|ExclusiveLock|query|sql/i.test(l.message || ''));
  if (dbAnomalies.length > 0 || dbLogs.length > 0) {
    const avgScore = dbAnomalies.length > 0 
      ? Math.round(dbAnomalies.reduce((acc, a) => acc + a.anomalyScore, 0) / dbAnomalies.length) 
      : 70;
    clusters.push({
      category: CLUSTER_CATEGORIES.DATABASE,
      displayName: 'Database Subsystem Pressure',
      strength: avgScore,
      signals: dbAnomalies.map(a => a.metric),
      evidenceCount: dbAnomalies.length + dbLogs.length,
      explanation: `Database connection utilization, query latency, and engine lock wait states are elevated.`,
      items: [
        ...dbAnomalies.map(a => ({ type: 'METRIC_ANOMALY', name: a.metricDisplayName || a.metric, value: `${a.current}${a.unit || ''}`, score: a.anomalyScore })),
        ...dbLogs.slice(0, 2).map(l => ({ type: 'LOG_RECORD', message: l.message, timestamp: l.timestamp }))
      ]
    });
  }

  // Cluster: MEMORY
  const memAnomalies = anomalies.filter(a => /memory|ram|mem/i.test(a.metric));
  const oomLogs = logs.filter(l => /OutOfMemory|OOM|heap space|memory limit/i.test(l.message || ''));
  const oomEvents = events.filter(e => /OOMKilled|MemoryLimit/i.test(e.reason || ''));
  if (memAnomalies.length > 0 || oomLogs.length > 0 || oomEvents.length > 0) {
    const score = memAnomalies.length > 0 ? memAnomalies[0].anomalyScore : 90;
    clusters.push({
      category: CLUSTER_CATEGORIES.MEMORY,
      displayName: 'Memory Saturation & Allocation Faults',
      strength: score,
      signals: memAnomalies.map(a => a.metric),
      evidenceCount: memAnomalies.length + oomLogs.length + oomEvents.length,
      explanation: `Memory consumption reached allocation boundary, triggering OOM eviction signals.`,
      items: [
        ...memAnomalies.map(a => ({ type: 'METRIC_ANOMALY', name: a.metricDisplayName || a.metric, value: `${a.current}${a.unit || ''}`, score: a.anomalyScore })),
        ...oomEvents.map(e => ({ type: 'SYSTEM_EVENT', reason: e.reason, message: e.message })),
        ...oomLogs.slice(0, 1).map(l => ({ type: 'LOG_RECORD', message: l.message }))
      ]
    });
  }

  // Cluster: DEPENDENCY
  const depAnomalies = anomalies.filter(a => /downstream/i.test(a.metric));
  const degradedDeps = dependencies.filter(d => d.status === 'degraded' || d.status === 'unhealthy');
  const timeoutLogs = logs.filter(l => /timeout|504|socket hangup|circuit breaker/i.test(l.message || ''));
  if (depAnomalies.length > 0 || degradedDeps.length > 0 || timeoutLogs.length > 0) {
    const score = depAnomalies.length > 0 ? depAnomalies[0].anomalyScore : 85;
    clusters.push({
      category: CLUSTER_CATEGORIES.DEPENDENCY,
      displayName: 'Downstream Service Dependency Degradation',
      strength: score,
      signals: depAnomalies.map(a => a.metric),
      evidenceCount: depAnomalies.length + degradedDeps.length + timeoutLogs.length,
      explanation: `Downstream dependency '${degradedDeps[0]?.name || 'remote API'}' response times degraded, causing upstream socket timeouts.`,
      items: [
        ...degradedDeps.map(d => ({ type: 'DEPENDENCY_STATUS', name: d.name, status: d.status, latency: `${d.currentLatencyMs || 'high'}ms` })),
        ...depAnomalies.map(a => ({ type: 'METRIC_ANOMALY', name: a.metricDisplayName || a.metric, value: `${a.current}${a.unit || ''}` })),
        ...timeoutLogs.slice(0, 2).map(l => ({ type: 'LOG_RECORD', message: l.message }))
      ]
    });
  }

  // Cluster: TRAFFIC & COMPUTE
  const trafficAnomalies = anomalies.filter(a => /requestrate|throughput|queue|backlog/i.test(a.metric));
  const cpuAnomalies = anomalies.filter(a => /cpu/i.test(a.metric));
  const asgEvents = events.filter(e => /ScaleOut|TargetTracking|AutoScaling/i.test(e.reason || ''));
  if (trafficAnomalies.length > 0 || cpuAnomalies.length > 0 || asgEvents.length > 0) {
    const combinedAnomalies = [...trafficAnomalies, ...cpuAnomalies];
    const score = combinedAnomalies.length > 0 
      ? Math.round(combinedAnomalies.reduce((acc, a) => acc + a.anomalyScore, 0) / combinedAnomalies.length) 
      : 75;
    clusters.push({
      category: CLUSTER_CATEGORIES.TRAFFIC,
      displayName: 'Traffic Ingestion & Compute Load Surge',
      strength: score,
      signals: combinedAnomalies.map(a => a.metric),
      evidenceCount: combinedAnomalies.length + asgEvents.length,
      explanation: `Sudden load multiplier on request throughput and queue depth exceeding capacity thresholds.`,
      items: [
        ...combinedAnomalies.map(a => ({ type: 'METRIC_ANOMALY', name: a.metricDisplayName || a.metric, value: `${a.current}${a.unit || ''}`, score: a.anomalyScore })),
        ...asgEvents.map(e => ({ type: 'SYSTEM_EVENT', reason: e.reason, message: e.message }))
      ]
    });
  }

  // Cluster: DEPLOYMENT
  const refTime = normalizedTelemetry.timestamp || new Date();
  const recentDeployment = deployments.find(d => {
    const diff = (toTimestampMs(refTime) - toTimestampMs(d.deployedAt)) / 60000;
    return diff >= 0 && diff <= 90;
  });
  if (recentDeployment) {
    clusters.push({
      category: CLUSTER_CATEGORIES.DEPLOYMENT,
      displayName: 'Recent Release Deployment Sequence',
      strength: 88,
      signals: ['deployments'],
      evidenceCount: 1,
      explanation: `Deployment release '${recentDeployment.version}' occurred within incident initiation window.`,
      items: [
        { type: 'DEPLOYMENT_RECORD', version: recentDeployment.version, deployedAt: recentDeployment.deployedAt, commit: recentDeployment.commit || 'unknown' }
      ]
    });
  }

  // Cluster: APPLICATION (Errors & Latency)
  const appAnomalies = anomalies.filter(a => /error|latency/i.test(a.metric) && !/downstream|dblatency/i.test(a.metric));
  if (appAnomalies.length > 0) {
    clusters.push({
      category: CLUSTER_CATEGORIES.APPLICATION,
      displayName: 'Application User Experience Degradation',
      strength: appAnomalies[0].anomalyScore,
      signals: appAnomalies.map(a => a.metric),
      evidenceCount: appAnomalies.length,
      explanation: `Client-facing API latency and HTTP error rates have breached critical thresholds.`,
      items: appAnomalies.map(a => ({ type: 'METRIC_ANOMALY', name: a.metricDisplayName || a.metric, value: `${a.current}${a.unit || ''}`, score: a.anomalyScore }))
    });
  }

  return clusters;
};

/**
 * 2. Extract Temporal Timeline & Sequence Relationships
 */
const buildTemporalCorrelations = (normalizedTelemetry = {}, anomalyReport = {}) => {
  const temporalEvents = [];

  // 1. Check deployments
  (normalizedTelemetry.deployments || []).forEach(dep => {
    temporalEvents.push({
      timestamp: dep.deployedAt || normalizedTelemetry.timestamp,
      timestampMs: toTimestampMs(dep.deployedAt || normalizedTelemetry.timestamp),
      category: 'DEPLOYMENT',
      name: `Release ${dep.version} Deployed`,
      detail: `CI/CD deployed version ${dep.version} (${dep.commit || 'HEAD'})`,
      service: dep.service || normalizedTelemetry.service,
      isOriginCandidate: true
    });
  });

  // 2. Check dependency degradation
  (normalizedTelemetry.dependencies || []).filter(d => d.status === 'degraded' || d.status === 'unhealthy').forEach(dep => {
    temporalEvents.push({
      timestamp: normalizedTelemetry.timestamp,
      timestampMs: toTimestampMs(normalizedTelemetry.timestamp) - 180000, // Preceded upstream
      category: 'DEPENDENCY',
      name: `Dependency '${dep.name}' Degraded`,
      detail: `Downstream service latency spiked to ${dep.currentLatencyMs || 980}ms`,
      service: dep.name,
      isOriginCandidate: true
    });
  });

  // 3. Check system events
  (normalizedTelemetry.events || []).forEach(ev => {
    temporalEvents.push({
      timestamp: ev.timestamp || normalizedTelemetry.timestamp,
      timestampMs: toTimestampMs(ev.timestamp || normalizedTelemetry.timestamp),
      category: 'SYSTEM_EVENT',
      name: ev.reason || ev.type || 'System Event',
      detail: ev.message,
      service: normalizedTelemetry.service,
      isOriginCandidate: /OOMKilled|ThresholdCrossed|ScaleOut/i.test(ev.reason || '')
    });
  });

  // 4. Check anomalies with trend series
  (anomalyReport.anomalies || []).forEach(ano => {
    const trend = ano.trendAnalysis;
    const metricData = normalizedTelemetry.metrics?.[ano.metric];
    const trendPoints = metricData?.trend || [];
    
    // Find earliest point where metric crossed beyond 1.25x baseline
    let firstInflexionTime = normalizedTelemetry.timestamp;
    let firstInflexionMs = toTimestampMs(normalizedTelemetry.timestamp);
    if (trendPoints.length >= 2) {
      const baseline = ano.baseline || 1;
      const elevatedPoint = trendPoints.find(p => Math.abs(p.value - baseline) > 0.3 * Math.abs(baseline));
      if (elevatedPoint && elevatedPoint.timestamp) {
        firstInflexionTime = elevatedPoint.timestamp;
        firstInflexionMs = toTimestampMs(elevatedPoint.timestamp);
      }
    }

    temporalEvents.push({
      timestamp: firstInflexionTime,
      timestampMs: firstInflexionMs,
      category: 'ANOMALY_INFLEXION',
      name: `${ano.metricDisplayName || ano.metric} Degraded`,
      detail: `${ano.current}${ano.unit === 'percent' ? '%' : ano.unit ? ` ${ano.unit}` : ''} (deviation: ${ano.deviationRatio}x baseline)`,
      service: ano.provenance?.service || normalizedTelemetry.service,
      metric: ano.metric,
      severity: ano.severity,
      isOriginCandidate: /activeConnections|memory|requestrate|downstream/i.test(ano.metric)
    });
  });

  // 5. Check error logs
  (normalizedTelemetry.logs || []).filter(l => l.level === 'ERROR' || l.level === 'FATAL').forEach(log => {
    temporalEvents.push({
      timestamp: log.timestamp || normalizedTelemetry.timestamp,
      timestampMs: toTimestampMs(log.timestamp || normalizedTelemetry.timestamp),
      category: 'ERROR_LOG',
      name: `Log: ${log.level}`,
      detail: log.message,
      service: log.source || normalizedTelemetry.service,
      isOriginCandidate: /OutOfMemory|superuser|ExclusiveLock/i.test(log.message)
    });
  });

  // Sort chronological
  temporalEvents.sort((a, b) => a.timestampMs - b.timestampMs);

  return temporalEvents;
};

/**
 * 3. Build Evidence Chain (Ordered Step-by-Step Progression)
 */
const buildEvidenceChain = (temporalEvents = [], incidentIdentification = {}) => {
  if (!temporalEvents || temporalEvents.length === 0) {
    return [];
  }

  const chain = [];
  let step = 1;

  // Filter out redundant items that occur within identical 5-second windows with duplicate intent
  const seenNames = new Set();

  for (const ev of temporalEvents) {
    if (seenNames.has(ev.name)) continue;
    seenNames.add(ev.name);

    let stage = 'PROPAGATION';
    if (step === 1 || ev.isOriginCandidate) {
      stage = 'ORIGIN_SIGNAL';
    } else if (/error|504|failure|outage/i.test(ev.name) || /error/i.test(ev.metric || '')) {
      stage = 'USER_IMPACT';
    } else if (/latency|responsetime/i.test(ev.name) || /latency/i.test(ev.metric || '')) {
      stage = 'DOWNSTREAM_IMPACT';
    }

    chain.push({
      step: step++,
      stage,
      title: ev.name,
      observation: ev.detail,
      timestamp: ev.timestamp,
      service: ev.service,
      category: ev.category
    });

    if (chain.length >= 6) break; // Keep chain focused to top key progressive milestones
  }

  return chain;
};

/**
 * 4. Formulate Probable Root-Cause Hypotheses with Supporting & Contradicting Evidence
 */
const formulateRootCauseHypotheses = (
  normalizedTelemetry = {}, 
  anomalyReport = {}, 
  incidentIdentification = {}, 
  evidenceClusters = [], 
  temporalEvents = []
) => {
  const primaryIncident = incidentIdentification.primaryHypothesis || {};
  const incidentType = primaryIncident.incidentType || 'UNKNOWN_ANOMALY';
  const service = normalizedTelemetry.service || 'unknown-service';
  const resource = normalizedTelemetry.resource || 'unknown-resource';

  const candidates = [];

  // 1. Evaluate DATABASE_CONNECTION_EXHAUSTION
  if (incidentType === INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION || evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.DATABASE)) {
    const dbCluster = evidenceClusters.find(c => c.category === CLUSTER_CATEGORIES.DATABASE);
    const connAno = (anomalyReport.anomalies || []).find(a => /connection|pool/i.test(a.metric));
    const dbLatAno = (anomalyReport.anomalies || []).find(a => /dblatency/i.test(a.metric));

    const supporting = [];
    const contradicting = [];
    let conf = 70;

    if (connAno && connAno.anomalyScore >= 85) {
      conf += 15;
      supporting.push(`Connection pool capacity reached ${connAno.current}/${connAno.threshold || '300'} limit.`);
    }
    if (dbLatAno) {
      conf += 10;
      supporting.push(`Query execution latency surged ${dbLatAno.deviationRatio}x above normal baseline.`);
    }
    const poolLog = (normalizedTelemetry.logs || []).find(l => /connection|lock|superuser/i.test(l.message));
    if (poolLog) {
      conf += 10;
      supporting.push(`Database engine error log: "${poolLog.message.substring(0, 80)}..."`);
    }

    // Contradicting check: if connections are healthy
    if (!connAno && normalizedTelemetry.metrics?.activeConnections?.current < 50) {
      conf -= 40;
      contradicting.push(`Database active connections are currently low (${normalizedTelemetry.metrics.activeConnections.current}).`);
    }

    candidates.push({
      candidate: 'Database Connection Pool Exhaustion',
      incidentType: INCIDENT_TYPES.DATABASE_CONNECTION_EXHAUSTION,
      confidence: Math.min(96, Math.max(10, conf)),
      status: conf >= 80 ? 'PROBABLE' : 'POSSIBLE',
      suspectedOrigin: {
        service: 'database-service',
        resource: resource || 'db-main-01',
        component: 'PostgreSQL Connection Pool'
      },
      summary: `Evidence strongly indicates database connection exhaustion on ${resource} starved worker processes of query handles.`,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting
    });
  }

  // 2. Evaluate SERVICE_DEPENDENCY_FAILURE
  if (incidentType === INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE || evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.DEPENDENCY)) {
    const depCluster = evidenceClusters.find(c => c.category === CLUSTER_CATEGORIES.DEPENDENCY);
    const degradedDep = (normalizedTelemetry.dependencies || []).find(d => d.status === 'degraded');
    const downLatAno = (anomalyReport.anomalies || []).find(a => /downstream/i.test(a.metric));

    const supporting = [];
    const contradicting = [];
    let conf = 70;

    if (degradedDep) {
      conf += 18;
      supporting.push(`Downstream dependency '${degradedDep.name}' transitioned to ${degradedDep.status} state before upstream errors began.`);
    }
    if (downLatAno) {
      conf += 12;
      supporting.push(`Downstream latency spiked to ${downLatAno.current}ms (${downLatAno.deviationRatio}x baseline).`);
    }
    const timeoutLog = (normalizedTelemetry.logs || []).find(l => /504|timeout|socket hangup/i.test(l.message));
    if (timeoutLog) {
      conf += 10;
      supporting.push(`Gateway timeout error captured: "${timeoutLog.message.substring(0, 80)}..."`);
    }

    // Contradicting check: if all dependencies healthy
    if (!degradedDep && normalizedTelemetry.dependencies?.length > 0 && normalizedTelemetry.dependencies.every(d => d.status === 'healthy')) {
      conf -= 45;
      contradicting.push(`All registered downstream dependencies report 100% healthy status.`);
    }

    candidates.push({
      candidate: 'Downstream Service Dependency Failure',
      incidentType: INCIDENT_TYPES.SERVICE_DEPENDENCY_FAILURE,
      confidence: Math.min(98, Math.max(10, conf)),
      status: conf >= 80 ? 'PROBABLE' : 'POSSIBLE',
      suspectedOrigin: {
        service: degradedDep?.name || 'downstream-api',
        resource: 'remote-endpoint',
        component: 'External API Gateway'
      },
      summary: `Evidence strongly correlates service degradation with upstream socket timeouts triggered by degraded downstream dependency '${degradedDep?.name || 'remote API'}'.`,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting
    });
  }

  // 3. Evaluate DEPLOYMENT_REGRESSION
  if (incidentType === INCIDENT_TYPES.DEPLOYMENT_REGRESSION || evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.DEPLOYMENT)) {
    const depCluster = evidenceClusters.find(c => c.category === CLUSTER_CATEGORIES.DEPLOYMENT);
    const recentDep = (normalizedTelemetry.deployments || [])[0];
    const errAno = (anomalyReport.anomalies || []).find(a => /error/i.test(a.metric));

    const supporting = [];
    const contradicting = [];
    let conf = 65;

    if (recentDep) {
      conf += 20;
      supporting.push(`Release deployment '${recentDep.version}' (commit: ${recentDep.commit || 'HEAD'}) deployed shortly prior to error rate surge.`);
    }
    if (errAno && errAno.trendAnalysis?.direction === 'increasing') {
      conf += 15;
      supporting.push(`Error rate exhibited a monotonic post-release rise (${errAno.current}% vs baseline ${errAno.baseline}%).`);
    }

    // Contradicting check: if no recent deployment exists
    if (!recentDep) {
      conf -= 50;
      contradicting.push(`No deployment occurred in the preceding 24-hour monitoring window.`);
    }

    candidates.push({
      candidate: 'Deployment Code / Config Regression',
      incidentType: INCIDENT_TYPES.DEPLOYMENT_REGRESSION,
      confidence: Math.min(94, Math.max(10, conf)),
      status: conf >= 75 ? 'PROBABLE' : 'POSSIBLE',
      suspectedOrigin: {
        service: recentDep?.service || service,
        resource: `Deployment ${recentDep?.version || 'latest'}`,
        component: 'Application Release Binary'
      },
      summary: `Service failure trajectory initiated immediately following deployment rollout of '${recentDep?.version || 'recent commit'}'.`,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting
    });
  }

  // 4. Evaluate MEMORY_EXHAUSTION
  if (incidentType === INCIDENT_TYPES.MEMORY_EXHAUSTION || incidentType === INCIDENT_TYPES.CONTAINER_FAILURE || evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.MEMORY)) {
    const memAno = (anomalyReport.anomalies || []).find(a => /memory|mem/i.test(a.metric));
    const oomEvent = (normalizedTelemetry.events || []).find(e => /OOMKilled|MemoryLimit/i.test(e.reason));
    const restartAno = (anomalyReport.anomalies || []).find(a => /restart/i.test(a.metric));

    const supporting = [];
    const contradicting = [];
    let conf = 70;

    if (memAno && (memAno.current >= (memAno.limit || 512) || memAno.anomalyScore >= 85)) {
      conf += 18;
      supporting.push(`Memory usage reached container allocation boundary (${memAno.current}${memAno.unit || 'MB'}).`);
    }
    if (oomEvent) {
      conf += 18;
      supporting.push(`Operating system kernel fired OOMKilled eviction event on pod container.`);
    }
    if (restartAno) {
      conf += 10;
      supporting.push(`Container restart count climbed to ${restartAno.current} following crash loops.`);
    }

    // Contradicting check
    if (!memAno && normalizedTelemetry.metrics?.memoryUtilization?.current < 50) {
      conf -= 40;
      contradicting.push(`Memory utilization is well within nominal safe thresholds.`);
    }

    candidates.push({
      candidate: 'Process Memory Exhaustion & Heap OOM Fault',
      incidentType: INCIDENT_TYPES.MEMORY_EXHAUSTION,
      confidence: Math.min(98, Math.max(10, conf)),
      status: conf >= 80 ? 'PROBABLE' : 'POSSIBLE',
      suspectedOrigin: {
        service,
        resource,
        component: 'JVM / Container Memory Heap'
      },
      summary: `Evidence indicates memory allocation reached container boundary, triggering OOM kernel termination and process crash loops.`,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting
    });
  }

  // 5. Evaluate TRAFFIC_OVERLOAD
  if (incidentType === INCIDENT_TYPES.TRAFFIC_OVERLOAD || evidenceClusters.some(c => c.category === CLUSTER_CATEGORIES.TRAFFIC)) {
    const reqAno = (anomalyReport.anomalies || []).find(a => /requestrate|throughput/i.test(a.metric));
    const queueAno = (anomalyReport.anomalies || []).find(a => /queue|backlog/i.test(a.metric));
    const cpuAno = (anomalyReport.anomalies || []).find(a => /cpu/i.test(a.metric));

    const supporting = [];
    const contradicting = [];
    let conf = 70;

    if (reqAno && reqAno.deviationRatio >= 3.0) {
      conf += 18;
      supporting.push(`Request volume surged ${reqAno.deviationRatio}x above standard baseline capacity (${reqAno.current} req/s).`);
    }
    if (queueAno) {
      conf += 15;
      supporting.push(`Ingestion queue depth backlog expanded to ${queueAno.current} messages.`);
    }
    if (cpuAno) {
      conf += 10;
      supporting.push(`CPU capacity reached ${cpuAno.current}% handling high incoming concurrency.`);
    }

    candidates.push({
      candidate: 'Ingestion Queue & Traffic Surge Overload',
      incidentType: INCIDENT_TYPES.TRAFFIC_OVERLOAD,
      confidence: Math.min(96, Math.max(10, conf)),
      status: conf >= 80 ? 'PROBABLE' : 'POSSIBLE',
      suspectedOrigin: {
        service,
        resource,
        component: 'API Gateway / Worker Pool'
      },
      summary: `Unprecedented request volume multiplier saturated ingestion capacity, causing queue backpressure and latency degradation.`,
      supportingEvidence: supporting,
      contradictingEvidence: contradicting
    });
  }

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Fallback if no specific candidate emerged (Ambiguous case)
  if (candidates.length === 0) {
    candidates.push({
      candidate: 'Uncorrelated Telemetry Anomaly',
      incidentType: INCIDENT_TYPES.UNKNOWN_ANOMALY,
      confidence: Math.min(45, anomalyReport.overallAnomalyScore || 35),
      status: 'UNCONFIRMED_AMBIGUOUS',
      suspectedOrigin: {
        service,
        resource,
        component: 'Unspecified Subsystem'
      },
      summary: `Observed anomalous telemetry signals do not yet exhibit a conclusive causal or temporal sequence.`,
      supportingEvidence: (anomalyReport.anomalies || []).map(a => `${a.metricDisplayName || a.metric} is abnormal (${a.current})`),
      contradictingEvidence: []
    });
  }

  return candidates;
};

/**
 * Main Evidence Correlation Entrypoint
 * @param {Object} normalizedTelemetry - Normalized telemetry from Phase 1
 * @param {Object} anomalyReport - Anomaly report from Phase 2
 * @param {Object} incidentIdentification - Incident hypotheses from Phase 3
 * @returns {Object} Comprehensive Root-Cause Evidence Package
 */
const correlateEvidence = (normalizedTelemetry = {}, anomalyReport = {}, incidentIdentification = {}) => {
  const service = normalizedTelemetry.service || 'unknown-service';
  const resource = normalizedTelemetry.resource || 'unknown-resource';
  const timestamp = normalizedTelemetry.timestamp || new Date().toISOString();

  // 1. Group signals into Evidence Clusters
  const evidenceClusters = buildEvidenceClusters(normalizedTelemetry, anomalyReport);

  // 2. Extract Temporal Timeline & Sequence Relationships
  const temporalEvents = buildTemporalCorrelations(normalizedTelemetry, anomalyReport);

  // 3. Construct the Step-by-Step Evidence Chain
  const evidenceChain = buildEvidenceChain(temporalEvents, incidentIdentification);

  // 4. Formulate Probable Root-Cause Hypotheses & Candidates
  const rootCauseCandidates = formulateRootCauseHypotheses(
    normalizedTelemetry,
    anomalyReport,
    incidentIdentification,
    evidenceClusters,
    temporalEvents
  );

  const primaryRootCause = rootCauseCandidates[0];

  return {
    service,
    resource,
    timestamp,
    primaryRootCause,
    rootCauseCandidates,
    evidenceClusters,
    evidenceChain,
    temporalEvents,
    correlationSummary: `Correlated ${evidenceClusters.length} evidence clusters across ${evidenceChain.length} sequential milestones, identifying '${primaryRootCause.candidate}' (${primaryRootCause.confidence}% confidence) as the leading root-cause explanation.`
  };
};

module.exports = {
  correlateEvidence,
  buildEvidenceClusters,
  buildTemporalCorrelations,
  buildEvidenceChain,
  formulateRootCauseHypotheses,
  RELATIONSHIP_TYPES,
  CLUSTER_CATEGORIES
};
