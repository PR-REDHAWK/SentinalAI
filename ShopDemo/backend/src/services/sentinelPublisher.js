/**
 * SentinelAI Publisher Service
 * Responsible for forwarding formatted telemetry payloads to SentinelAI's webhook endpoints.
 */

const axios = require('axios');
const { formatTelemetryForSentinel } = require('./telemetryAdapter');

class SentinelPublisher {
  constructor(engine) {
    this.engine = engine;
    this.sentinelBaseUrl = process.env.SENTINEL_URL || 'http://localhost:5000';
    this.debounceTimer = null;
    this.lastDispatched = 0;

    // Listen for engine dispatch events
    this.engine.on('dispatch-telemetry', () => this.handleDispatch());
  }

  async handleDispatch() {
    const now = Date.now();
    // Debounce to max once per 5 seconds to avoid flooding SentinelAI
    if (now - this.lastDispatched < 4500) return;
    this.lastDispatched = now;

    const fullState = this.engine.getFullState();
    const formatted = formatTelemetryForSentinel(fullState);

    const sourcePathMap = {
      'Datadog': '/api/webhooks/datadog',
      'Prometheus': '/api/webhooks/prometheus',
      'CloudWatch': '/api/webhooks/cloudwatch',
      'Kubernetes': '/api/webhooks/kubernetes'
    };

    const endpoint = sourcePathMap[formatted.source] || '/api/webhooks/datadog';
    const targetUrl = `${this.sentinelBaseUrl}${endpoint}`;

    try {
      const response = await axios.post(targetUrl, formatted.payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 4000
      });

      this.engine.sentinelStatus = {
        connected: true,
        lastSent: new Date().toISOString(),
        totalEventsSent: (this.engine.sentinelStatus.totalEventsSent || 0) + 1,
        anomaliesObserved: (this.engine.sentinelStatus.anomaliesObserved || 0) + (fullState.scenarioStage >= 2 ? 1 : 0),
        lastResponse: response.data?.message || '202 Accepted'
      };

      this.engine.addLog('INFO', 'sentinel-publisher', `Telemetry payload successfully published to SentinelAI (${formatted.source} endpoint)`);
    } catch (err) {
      this.engine.sentinelStatus = {
        connected: false,
        lastSent: new Date().toISOString(),
        totalEventsSent: this.engine.sentinelStatus.totalEventsSent || 0,
        anomaliesObserved: this.engine.sentinelStatus.anomaliesObserved || 0,
        lastResponse: `Error: ${err.message}`
      };
      this.engine.addLog('WARN', 'sentinel-publisher', `Could not reach SentinelAI at ${targetUrl}: ${err.message}`);
    }
  }

  async testConnection() {
    try {
      const res = await axios.get(`${this.sentinelBaseUrl}/api/health`, { timeout: 2000 });
      return { connected: true, data: res.data };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }
}

module.exports = SentinelPublisher;
