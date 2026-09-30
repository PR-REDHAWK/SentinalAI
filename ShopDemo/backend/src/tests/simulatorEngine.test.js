const assert = require('assert');
const engine = require('../services/simulatorEngine');

function testSimulatorEngine() {
  console.log('🧪 Running Test: Simulator Engine & Chaos Scenarios');

  // Test 1: Baseline health
  engine.resetEnvironment();
  let state = engine.getFullState();
  assert.strictEqual(state.systemStatus, 'HEALTHY');
  assert.strictEqual(state.activeScenario, null);
  assert.strictEqual(state.metrics.errorRate <= 1, true);
  console.log('  ✓ Baseline health verified');

  // Test 2: Traffic Spike progression
  engine.triggerScenario('TRAFFIC_SPIKE');
  engine.tick();
  engine.tick();
  state = engine.getFullState();
  assert.strictEqual(state.activeScenario, 'TRAFFIC_SPIKE');
  assert.strictEqual(state.metrics.traffic > 250, true);
  console.log('  ✓ Traffic Spike progression verified');

  // Test 3: Payment Dependency Failure
  engine.triggerScenario('PAYMENT_DEPENDENCY_FAILURE');
  engine.tick();
  engine.tick();
  engine.tick();
  state = engine.getFullState();
  assert.strictEqual(state.metrics.paymentLatency > 400, true);
  // CPU should remain relatively normal
  assert.strictEqual(state.metrics.cpu < 65, true);
  console.log('  ✓ Payment Dependency Failure symptom isolation verified');

  // Test 4: Reset environment returns to baseline
  engine.resetEnvironment();
  state = engine.getFullState();
  assert.strictEqual(state.systemStatus, 'HEALTHY');
  assert.strictEqual(state.activeScenario, null);
  assert.strictEqual(state.metrics.paymentLatency <= 200, true);
  console.log('  ✓ Reset Environment returns simulation to baseline');

  console.log('  ✅ Simulator engine test passed successfully!\n');
}

module.exports = testSimulatorEngine;
