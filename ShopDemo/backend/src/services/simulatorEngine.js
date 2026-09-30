/**
 * ShopDemo Production Environment & Chaos Simulator Engine
 * 
 * Manages simulated production state, 7 logical services, baseline metrics,
 * background traffic simulation, 8 chaos scenarios, progressive failure stages,
 * and ground-truth isolation.
 */

const EventEmitter = require('events');

class SimulatorEngine extends EventEmitter {
  constructor() {
    super();
    this.sentinelUrl = process.env.SENTINEL_URL || 'http://localhost:5000';
    this.timer = null;
    this.statsHistory = [];
    this.logsHistory = [];
    this.eventsHistory = [];
    this.sentinelStatus = {
      connected: false,
      lastSent: null,
      totalEventsSent: 0,
      anomaliesObserved: 0,
      lastResponse: null
    };
    this.resetState();
  }

  resetState() {
    this.activeScenario = null;
    this.scenarioStage = 0; // 0: Normal, 1: Early, 2: Warning, 3: Severe, 4: Critical
    this.scenarioStartTime = null;
    this.blindMode = false;
    this.hiddenGroundTruth = null;
    this.revealed = false;
    this.tickCount = 0;

    // Baselines
    this.baselines = {
      traffic: 150, // req/s
      apiLatency: 100, // ms
      dbLatency: 30, // ms
      paymentLatency: 150, // ms
      errorRate: 0.2, // %
      cpu: 38, // %
      memory: 48, // %
      dbConnections: 40, // out of 100
      queueDepth: 12 // messages
    };

    // Current metrics (initialized with baseline + minor variance)
    this.currentMetrics = {
      traffic: 150,
      apiLatency: 100,
      dbLatency: 30,
      paymentLatency: 150,
      errorRate: 0.2,
      cpu: 38,
      memory: 48,
      dbConnections: 40,
      queueDepth: 12,
      healthyInstances: 3
    };

    // Services status
    this.services = {
      'api-gateway': { name: 'API Gateway', status: 'HEALTHY', latency: 25, errorRate: 0.1 },
      'auth-service': { name: 'Auth Service', status: 'HEALTHY', latency: 40, errorRate: 0.1 },
      'product-service': { name: 'Product Service', status: 'HEALTHY', latency: 60, errorRate: 0.1 },
      'order-service': { name: 'Order Service', status: 'HEALTHY', latency: 85, errorRate: 0.2 },
      'payment-service': { name: 'Payment Service', status: 'HEALTHY', latency: 120, errorRate: 0.2 },
      'database': { name: 'PostgreSQL DB', status: 'HEALTHY', latency: 30, errorRate: 0.0 },
      'payment-processor-api': { name: 'Payment Processor API', status: 'HEALTHY', latency: 150, errorRate: 0.1 }
    };

    this.addLog('INFO', 'shopdemo-system', 'ShopDemo Production Environment initialized at baseline state');
    this.addEvent('SystemStarted', 'Production environment initialized across 7 logical services', 'shopdemo-kernel');
  }

  startSimulationLoop(intervalMs = 2000) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), intervalMs);
    console.log(`🚀 Simulator engine loop started (interval: ${intervalMs}ms)`);
  }

  stopSimulationLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  addLog(level, service, message) {
    const log = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      level,
      service,
      message
    };
    this.logsHistory.unshift(log);
    if (this.logsHistory.length > 100) this.logsHistory.pop();
    return log;
  }

  addEvent(type, message, source = 'shopdemo-telemetry') {
    const event = {
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      type,
      message,
      source
    };
    this.eventsHistory.unshift(event);
    if (this.eventsHistory.length > 50) this.eventsHistory.pop();
    return event;
  }

  // Calculate current jittered values
  jitter(val, variancePercent = 0.08) {
    const delta = (Math.random() * 2 - 1) * variancePercent * val;
    return Math.max(0, Number((val + delta).toFixed(2)));
  }

  // Execute one tick of simulation
  tick() {
    this.tickCount++;

    // Advance progressive scenario stage every 2 ticks if active
    if (this.activeScenario && this.scenarioStage < 4) {
      if (this.tickCount % 2 === 0) {
        this.scenarioStage++;
        this.addLog('WARN', 'chaos-controller', `Chaos scenario '${this.activeScenario}' escalated to Stage ${this.scenarioStage}`);
      }
    }

    // Apply baseline + scenario perturbations
    this.updateMetricsForScenario();

    // Store in history
    const snap = {
      timestamp: new Date().toISOString(),
      metrics: { ...this.currentMetrics },
      scenarioStage: this.scenarioStage,
      systemStatus: this.getOverallStatus()
    };
    this.statsHistory.push(snap);
    if (this.statsHistory.length > 30) this.statsHistory.shift();

    // Emit live tick event to websocket clients
    this.emit('tick', this.getFullState());

    // Dispatch telemetry payload to SentinelAI when degraded/incident occurs
    if (this.scenarioStage >= 2 || (this.activeScenario && this.scenarioStage >= 1)) {
      this.emit('dispatch-telemetry');
    }
  }

  updateMetricsForScenario() {
    const stage = this.scenarioStage;
    const b = this.baselines;

    let trafficMultiplier = 1;
    let dbLatMult = 1;
    let paymentLatMult = 1;
    let errAdd = 0;
    let cpuAdd = 0;
    let memAdd = 0;
    let connAdd = 0;
    let queueAdd = 0;

    switch (this.activeScenario) {
      case 'TRAFFIC_SPIKE':
        // Stage 1: 300 req/s, Stage 2: 500 req/s, Stage 3: 800 req/s, Stage 4: 1200 req/s
        trafficMultiplier = [1, 2, 3.3, 5.3, 8][stage];
        cpuAdd = [0, 15, 30, 45, 52][stage];
        queueAdd = [0, 50, 200, 600, 1400][stage];
        errAdd = [0, 0.2, 1.0, 3.5, 7.8][stage];
        dbLatMult = [1, 1.3, 2.0, 3.2, 4.5][stage];
        paymentLatMult = [1, 1.2, 1.8, 2.5, 3.8][stage];
        if (stage === 2) this.addLog('WARN', 'api-gateway', 'Request rate breaching 500 req/s target threshold');
        if (stage === 4) this.addLog('ERROR', 'api-gateway', 'Queue backlog saturation: drop policy activated');
        break;

      case 'DATABASE_DEGRADATION':
        // Stage 1: 50ms, Stage 2: 120ms, Stage 3: 400ms, Stage 4: 850ms
        dbLatMult = [1, 1.7, 4.0, 13.3, 28.3][stage];
        errAdd = [0, 0.3, 1.8, 4.5, 9.2][stage];
        if (stage === 2) this.addLog('WARN', 'database', 'Query lock contention observed on table orders (p99 > 120ms)');
        if (stage === 4) this.addLog('ERROR', 'database', 'PostgreSQL lock timeout: transaction aborted after 45s');
        break;

      case 'DATABASE_CONNECTION_EXHAUSTION':
        // Stage 1: 65, Stage 2: 85, Stage 3: 98, Stage 4: 100/100
        connAdd = [0, 25, 45, 58, 60][stage];
        dbLatMult = [1, 1.5, 3.0, 8.0, 15.0][stage];
        errAdd = [0, 0.5, 2.5, 6.0, 12.0][stage];
        if (stage === 2) this.addLog('WARN', 'database', 'Connection pool utilization exceeded 85% capacity');
        if (stage === 4) this.addLog('ERROR', 'database', 'Connection pool exhausted: FATAL remaining slots reserved for superuser');
        break;

      case 'PAYMENT_DEPENDENCY_FAILURE':
        // Stage 1: 300ms, Stage 2: 500ms, Stage 3: 800ms, Stage 4: 1200ms
        paymentLatMult = [1, 2.0, 3.3, 5.3, 8.0][stage];
        errAdd = [0, 0.5, 2.0, 5.5, 11.5][stage];
        // CPU & traffic remain relatively normal!
        if (stage === 2) this.addLog('WARN', 'payment-service', 'Payment processor API response time above warning threshold (500ms)');
        if (stage === 4) this.addLog('ERROR', 'payment-service', 'HTTP 504 Gateway Timeout connecting to external payment processor gateway');
        break;

      case 'MEMORY_LEAK':
        // Stage 1: 55%, Stage 2: 70%, Stage 3: 85%, Stage 4: 96%
        memAdd = [0, 10, 25, 40, 50][stage];
        errAdd = [0, 0.1, 0.8, 2.5, 6.0][stage];
        if (stage === 3) this.addLog('WARN', 'order-service', 'JVM Garbage Collection pause duration > 1800ms');
        if (stage === 4) {
          this.addLog('ERROR', 'order-service', 'java.lang.OutOfMemoryError: Java heap space');
          this.addEvent('ContainerRestart', 'Container order-service-pod-2 restarted by kubelet', 'kubernetes-cluster');
        }
        break;

      case 'DEPLOYMENT_REGRESSION':
        // Simulated deployment event
        if (stage === 1 && this.tickCount % 2 === 0) {
          this.addEvent('DeploymentStarted', 'Deploying product-service:v2.14.0 to production', 'ci-cd-pipeline');
          this.addEvent('DeploymentCompleted', 'Deployment v2.14.0 completed successfully', 'ci-cd-pipeline');
        }
        errAdd = [0, 1.2, 3.5, 7.0, 11.5][stage];
        dbLatMult = [1, 1.2, 1.8, 2.5, 3.5][stage];
        if (stage >= 2) this.addLog('ERROR', 'product-service', 'Unhandled NullPointerIncentiveException in product details resolver v2.14.0');
        break;

      case 'CONTAINER_FAILURE':
        // Instances drop 3 -> 2 -> 1
        this.currentMetrics.healthyInstances = [3, 3, 2, 1, 1][stage];
        trafficMultiplier = 1; // traffic constant, but load per instance increases
        cpuAdd = [0, 10, 25, 45, 55][stage];
        errAdd = [0, 0.5, 2.5, 6.5, 14.0][stage];
        if (stage === 2) this.addEvent('ContainerFailed', 'Pod auth-service-7f89b9-x1 failed liveness probe', 'k8s-kubelet');
        if (stage >= 3) this.addLog('ERROR', 'auth-service', 'Upstream pod connection refused 10.244.1.42:8080');
        break;

      case 'HIGH_ERROR_RATE':
        // Infrastructure metrics remain normal, but high 5xx error rate
        errAdd = [0, 2.0, 5.0, 9.0, 14.0][stage];
        if (stage >= 2) this.addLog('ERROR', 'api-gateway', 'HTTP 500 Internal Server Error returned on 8.5% of incoming routes');
        break;

      default: // Normal
        this.currentMetrics.healthyInstances = 3;
        break;
    }

    // Apply baseline math with natural jitter
    this.currentMetrics.traffic = Math.round(this.jitter(b.traffic * trafficMultiplier));
    this.currentMetrics.apiLatency = Math.round(this.jitter(b.apiLatency * (1 + (dbLatMult - 1) * 0.4 + (paymentLatMult - 1) * 0.4)));
    this.currentMetrics.dbLatency = Math.round(this.jitter(b.dbLatency * dbLatMult));
    this.currentMetrics.paymentLatency = Math.round(this.jitter(b.paymentLatency * paymentLatMult));
    this.currentMetrics.errorRate = Number(Math.min(100, Math.max(0, this.jitter(b.errorRate + errAdd))).toFixed(2));
    this.currentMetrics.cpu = Math.min(100, Math.round(this.jitter(b.cpu + cpuAdd)));
    this.currentMetrics.memory = Math.min(100, Math.round(this.jitter(b.memory + memAdd)));
    this.currentMetrics.dbConnections = Math.min(100, Math.round(b.dbConnections + connAdd));
    this.currentMetrics.queueDepth = Math.round(b.queueDepth + queueAdd);

    // Update individual logical services status
    this.updateServicesStatus();
  }

  updateServicesStatus() {
    const m = this.currentMetrics;
    const stage = this.scenarioStage;

    // Helper status classifier
    const getStatus = (lat, err, latThresh, errThresh) => {
      if (err > errThresh * 2 || lat > latThresh * 3) return 'CRITICAL';
      if (err > errThresh || lat > latThresh) return 'DEGRADED';
      return 'HEALTHY';
    };

    this.services['api-gateway'].latency = Math.round(m.apiLatency * 0.25);
    this.services['api-gateway'].errorRate = m.errorRate;
    this.services['api-gateway'].status = getStatus(this.services['api-gateway'].latency, m.errorRate, 80, 2.0);

    this.services['database'].latency = m.dbLatency;
    this.services['database'].errorRate = Number((m.errorRate * 0.3).toFixed(2));
    this.services['database'].status = getStatus(m.dbLatency, this.services['database'].errorRate, 100, 1.5);

    this.services['payment-processor-api'].latency = m.paymentLatency;
    this.services['payment-processor-api'].errorRate = Number((m.errorRate * 0.6).toFixed(2));
    this.services['payment-processor-api'].status = getStatus(m.paymentLatency, this.services['payment-processor-api'].errorRate, 400, 3.0);

    this.services['payment-service'].latency = Math.round(m.paymentLatency + 40);
    this.services['payment-service'].errorRate = m.errorRate;
    this.services['payment-service'].status = getStatus(this.services['payment-service'].latency, m.errorRate, 300, 2.5);

    this.services['product-service'].latency = Math.round(m.dbLatency + 30);
    this.services['product-service'].errorRate = Number((m.errorRate * 0.5).toFixed(2));
    this.services['product-service'].status = getStatus(this.services['product-service'].latency, this.services['product-service'].errorRate, 150, 2.0);

    this.services['order-service'].latency = Math.round(m.apiLatency * 0.8);
    this.services['order-service'].errorRate = m.errorRate;
    this.services['order-service'].status = getStatus(this.services['order-service'].latency, m.errorRate, 200, 2.0);

    this.services['auth-service'].latency = Math.round(30 + (m.healthyInstances < 3 ? 120 : 0));
    this.services['auth-service'].errorRate = m.healthyInstances < 3 ? 4.5 : 0.1;
    this.services['auth-service'].status = m.healthyInstances < 3 ? (m.healthyInstances === 1 ? 'CRITICAL' : 'DEGRADED') : 'HEALTHY';
  }

  getOverallStatus() {
    if (this.scenarioStage >= 3) return 'INCIDENT';
    if (this.scenarioStage >= 1) return 'DEGRADED';
    return 'HEALTHY';
  }

  // Trigger a named Chaos Scenario
  triggerScenario(scenarioName) {
    const validScenarios = [
      'TRAFFIC_SPIKE',
      'DATABASE_DEGRADATION',
      'DATABASE_CONNECTION_EXHAUSTION',
      'PAYMENT_DEPENDENCY_FAILURE',
      'MEMORY_LEAK',
      'DEPLOYMENT_REGRESSION',
      'CONTAINER_FAILURE',
      'HIGH_ERROR_RATE'
    ];

    if (!validScenarios.includes(scenarioName)) {
      throw new Error(`Invalid scenario: ${scenarioName}`);
    }

    this.activeScenario = scenarioName;
    this.scenarioStage = 1; // Start at Stage 1 (Early Degradation)
    this.scenarioStartTime = new Date().toISOString();
    this.hiddenGroundTruth = scenarioName;
    this.revealed = false;
    this.tickCount = 0;

    this.addLog('WARN', 'chaos-controller', `TRIGGERED Chaos Scenario: '${scenarioName}'`);
    this.addEvent('ChaosTriggered', `Chaos scenario ${scenarioName} injected into production environment`, 'chaos-control');

    this.tick();
    return this.getFullState();
  }

  // Start Blind Incident Test mode
  startBlindTest() {
    const validScenarios = [
      'TRAFFIC_SPIKE',
      'DATABASE_DEGRADATION',
      'DATABASE_CONNECTION_EXHAUSTION',
      'PAYMENT_DEPENDENCY_FAILURE',
      'MEMORY_LEAK',
      'DEPLOYMENT_REGRESSION',
      'CONTAINER_FAILURE',
      'HIGH_ERROR_RATE'
    ];
    const randomIndex = Math.floor(Math.random() * validScenarios.length);
    const chosenScenario = validScenarios[randomIndex];

    this.blindMode = true;
    this.revealed = false;
    this.triggerScenario(chosenScenario);
    return this.getFullState();
  }

  revealGroundTruth() {
    this.revealed = true;
    return {
      groundTruth: this.hiddenGroundTruth,
      scenario: this.activeScenario,
      startedAt: this.scenarioStartTime,
      stage: this.scenarioStage
    };
  }

  resetEnvironment() {
    this.resetState();
    this.addLog('INFO', 'chaos-controller', 'ENVIRONMENT RESET: All 7 services returned to healthy baselines');
    this.addEvent('EnvironmentReset', 'Manual operator override reset environment to baseline health', 'chaos-control');
    this.tick();
    return this.getFullState();
  }

  getFullState() {
    return {
      environment: 'PRODUCTION',
      region: 'us-east-1',
      systemStatus: this.getOverallStatus(),
      activeScenario: this.blindMode && !this.revealed ? 'BLIND_INCIDENT_ACTIVE' : this.activeScenario,
      hiddenGroundTruth: this.revealed ? this.hiddenGroundTruth : null,
      blindMode: this.blindMode,
      revealed: this.revealed,
      scenarioStage: this.scenarioStage,
      scenarioStartTime: this.scenarioStartTime,
      metrics: this.currentMetrics,
      baselines: this.baselines,
      services: this.services,
      sentinelStatus: this.sentinelStatus,
      recentLogs: this.logsHistory.slice(0, 15),
      recentEvents: this.eventsHistory.slice(0, 10),
      statsHistory: this.statsHistory
    };
  }
}

// Singleton instance
const engine = new SimulatorEngine();
module.exports = engine;
