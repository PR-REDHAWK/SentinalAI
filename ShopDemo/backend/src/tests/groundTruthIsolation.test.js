const assert = require('assert');
const engine = require('../services/simulatorEngine');
const { formatTelemetryForSentinel } = require('../services/telemetryAdapter');

function testGroundTruthIsolation() {
  console.log('🧪 Running Test: Ground Truth Isolation Contract Verification');

  const scenarios = [
    'TRAFFIC_SPIKE',
    'DATABASE_DEGRADATION',
    'DATABASE_CONNECTION_EXHAUSTION',
    'PAYMENT_DEPENDENCY_FAILURE',
    'MEMORY_LEAK',
    'DEPLOYMENT_REGRESSION',
    'CONTAINER_FAILURE',
    'HIGH_ERROR_RATE'
  ];

  for (const scenario of scenarios) {
    engine.triggerScenario(scenario);
    // Advance 3 ticks to enter severe failure stage
    engine.tick();
    engine.tick();
    engine.tick();

    const fullState = engine.getFullState();
    const formatted = formatTelemetryForSentinel(fullState);
    const jsonStr = JSON.stringify(formatted).toLowerCase();

    // Verify scenario name and ground truth string do NOT exist anywhere in payload
    assert.strictEqual(jsonStr.includes(scenario.toLowerCase()), false, `Ground truth scenario '${scenario}' leaked into telemetry payload!`);
    assert.strictEqual(jsonStr.includes('groundtruth'), false, `Field 'groundTruth' leaked into telemetry payload!`);
    assert.strictEqual(jsonStr.includes('activescenario'), false, `Field 'activeScenario' leaked into telemetry payload!`);

    console.log(`  ✓ Ground truth isolation verified for scenario: ${scenario}`);
  }

  engine.resetEnvironment();
  console.log('  ✅ Ground Truth Isolation test passed successfully!\n');
}

module.exports = testGroundTruthIsolation;
