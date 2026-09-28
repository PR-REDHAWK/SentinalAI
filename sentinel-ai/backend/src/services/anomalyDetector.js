/**
 * Telemetry Anomaly Detection Engine
 * Phase 2: Normalized Telemetry -> Deterministic Anomaly Scoring & Evaluation
 * 
 * Analyzes provider-independent normalized telemetry, comparing current observed
 * values against baselines, evaluating trends and multi-signal deviations.
 * 
 * Rules:
 * - Operates purely on normalized telemetry (provider-agnostic).
 * - Deterministic, bounded (0-100), explainable scoring.
 * - Severity levels: NORMAL, LOW, MEDIUM, HIGH, CRITICAL.
 * - No incident classification or AI guessing.
 */

// Severity thresholds for anomaly scores
const SEVERITY_LEVELS = {
  NORMAL: 'NORMAL',     // 0 - 29
  LOW: 'LOW',           // 30 - 49
  MEDIUM: 'MEDIUM',     // 50 - 69
  HIGH: 'HIGH',         // 70 - 84
  CRITICAL: 'CRITICAL'  // 85 - 100
};

const getSeverityFromScore = (score) => {
  if (score >= 85) return SEVERITY_LEVELS.CRITICAL;
  if (score >= 70) return SEVERITY_LEVELS.HIGH;
  if (score >= 50) return SEVERITY_LEVELS.MEDIUM;
  if (score >= 30) return SEVERITY_LEVELS.LOW;
  return SEVERITY_LEVELS.NORMAL;
};

/**
 * Analyze temporal trend for sustained degradation vs isolated transient spike
 * @param {Array<{timestamp: string, value: number}>} trend 
 * @param {number} baseline 
 * @param {number} current 
 * @returns {Object} Trend analysis summary
 */
const analyzeTrend = (trend = [], baseline = 0, current = 0) => {
  if (!Array.isArray(trend) || trend.length < 2) {
    return { isSustained: true, isSpike: false, direction: 'unknown', rateOfChange: 0, sampleCount: trend?.length || 0 };
  }

  const values = trend.map(p => Number(p.value));
  const n = values.length;
  const lastVal = values[n - 1];
  const firstVal = values[0];
  const midPoints = values.slice(0, n - 1);

  // Check if degradation is sustained (consecutive increase / staying elevated)
  let increases = 0;
  for (let i = 1; i < n; i++) {
    if (values[i] >= values[i - 1]) increases++;
  }
  const isMonotonicIncreasing = increases >= n - 2;

  // Check if it's an isolated spike (single anomaly followed or preceded by normal baseline values)
  const maxMid = Math.max(...midPoints);
  const avgMid = midPoints.reduce((a, b) => a + b, 0) / midPoints.length;
  const isIsolatedSpike = (midPoints.length >= 3 && Math.abs(avgMid - baseline) < 0.15 * Math.abs(baseline || 1) && Math.abs(lastVal - baseline) > 0.8 * Math.abs(baseline || 1));

  const totalDelta = lastVal - firstVal;
  const rateOfChange = firstVal !== 0 ? (totalDelta / Math.abs(firstVal)) * 100 : totalDelta * 100;

  return {
    isSustained: isMonotonicIncreasing || !isIsolatedSpike,
    isSpike: isIsolatedSpike,
    direction: totalDelta > 0 ? 'increasing' : totalDelta < 0 ? 'decreasing' : 'stable',
    rateOfChange: Number(rateOfChange.toFixed(1)),
    sampleCount: n
  };
};

/**
 * Metric-specific evaluator configs
 */
const METRIC_EVALUATORS = {
  // 1. Latency & Duration Metrics (Ratio based)
  latency: {
    match: (name) => /latency|responsetime|duration|querytime/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 1, current = 1, unit = 'ms', trend = [] } = data;
      const safeBaseline = Math.max(baseline, 0.001);
      const ratio = current / safeBaseline;
      const delta = current - safeBaseline;

      let baseScore = 0;
      if (ratio <= 1.2) {
        baseScore = Math.max(0, (ratio - 1) * 50); // 0 - 10
      } else if (ratio <= 1.8) {
        baseScore = 20 + ((ratio - 1.2) / 0.6) * 25; // 20 - 45
      } else if (ratio <= 3.0) {
        baseScore = 45 + ((ratio - 1.8) / 1.2) * 25; // 45 - 70
      } else if (ratio <= 6.0) {
        baseScore = 70 + ((ratio - 3.0) / 3.0) * 20; // 70 - 90
      } else {
        baseScore = Math.min(100, 90 + Math.log10(ratio / 6) * 15); // 90 - 100
      }

      // Trend adjustment
      const trendInfo = analyzeTrend(trend, safeBaseline, current);
      if (trendInfo.isSpike) {
        baseScore *= 0.65; // Dampen isolated blips
      } else if (trendInfo.isSustained && baseScore > 50) {
        baseScore = Math.min(100, baseScore + 5);
      }

      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Latency of ${current}${unit} is within normal variance of baseline (${safeBaseline}${unit}).`;
      } else {
        reason = `Latency is approximately ${ratio.toFixed(1)}x above established baseline (${safeBaseline}${unit} -> ${current}${unit}).`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'Response Latency',
        baseline: safeBaseline,
        current,
        unit,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: Number(delta.toFixed(2)),
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 2. Error Rate Metrics (Percentage point shift & relative ratio)
  errorRate: {
    match: (name) => /error|failure|errrate/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 0.01, current = 0, unit = 'percent', trend = [] } = data;
      const safeBaseline = Math.max(baseline, 0.001);
      const ratio = current / safeBaseline;
      const delta = current - baseline;

      let baseScore = 0;
      if (current <= 0.1 && ratio <= 1.5) {
        baseScore = 5;
      } else if (current >= 15.0 || delta >= 15.0) {
        baseScore = 95 + Math.min(5, (current - 15) * 0.2); // 95 - 100
      } else if (current >= 5.0 || delta >= 5.0 || ratio >= 20.0) {
        baseScore = 85 + Math.min(10, ((current - 5) / 10) * 10); // 85 - 95
      } else if (current >= 1.5 || ratio >= 5.0) {
        baseScore = 65 + ((current - 1.5) / 3.5) * 20; // 65 - 85
      } else if (current >= 0.5 || ratio >= 2.0) {
        baseScore = 40 + ((current - 0.5) / 1.0) * 25; // 40 - 65
      } else {
        baseScore = 15;
      }

      const trendInfo = analyzeTrend(trend, baseline, current);
      if (trendInfo.isSpike) {
        baseScore *= 0.7;
      } else if (trendInfo.isSustained && baseScore > 50) {
        baseScore = Math.min(100, baseScore + 4);
      }

      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Error rate (${current}%) is consistent with nominal baseline (${baseline}%).`;
      } else {
        reason = `Error rate increased from ${baseline}% baseline to ${current}% (${ratio.toFixed(1)}x increase).`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'Error Rate',
        baseline,
        current,
        unit,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: Number(delta.toFixed(2)),
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 3. CPU Utilization (Percentage based with absolute thresholds)
  cpu: {
    match: (name) => /cpu|processor/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 50, current = 50, unit = 'percent', threshold = 80, trend = [] } = data;
      const ratio = current / Math.max(baseline, 1);
      const delta = current - baseline;

      let baseScore = 0;
      if (current >= 95) {
        baseScore = 92 + ((current - 95) / 5) * 8; // 92 - 100
      } else if (current >= 85) {
        baseScore = 75 + ((current - 85) / 10) * 16; // 75 - 91
      } else if (current >= 70 && delta > 15) {
        baseScore = 55 + ((current - 70) / 15) * 20; // 55 - 75
      } else if (delta > 25) {
        baseScore = 40 + ((delta - 25) / 25) * 25; // 40 - 65
      } else if (current < 70 && delta <= 10) {
        baseScore = Math.max(5, (current / 70) * 20); // 5 - 20 (NORMAL)
      } else {
        baseScore = 25;
      }

      const trendInfo = analyzeTrend(trend, baseline, current);
      if (trendInfo.isSpike) {
        baseScore *= 0.7;
      } else if (trendInfo.isSustained && baseScore > 60) {
        baseScore = Math.min(100, baseScore + 4);
      }

      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `CPU utilization (${current}%) is operating within normal limits (baseline: ${baseline}%).`;
      } else {
        reason = `CPU utilization reached ${current}%, exceeding baseline (${baseline}%) by ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% (${ratio.toFixed(2)}x).`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'CPU Utilization',
        baseline,
        current,
        unit,
        threshold,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: Number(delta.toFixed(2)),
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 4. Memory Utilization (Percentage or MB/Limit based)
  memory: {
    match: (name) => /memory|ram|mem/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 50, current = 50, unit = 'percent', limit, trend = [] } = data;
      const ratio = current / Math.max(baseline, 1);
      const delta = current - baseline;

      let utilizationPct = current;
      if (unit.toLowerCase() === 'mb' && limit && limit > 0) {
        utilizationPct = (current / limit) * 100;
      }

      let baseScore = 0;
      if (utilizationPct >= 98 || (limit && current >= limit)) {
        baseScore = 98;
      } else if (utilizationPct >= 90) {
        baseScore = 85 + ((utilizationPct - 90) / 8) * 12; // 85 - 97
      } else if (utilizationPct >= 80) {
        baseScore = 65 + ((utilizationPct - 80) / 10) * 20; // 65 - 85
      } else if (delta > 30) {
        baseScore = 50 + ((delta - 30) / 30) * 20; // 50 - 70
      } else if (utilizationPct < 70 && delta <= 10) {
        baseScore = 15;
      } else {
        baseScore = 25;
      }

      const trendInfo = analyzeTrend(trend, baseline, current);
      if (trendInfo.isSpike) {
        baseScore *= 0.7;
      } else if (trendInfo.isSustained && baseScore > 60) {
        baseScore = Math.min(100, baseScore + 3);
      }

      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Memory usage (${current}${unit}) is stable relative to baseline (${baseline}${unit}).`;
      } else if (limit) {
        reason = `Memory consumption reached ${current}${unit} of ${limit}${unit} limit (${utilizationPct.toFixed(1)}% allocation, baseline: ${baseline}${unit}).`;
      } else {
        reason = `Memory utilization reached ${current}%, exceeding baseline (${baseline}%) by ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%.`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'Memory Usage',
        baseline,
        current,
        unit,
        limit,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: Number(delta.toFixed(2)),
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 5. Active Connections / Database Connection Pool
  connections: {
    match: (name) => /connection|pool|active_connections/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 40, current = 40, unit = 'connections', threshold: limit = 300, trend = [] } = data;
      const ratio = current / Math.max(baseline, 1);
      const delta = current - baseline;
      const poolUtilization = (current / Math.max(limit, 1)) * 100;

      let baseScore = 0;
      if (poolUtilization >= 95 || (limit && current >= limit - 10)) {
        baseScore = 94 + Math.min(6, (poolUtilization - 95) * 1.2); // 94 - 100
      } else if (poolUtilization >= 80 || ratio >= 5.0) {
        baseScore = 75 + ((poolUtilization - 80) / 15) * 18; // 75 - 93
      } else if (poolUtilization >= 65 || ratio >= 3.0) {
        baseScore = 55 + ((poolUtilization - 65) / 15) * 20; // 55 - 75
      } else if (poolUtilization < 50 && ratio <= 1.5) {
        baseScore = 12;
      } else {
        baseScore = 30;
      }

      const trendInfo = analyzeTrend(trend, baseline, current);
      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Active connections (${current}/${limit}) within healthy pool bounds.`;
      } else {
        reason = `Database active connections reached ${current}/${limit} (${poolUtilization.toFixed(1)}% pool capacity), ${ratio.toFixed(1)}x above baseline (${baseline}).`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'DB Connection Pool',
        baseline,
        current,
        unit,
        threshold: limit,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: Number(delta.toFixed(2)),
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 6. Request Rate / Throughput (Surges or severe crashes)
  requestRate: {
    match: (name) => /requestrate|throughput|rps|qps/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 1000, current = 1000, unit = 'req/s', trend = [] } = data;
      const ratio = current / Math.max(baseline, 1);
      const delta = current - baseline;

      let baseScore = 0;
      if (ratio >= 6.0) {
        baseScore = 88 + Math.min(12, (ratio - 6) * 2); // 88 - 100
      } else if (ratio >= 3.0) {
        baseScore = 70 + ((ratio - 3.0) / 3.0) * 18; // 70 - 88
      } else if (ratio >= 1.8) {
        baseScore = 45 + ((ratio - 1.8) / 1.2) * 25; // 45 - 70
      } else if (ratio <= 0.1 && baseline > 100) {
        // Severe traffic drop / outage
        baseScore = 92;
      } else if (ratio >= 0.8 && ratio <= 1.3) {
        baseScore = 10;
      } else {
        baseScore = 25;
      }

      const trendInfo = analyzeTrend(trend, baseline, current);
      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Request rate of ${current}${unit} matches expected baseline (${baseline}${unit}).`;
      } else if (ratio < 0.2) {
        reason = `Severe request throughput collapse: dropped to ${current}${unit} (${(ratio * 100).toFixed(1)}% of nominal baseline).`;
      } else {
        reason = `Request rate surged to ${current}${unit}, representing a ${ratio.toFixed(1)}x load multiplier over baseline (${baseline}${unit}).`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'Request Rate Throughput',
        baseline,
        current,
        unit,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: Number(delta.toFixed(2)),
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 7. Restart Count / Crash Loops
  restarts: {
    match: (name) => /restart|crash|exit_count/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 0, current = 0, unit = 'count', trend = [] } = data;
      const delta = current - baseline;

      let baseScore = 0;
      if (current >= 6) {
        baseScore = 90 + Math.min(10, (current - 6) * 2.5); // 90 - 100
      } else if (current >= 3) {
        baseScore = 75 + ((current - 3) / 3) * 15; // 75 - 90
      } else if (current >= 1) {
        baseScore = 50 + ((current - 1) / 2) * 25; // 50 - 75
      } else {
        baseScore = 0;
      }

      const trendInfo = analyzeTrend(trend, baseline, current);
      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Process container lifecycle is healthy (0 restarts).`;
      } else {
        reason = `Container restart count reached ${current} (baseline: ${baseline}), indicating unstable crash looping process lifecycle.`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'Container Restarts',
        baseline,
        current,
        unit,
        deviationRatio: baseline === 0 ? current : Number((current / baseline).toFixed(2)),
        absoluteDelta: delta,
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 8. Queue Depth / Message Backlog
  queueDepth: {
    match: (name) => /queue|backlog|lag|messages/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 10, current = 10, unit = 'messages', trend = [] } = data;
      const safeBaseline = Math.max(baseline, 1);
      const ratio = current / safeBaseline;
      const delta = current - baseline;

      let baseScore = 0;
      if (current >= 1000 || ratio >= 50.0) {
        baseScore = 92 + Math.min(8, (ratio / 100) * 4); // 92 - 100
      } else if (current >= 200 || ratio >= 10.0) {
        baseScore = 75 + ((ratio - 10) / 40) * 17; // 75 - 92
      } else if (current >= 50 || ratio >= 3.0) {
        baseScore = 50 + ((ratio - 3) / 7) * 25; // 50 - 75
      } else if (ratio <= 1.5) {
        baseScore = 10;
      } else {
        baseScore = 30;
      }

      const trendInfo = analyzeTrend(trend, safeBaseline, current);
      const score = Math.round(Math.min(100, Math.max(0, baseScore)));
      const severity = getSeverityFromScore(score);

      let reason;
      if (severity === SEVERITY_LEVELS.NORMAL) {
        reason = `Queue depth (${current} ${unit}) is operating within standard draining tolerance.`;
      } else {
        reason = `Queue depth backlog surged to ${current} ${unit}, ${ratio.toFixed(1)}x above baseline (${safeBaseline} ${unit}).`;
      }

      return {
        metric: metricKey,
        metricDisplayName: 'Queue Depth Backlog',
        baseline: safeBaseline,
        current,
        unit,
        deviationRatio: Number(ratio.toFixed(2)),
        absoluteDelta: delta,
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: trendInfo
      };
    }
  },

  // 9. Container Uptime (Downwards anomaly)
  containerUptime: {
    match: (name) => /uptime/i.test(name),
    evaluate: (metricKey, data) => {
      const { baseline = 86400, current = 86400, unit = 'seconds', trend = [] } = data;
      let baseScore = 0;
      if (current <= 30) {
        baseScore = 95;
      } else if (current <= 120) {
        baseScore = 80;
      } else if (current <= 600) {
        baseScore = 60;
      } else {
        baseScore = 5;
      }

      const score = baseScore;
      const severity = getSeverityFromScore(score);
      const reason = severity === SEVERITY_LEVELS.NORMAL
        ? `Container uptime (${current}s) is healthy.`
        : `Container uptime is critically low (${current}s vs nominal baseline ${baseline}s), indicating rapid restarts.`;

      return {
        metric: metricKey,
        metricDisplayName: 'Container Uptime',
        baseline,
        current,
        unit,
        deviationRatio: Number((current / Math.max(baseline, 1)).toFixed(3)),
        absoluteDelta: current - baseline,
        anomalyScore: score,
        severity,
        reason,
        trendAnalysis: analyzeTrend(trend, baseline, current)
      };
    }
  }
};

/**
 * Fallback generic evaluator for metrics not matching specific evaluators
 */
const evaluateGenericMetric = (metricKey, data) => {
  const { baseline = 1, current = 1, unit = '', trend = [] } = data;
  const safeBaseline = Math.max(baseline, 0.0001);
  const ratio = current / safeBaseline;
  const delta = current - baseline;

  let baseScore = 0;
  if (ratio >= 4.0 || ratio <= 0.25) {
    baseScore = 80;
  } else if (ratio >= 2.0 || ratio <= 0.5) {
    baseScore = 55;
  } else if (ratio >= 1.3 || ratio <= 0.7) {
    baseScore = 30;
  } else {
    baseScore = 10;
  }

  const score = Math.round(baseScore);
  const severity = getSeverityFromScore(score);
  const reason = severity === SEVERITY_LEVELS.NORMAL
    ? `${metricKey} is operating within nominal range.`
    : `${metricKey} deviated significantly from baseline (${safeBaseline} -> ${current}, ratio: ${ratio.toFixed(2)}x).`;

  return {
    metric: metricKey,
    metricDisplayName: metricKey,
    baseline: safeBaseline,
    current,
    unit,
    deviationRatio: Number(ratio.toFixed(2)),
    absoluteDelta: Number(delta.toFixed(2)),
    anomalyScore: score,
    severity,
    reason,
    trendAnalysis: analyzeTrend(trend, safeBaseline, current)
  };
};

/**
 * Detect all anomalies from normalized telemetry
 * @param {Object} normalizedTelemetry - Standard normalized telemetry schema from Phase 1
 * @returns {Object} Comprehensive Anomaly Report
 */
const detectAnomalies = (normalizedTelemetry = {}) => {
  const metrics = normalizedTelemetry.metrics || {};
  const service = normalizedTelemetry.service || 'unknown-service';
  const resource = normalizedTelemetry.resource || 'unknown-resource';
  const source = normalizedTelemetry.source || 'unknown';
  const region = normalizedTelemetry.region || 'Global';
  const environment = normalizedTelemetry.environment || 'production';
  const timestamp = normalizedTelemetry.timestamp || new Date().toISOString();

  const evaluatedSignals = [];

  // Evaluate each metric against metric-specific or generic evaluators
  for (const [metricKey, metricData] of Object.entries(metrics)) {
    if (!metricData || typeof metricData !== 'object') continue;

    let matchedEvaluator = null;
    for (const key of Object.keys(METRIC_EVALUATORS)) {
      if (METRIC_EVALUATORS[key].match(metricKey)) {
        matchedEvaluator = METRIC_EVALUATORS[key];
        break;
      }
    }

    const evaluation = matchedEvaluator
      ? matchedEvaluator.evaluate(metricKey, metricData)
      : evaluateGenericMetric(metricKey, metricData);

    // Attach provenance
    evaluation.provenance = {
      source,
      service,
      resource,
      region,
      environment
    };

    evaluatedSignals.push(evaluation);
  }

  // Filter into active anomalies (score >= 30, i.e. LOW, MEDIUM, HIGH, CRITICAL) vs normal metrics
  const activeAnomalies = evaluatedSignals
    .filter(sig => sig.severity !== SEVERITY_LEVELS.NORMAL)
    .sort((a, b) => b.anomalyScore - a.anomalyScore); // Highest anomaly score first

  const normalMetrics = evaluatedSignals
    .filter(sig => sig.severity === SEVERITY_LEVELS.NORMAL);

  // Calculate composite overall anomaly score
  let overallAnomalyScore = 0;
  if (activeAnomalies.length > 0) {
    // Weighted formula: top anomaly carries highest weight, secondary anomalies reinforce score
    const topScore = activeAnomalies[0].anomalyScore;
    const supportingSum = activeAnomalies.slice(1).reduce((acc, curr) => acc + curr.anomalyScore * 0.1, 0);
    overallAnomalyScore = Math.min(100, Math.round(topScore + Math.min(10, supportingSum)));
  }

  const highestSeverity = activeAnomalies.length > 0
    ? activeAnomalies[0].severity
    : SEVERITY_LEVELS.NORMAL;

  // Generate concise human-readable summary
  let summary = 'Telemetry is operating within healthy baseline expectations.';
  if (activeAnomalies.length > 0) {
    const criticals = activeAnomalies.filter(a => a.severity === SEVERITY_LEVELS.CRITICAL).length;
    const highs = activeAnomalies.filter(a => a.severity === SEVERITY_LEVELS.HIGH).length;
    const mediums = activeAnomalies.filter(a => a.severity === SEVERITY_LEVELS.MEDIUM).length;
    const lows = activeAnomalies.filter(a => a.severity === SEVERITY_LEVELS.LOW).length;

    const parts = [];
    if (criticals > 0) parts.push(`${criticals} CRITICAL`);
    if (highs > 0) parts.push(`${highs} HIGH`);
    if (mediums > 0) parts.push(`${mediums} MEDIUM`);
    if (lows > 0) parts.push(`${lows} LOW`);

    summary = `Detected ${activeAnomalies.length} anomalous signal${activeAnomalies.length > 1 ? 's' : ''} (${parts.join(', ')}).`;
  }

  return {
    service,
    resource,
    region,
    environment,
    source,
    timestamp,
    overallAnomalyScore,
    highestSeverity,
    hasAnomalies: activeAnomalies.length > 0,
    anomalyCount: activeAnomalies.length,
    anomalies: activeAnomalies,
    normalMetrics,
    summary
  };
};

module.exports = {
  detectAnomalies,
  analyzeTrend,
  getSeverityFromScore,
  SEVERITY_LEVELS,
  METRIC_EVALUATORS
};
